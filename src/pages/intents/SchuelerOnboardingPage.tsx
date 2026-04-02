import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

import type { Fahrschueler, Fahrstunden, Pruefungen, Fahrlehrer, Fahrzeuge } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN } from '@/config/ai-features';

import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { FahrschuelerDialog } from '@/components/dialogs/FahrschuelerDialog';
import { FahrstundenDialog } from '@/components/dialogs/FahrstundenDialog';
import { PruefungenDialog } from '@/components/dialogs/PruefungenDialog';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  IconUserPlus,
  IconCalendarPlus,
  IconClipboardCheck,
  IconCircleCheck,
  IconArrowRight,
  IconArrowLeft,
  IconRefresh,
  IconLayoutDashboard,
  IconCar,
  IconSchool,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Schüler wählen' },
  { label: 'Fahrstunden' },
  { label: 'Prüfungen' },
  { label: 'Zusammenfassung' },
];

function formatDatum(datum: string | undefined): string {
  if (!datum) return '–';
  try {
    return format(new Date(datum), 'dd.MM.yyyy HH:mm', { locale: de });
  } catch {
    return datum;
  }
}

export default function SchuelerOnboardingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // --- Step state (deep-link aware) ---
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 4 ? s : 1;
  })();
  const [currentStep, setCurrentStep] = useState(initialStep);

  // --- Data ---
  const [fahrschueler, setFahrschueler] = useState<Fahrschueler[]>([]);
  const [fahrstunden, setFahrstunden] = useState<Fahrstunden[]>([]);
  const [pruefungen, setPruefungen] = useState<Pruefungen[]>([]);
  const [fahrlehrer, setFahrlehrer] = useState<Fahrlehrer[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeuge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // --- Selections ---
  const initialSchueler = searchParams.get('schueler_id') ?? null;
  const [selectedSchueler, setSelectedSchueler] = useState<Fahrschueler | null>(null);

  // --- Dialog state ---
  const [schuelerDialogOpen, setSchuelerDialogOpen] = useState(false);
  const [fahrstundenDialogOpen, setFahrstundenDialogOpen] = useState(false);
  const [pruefungTheorieDialogOpen, setPruefungTheorieDialogOpen] = useState(false);
  const [pruefungPraxisDialogOpen, setPruefungPraxisDialogOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [fs, fst, pr, fl, fz] = await Promise.all([
        LivingAppsService.getFahrschueler(),
        LivingAppsService.getFahrstunden(),
        LivingAppsService.getPruefungen(),
        LivingAppsService.getFahrlehrer(),
        LivingAppsService.getFahrzeuge(),
      ]);
      setFahrschueler(fs);
      setFahrstunden(fst);
      setPruefungen(pr);
      setFahrlehrer(fl);
      setFahrzeuge(fz);

      // Restore pre-selected student from URL
      if (initialSchueler) {
        const found = fs.find(s => s.record_id === initialSchueler);
        if (found) setSelectedSchueler(found);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [initialSchueler]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- Derived data ---
  const schuelerFahrstunden = fahrstunden.filter(fs => {
    if (!selectedSchueler) return false;
    const refId = extractRecordId(fs.fields.schueler_ref);
    return refId === selectedSchueler.record_id;
  });

  const schuelerPruefungen = pruefungen.filter(pr => {
    if (!selectedSchueler) return false;
    const refId = extractRecordId(pr.fields.schueler_ref);
    return refId === selectedSchueler.record_id;
  });

  const selectedSchuelerName = selectedSchueler
    ? `${selectedSchueler.fields.vorname ?? ''} ${selectedSchueler.fields.nachname ?? ''}`.trim()
    : '';

  // --- Helper to find fahrlehrer name ---
  function lehrerName(lehrerRef: string | undefined): string {
    if (!lehrerRef) return '–';
    const id = extractRecordId(lehrerRef);
    const lehrer = fahrlehrer.find(l => l.record_id === id);
    if (!lehrer) return '–';
    return `${lehrer.fields.vorname ?? ''} ${lehrer.fields.nachname ?? ''}`.trim();
  }

  // --- Step handlers ---
  function handleSelectSchueler(id: string) {
    const found = fahrschueler.find(s => s.record_id === id);
    setSelectedSchueler(found ?? null);
  }

  function handleReset() {
    setSelectedSchueler(null);
    setCurrentStep(1);
  }

  // ==================
  // RENDER
  // ==================

  return (
    <IntentWizardShell
      title="Neuen Schüler einschreiben"
      subtitle="Fahrschüler aufnehmen, Fahrstunden planen und Prüfungen vorbuchen"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ===== STEP 1: Schüler wählen ===== */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconSchool size={18} className="text-primary" stroke={2} />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">Neuen Fahrschüler in das System aufnehmen</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Wähle einen bestehenden Schüler aus oder lege einen neuen an, um ihn durch den Einschreibeprozess zu führen.
              </p>
            </div>
          </div>

          <EntitySelectStep
            items={fahrschueler.map(s => ({
              id: s.record_id,
              title: `${s.fields.vorname ?? ''} ${s.fields.nachname ?? ''}`.trim() || '(Kein Name)',
              subtitle: s.fields.email,
              status: s.fields.status
                ? { key: s.fields.status.key, label: s.fields.status.label }
                : undefined,
              stats: s.fields.fuehrerscheinklasse
                ? [{ label: 'Klasse', value: s.fields.fuehrerscheinklasse.label }]
                : undefined,
            }))}
            onSelect={handleSelectSchueler}
            searchPlaceholder="Schüler suchen..."
            emptyText="Noch keine Fahrschüler vorhanden."
            emptyIcon={<IconUserPlus size={32} />}
            createLabel="Neuen Fahrschüler anlegen"
            onCreateNew={() => setSchuelerDialogOpen(true)}
            createDialog={
              <FahrschuelerDialog
                open={schuelerDialogOpen}
                onClose={() => setSchuelerDialogOpen(false)}
                onSubmit={async (fields) => {
                  const result = await LivingAppsService.createFahrschuelerEntry(fields);
                  await fetchAll();
                  // Auto-select newly created record
                  const entries = Object.entries(result as Record<string, unknown>);
                  if (entries.length > 0) {
                    const newId = entries[0][0];
                    const refreshed = await LivingAppsService.getFahrschueler();
                    const found = refreshed.find(s => s.record_id === newId);
                    if (found) setSelectedSchueler(found);
                  }
                  setSchuelerDialogOpen(false);
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Fahrschueler']}
              />
            }
          />

          {/* Selected indicator */}
          {selectedSchueler && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <IconCircleCheck size={16} stroke={2} />
              <span>
                <span className="font-medium">{selectedSchuelerName}</span> ausgewählt
              </span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              disabled={!selectedSchueler}
              onClick={() => setCurrentStep(2)}
              className="gap-2"
            >
              Weiter
              <IconArrowRight size={16} stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP 2: Fahrstunden planen ===== */}
      {currentStep === 2 && (
        <div className="space-y-5">
          {/* Context banner */}
          <div className="rounded-2xl bg-muted/60 border px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <IconCar size={16} className="text-muted-foreground shrink-0" stroke={2} />
              <span className="text-sm font-medium truncate">{selectedSchuelerName}</span>
            </div>
            <span className="text-sm font-semibold text-primary shrink-0">
              {schuelerFahrstunden.length} Fahrstunde{schuelerFahrstunden.length !== 1 ? 'n' : ''} geplant
            </span>
          </div>

          {/* Add button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Plane die ersten Fahrstunden für diesen Schüler.</p>
            <Button
              variant="outline"
              onClick={() => setFahrstundenDialogOpen(true)}
              className="gap-2 shrink-0"
            >
              <IconCalendarPlus size={16} stroke={2} />
              Fahrstunde hinzufügen
            </Button>
          </div>

          <FahrstundenDialog
            open={fahrstundenDialogOpen}
            onClose={() => setFahrstundenDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createFahrstundenEntry({
                ...fields,
                schueler_ref: createRecordUrl(APP_IDS.FAHRSCHUELER, selectedSchueler!.record_id),
              });
              await fetchAll();
              setFahrstundenDialogOpen(false);
            }}
            defaultValues={{
              schueler_ref: createRecordUrl(APP_IDS.FAHRSCHUELER, selectedSchueler?.record_id ?? ''),
            }}
            fahrschuelerList={fahrschueler}
            fahrlehrerList={fahrlehrer}
            fahrzeugeList={fahrzeuge}
            enablePhotoScan={AI_PHOTO_SCAN['Fahrstunden']}
          />

          {/* Fahrstunden list */}
          {schuelerFahrstunden.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-2xl">
              <IconCar size={32} className="mx-auto mb-2 opacity-30" stroke={1.5} />
              <p className="text-sm">Noch keine Fahrstunden geplant.</p>
              <p className="text-xs mt-1">Du kannst jetzt Fahrstunden hinzufügen oder diesen Schritt überspringen.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {schuelerFahrstunden.map(fs => (
                <Card key={fs.record_id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <IconCar size={16} className="text-primary" stroke={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {fs.fields.fahrstunden_typ?.label ?? 'Fahrstunde'}
                        </span>
                        {fs.fields.status && (
                          <StatusBadge
                            statusKey={fs.fields.status.key}
                            label={fs.fields.status.label}
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDatum(fs.fields.datum)}
                        {fs.fields.lehrer_ref && (
                          <> &middot; {lehrerName(fs.fields.lehrer_ref)}</>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
              <IconArrowLeft size={16} stroke={2} />
              Zurück
            </Button>
            <Button onClick={() => setCurrentStep(3)} className="gap-2">
              Weiter
              <IconArrowRight size={16} stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP 3: Prüfungen vorbuchen ===== */}
      {currentStep === 3 && (
        <div className="space-y-5">
          {/* Context banner */}
          <div className="rounded-2xl bg-muted/60 border px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <IconClipboardCheck size={16} className="text-muted-foreground shrink-0" stroke={2} />
              <span className="text-sm font-medium truncate">{selectedSchuelerName}</span>
            </div>
            <span className="text-sm font-semibold text-primary shrink-0">
              {schuelerPruefungen.length} Prüfung{schuelerPruefungen.length !== 1 ? 'en' : ''} gebucht
            </span>
          </div>

          <p className="text-sm text-muted-foreground">Buche Theorie- oder Praxisprüfungen für diesen Schüler vor.</p>

          {/* Add buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setPruefungTheorieDialogOpen(true)}
              className="gap-2"
            >
              <IconClipboardCheck size={16} stroke={2} />
              Theorie-Prüfung hinzufügen
            </Button>
            <Button
              variant="outline"
              onClick={() => setPruefungPraxisDialogOpen(true)}
              className="gap-2"
            >
              <IconCar size={16} stroke={2} />
              Praxis-Prüfung hinzufügen
            </Button>
          </div>

          <PruefungenDialog
            open={pruefungTheorieDialogOpen}
            onClose={() => setPruefungTheorieDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createPruefungenEntry({
                ...fields,
                schueler_ref: createRecordUrl(APP_IDS.FAHRSCHUELER, selectedSchueler!.record_id),
                pruefungsart: 'theorie',
              });
              await fetchAll();
              setPruefungTheorieDialogOpen(false);
            }}
            defaultValues={{
              schueler_ref: createRecordUrl(APP_IDS.FAHRSCHUELER, selectedSchueler?.record_id ?? ''),
              pruefungsart: { key: 'theorie', label: 'Theorie' },
            }}
            fahrschuelerList={fahrschueler}
            fahrlehrerList={fahrlehrer}
            enablePhotoScan={AI_PHOTO_SCAN['Pruefungen']}
          />

          <PruefungenDialog
            open={pruefungPraxisDialogOpen}
            onClose={() => setPruefungPraxisDialogOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createPruefungenEntry({
                ...fields,
                schueler_ref: createRecordUrl(APP_IDS.FAHRSCHUELER, selectedSchueler!.record_id),
                pruefungsart: 'praxis',
              });
              await fetchAll();
              setPruefungPraxisDialogOpen(false);
            }}
            defaultValues={{
              schueler_ref: createRecordUrl(APP_IDS.FAHRSCHUELER, selectedSchueler?.record_id ?? ''),
              pruefungsart: { key: 'praxis', label: 'Praxis' },
            }}
            fahrschuelerList={fahrschueler}
            fahrlehrerList={fahrlehrer}
            enablePhotoScan={AI_PHOTO_SCAN['Pruefungen']}
          />

          {/* Prüfungen list */}
          {schuelerPruefungen.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-2xl">
              <IconClipboardCheck size={32} className="mx-auto mb-2 opacity-30" stroke={1.5} />
              <p className="text-sm">Noch keine Prüfungen gebucht.</p>
              <p className="text-xs mt-1">Du kannst Prüfungen jetzt vorbuchen oder diesen Schritt überspringen.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {schuelerPruefungen.map(pr => (
                <Card key={pr.record_id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <IconClipboardCheck size={16} className="text-primary" stroke={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {pr.fields.pruefungsart?.label ?? 'Prüfung'}
                        </span>
                        {pr.fields.ergebnis && (
                          <StatusBadge
                            statusKey={pr.fields.ergebnis.key}
                            label={pr.fields.ergebnis.label}
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDatum(pr.fields.datum)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-2">
              <IconArrowLeft size={16} stroke={2} />
              Zurück
            </Button>
            <Button onClick={() => setCurrentStep(4)} className="gap-2">
              Abschließen
              <IconCircleCheck size={16} stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP 4: Zusammenfassung ===== */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {/* Success card */}
          <div className="rounded-2xl border bg-green-50 border-green-200 p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <IconCircleCheck size={28} className="text-green-600" stroke={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-green-800">Einschreibung abgeschlossen!</h2>
              <p className="text-sm text-green-700 mt-1">
                {selectedSchuelerName} wurde erfolgreich ins System aufgenommen.
              </p>
            </div>
          </div>

          {/* Summary details */}
          <Card className="overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Zusammenfassung</h3>

              <div className="space-y-3">
                {/* Student info */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <IconUserPlus size={16} className="text-primary" stroke={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{selectedSchuelerName}</p>
                    {selectedSchueler?.fields.fuehrerscheinklasse && (
                      <p className="text-xs text-muted-foreground">
                        Führerscheinklasse: {selectedSchueler.fields.fuehrerscheinklasse.label}
                      </p>
                    )}
                    {selectedSchueler?.fields.status && (
                      <div className="mt-1">
                        <StatusBadge
                          statusKey={selectedSchueler.fields.status.key}
                          label={selectedSchueler.fields.status.label}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Fahrstunden count */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                  <div className="flex items-center gap-2">
                    <IconCar size={16} className="text-muted-foreground" stroke={2} />
                    <span className="text-sm text-muted-foreground">Geplante Fahrstunden</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{schuelerFahrstunden.length}</span>
                </div>

                {/* Prüfungen count */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                  <div className="flex items-center gap-2">
                    <IconClipboardCheck size={16} className="text-muted-foreground" stroke={2} />
                    <span className="text-sm text-muted-foreground">Gebuchte Prüfungen</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{schuelerPruefungen.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleReset}
            >
              <IconRefresh size={16} stroke={2} />
              Neuen Schüler einschreiben
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => navigate('/')}
            >
              <IconLayoutDashboard size={16} stroke={2} />
              Dashboard
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
