import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Fahrschueler, Pruefungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { PruefungenDialog } from '@/components/dialogs/PruefungenDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconX,
  IconClock,
  IconPlus,
  IconPencil,
  IconTrophy,
  IconUserCheck,
  IconAlertTriangle,
  IconRefresh,
  IconUsers,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Schüler wählen' },
  { label: 'Prüfungen' },
  { label: 'Abschließen' },
  { label: 'Fertig' },
];

function formatDatum(datum?: string): string {
  if (!datum) return '–';
  try {
    return format(parseISO(datum), 'dd.MM.yyyy HH:mm', { locale: de });
  } catch {
    return datum;
  }
}

type CompletionResult = 'bestanden' | 'abgebrochen' | null;

export default function PruefungsabschlussPage() {
  const [searchParams] = useSearchParams();

  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 4 ? s : 1;
  })();

  const [step, setStep] = useState(initialStep);
  const [selectedSchueler, setSelectedSchueler] = useState<Fahrschueler | null>(null);
  const [completionResult, setCompletionResult] = useState<CompletionResult>(null);
  const [completing, setCompleting] = useState(false);

  // Dialog state
  const [newPruefungOpen, setNewPruefungOpen] = useState(false);
  const [editPruefung, setEditPruefung] = useState<Pruefungen | null>(null);

  const { fahrschueler, pruefungen, fahrlehrer, loading, error, fetchAll } = useDashboardData();

  // Pre-select from URL param
  useEffect(() => {
    const schuelerId = searchParams.get('schueler_id');
    if (schuelerId && fahrschueler.length > 0 && !selectedSchueler) {
      const found = fahrschueler.find(s => s.record_id === schuelerId);
      if (found) setSelectedSchueler(found);
    }
  }, [searchParams, fahrschueler, selectedSchueler]);

  // Filter students: only aktiv or pausiert
  const eligibleStudents = useMemo(
    () => fahrschueler.filter(s => {
      const key = s.fields.status?.key;
      return key === 'aktiv' || key === 'pausiert';
    }),
    [fahrschueler]
  );

  // Pruefungen for selected student
  const studentPruefungen = useMemo(() => {
    if (!selectedSchueler) return [];
    return pruefungen.filter(p => {
      const refId = extractRecordId(p.fields.schueler_ref);
      return refId === selectedSchueler.record_id;
    });
  }, [pruefungen, selectedSchueler]);

  const theoriePruefungen = useMemo(
    () => studentPruefungen.filter(p => p.fields.pruefungsart?.key === 'theorie'),
    [studentPruefungen]
  );

  const praxisPruefungen = useMemo(
    () => studentPruefungen.filter(p => p.fields.pruefungsart?.key === 'praxis'),
    [studentPruefungen]
  );

  const theorieBestanden = theoriePruefungen.some(p => p.fields.ergebnis?.key === 'bestanden');
  const praxisBestanden = praxisPruefungen.some(p => p.fields.ergebnis?.key === 'bestanden');
  const theorieFailed = !theorieBestanden && theoriePruefungen.some(p => p.fields.ergebnis?.key === 'nicht_bestanden');
  const praxisFailed = !praxisBestanden && praxisPruefungen.some(p => p.fields.ergebnis?.key === 'nicht_bestanden');
  const bothPassed = theorieBestanden && praxisBestanden;

  function getStatusForPruefung(p: Pruefungen): { key: string; label: string } {
    const e = p.fields.ergebnis;
    if (!e) return { key: 'ausstehend', label: 'Ausstehend' };
    return { key: e.key, label: e.label };
  }

  function getLehrerName(p: Pruefungen): string {
    const lehrerId = extractRecordId(p.fields.lehrer_ref);
    if (!lehrerId) return '–';
    const lehrer = fahrlehrer.find(l => l.record_id === lehrerId);
    if (!lehrer) return '–';
    return [lehrer.fields.vorname, lehrer.fields.nachname].filter(Boolean).join(' ') || '–';
  }

  async function handleComplete(result: 'bestanden' | 'abgebrochen') {
    if (!selectedSchueler) return;
    setCompleting(true);
    try {
      const updateFields: { status: string; theorie_bestanden?: boolean } = {
        status: result,
      };
      if (result === 'bestanden' && theorieBestanden) {
        updateFields.theorie_bestanden = true;
      }
      await LivingAppsService.updateFahrschuelerEntry(selectedSchueler.record_id, updateFields);
      await fetchAll();
      setCompletionResult(result);
      setStep(4);
    } finally {
      setCompleting(false);
    }
  }

  function handleReset() {
    setSelectedSchueler(null);
    setCompletionResult(null);
    setStep(1);
  }

  const ergebnisColors: Record<string, string> = {
    bestanden: 'bg-green-100 text-green-700',
    nicht_bestanden: 'bg-red-100 text-red-700',
    ausstehend: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <IntentWizardShell
      title="Prüfung abschließen"
      subtitle="Prüfungsergebnisse eintragen und Ausbildung abschließen"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Schüler wählen */}
      {step === 1 && (
        <div className="space-y-4">
          <EntitySelectStep
            items={eligibleStudents.map(s => ({
              id: s.record_id,
              title: [s.fields.vorname, s.fields.nachname].filter(Boolean).join(' ') || s.record_id,
              subtitle: s.fields.fuehrerscheinklasse?.label
                ? `Klasse ${s.fields.fuehrerscheinklasse.label}`
                : undefined,
              status: s.fields.status
                ? { key: s.fields.status.key, label: s.fields.status.label }
                : undefined,
              icon: <IconUserCheck size={20} className="text-primary" />,
            }))}
            onSelect={(id) => {
              const found = fahrschueler.find(s => s.record_id === id);
              if (found) setSelectedSchueler(found);
            }}
            searchPlaceholder="Schüler suchen..."
            emptyText="Keine aktiven Schüler gefunden."
          />

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedSchueler}
              className="gap-2"
            >
              Weiter
              <IconArrowRight size={16} stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Prüfungen verwalten */}
      {step === 2 && selectedSchueler && (
        <div className="space-y-4">
          {/* Context header */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary border overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconUserCheck size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {[selectedSchueler.fields.vorname, selectedSchueler.fields.nachname].filter(Boolean).join(' ')}
              </p>
              {selectedSchueler.fields.fuehrerscheinklasse && (
                <p className="text-xs text-muted-foreground">
                  Führerschein Klasse {selectedSchueler.fields.fuehrerscheinklasse.label}
                </p>
              )}
            </div>
            {selectedSchueler.fields.status && (
              <div className="ml-auto shrink-0">
                <StatusBadge
                  statusKey={selectedSchueler.fields.status.key}
                  label={selectedSchueler.fields.status.label}
                />
              </div>
            )}
          </div>

          {/* Theorie Prüfungen */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Theorieprüfungen</h3>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setNewPruefungOpen(true)}
              >
                <IconPlus size={14} />
                Neue Prüfung
              </Button>
            </div>

            {theoriePruefungen.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">Keine Theorieprüfungen eingetragen</p>
            ) : (
              <div className="space-y-2">
                {theoriePruefungen.map(p => {
                  const status = getStatusForPruefung(p);
                  return (
                    <div key={p.record_id} className="flex items-center gap-3 p-3 rounded-xl border bg-card overflow-hidden">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{formatDatum(p.fields.datum)}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ergebnisColors[status.key] ?? 'bg-muted text-muted-foreground'}`}>
                            {status.key === 'bestanden' && <IconCheck size={11} className="inline mr-0.5" stroke={3} />}
                            {status.key === 'nicht_bestanden' && <IconX size={11} className="inline mr-0.5" stroke={3} />}
                            {status.key === 'ausstehend' && <IconClock size={11} className="inline mr-0.5" stroke={2} />}
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">Lehrer: {getLehrerName(p)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 text-xs"
                        onClick={() => setEditPruefung(p)}
                      >
                        <IconPencil size={13} />
                        Ergebnis eintragen
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Praxis Prüfungen */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Praxisprüfungen</h3>
            </div>

            {praxisPruefungen.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">Keine Praxisprüfungen eingetragen</p>
            ) : (
              <div className="space-y-2">
                {praxisPruefungen.map(p => {
                  const status = getStatusForPruefung(p);
                  return (
                    <div key={p.record_id} className="flex items-center gap-3 p-3 rounded-xl border bg-card overflow-hidden">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{formatDatum(p.fields.datum)}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ergebnisColors[status.key] ?? 'bg-muted text-muted-foreground'}`}>
                            {status.key === 'bestanden' && <IconCheck size={11} className="inline mr-0.5" stroke={3} />}
                            {status.key === 'nicht_bestanden' && <IconX size={11} className="inline mr-0.5" stroke={3} />}
                            {status.key === 'ausstehend' && <IconClock size={11} className="inline mr-0.5" stroke={2} />}
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">Lehrer: {getLehrerName(p)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 text-xs"
                        onClick={() => setEditPruefung(p)}
                      >
                        <IconPencil size={13} />
                        Ergebnis eintragen
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live feedback panel */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Prüfungsübersicht</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {theorieBestanden ? (
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <IconCheck size={13} className="text-green-700" stroke={3} />
                    </div>
                  ) : theorieFailed ? (
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <IconX size={13} className="text-red-700" stroke={3} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                      <IconClock size={13} className="text-yellow-700" stroke={2} />
                    </div>
                  )}
                  <span className="text-sm">
                    <span className="font-medium">Theorie: </span>
                    {theorieBestanden
                      ? <span className="text-green-700 font-medium">Bestanden</span>
                      : theorieFailed
                        ? <span className="text-red-700">Nicht bestanden</span>
                        : <span className="text-muted-foreground">Ausstehend</span>
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {praxisBestanden ? (
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <IconCheck size={13} className="text-green-700" stroke={3} />
                    </div>
                  ) : praxisFailed ? (
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <IconX size={13} className="text-red-700" stroke={3} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                      <IconClock size={13} className="text-yellow-700" stroke={2} />
                    </div>
                  )}
                  <span className="text-sm">
                    <span className="font-medium">Praxis: </span>
                    {praxisBestanden
                      ? <span className="text-green-700 font-medium">Bestanden</span>
                      : praxisFailed
                        ? <span className="text-red-700">Nicht bestanden</span>
                        : <span className="text-muted-foreground">Ausstehend</span>
                    }
                  </span>
                </div>
              </div>

              {bothPassed && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
                  <IconTrophy size={16} className="text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-green-700">
                    Beide Prüfungen bestanden! Schüler kann abgeschlossen werden.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* New Pruefung dialog */}
          <PruefungenDialog
            open={newPruefungOpen}
            onClose={() => setNewPruefungOpen(false)}
            onSubmit={async (fields) => {
              await LivingAppsService.createPruefungenEntry(fields);
              await fetchAll();
            }}
            defaultValues={{
              schueler_ref: createRecordUrl(APP_IDS.FAHRSCHUELER, selectedSchueler.record_id),
            }}
            fahrschuelerList={fahrschueler}
            fahrlehrerList={fahrlehrer}
            enablePhotoScan={AI_PHOTO_SCAN['Pruefungen']}
          />

          {/* Edit Pruefung dialog */}
          <PruefungenDialog
            open={editPruefung !== null}
            onClose={() => setEditPruefung(null)}
            onSubmit={async (fields) => {
              if (!editPruefung) return;
              await LivingAppsService.updatePruefungenEntry(editPruefung.record_id, fields);
              await fetchAll();
            }}
            defaultValues={editPruefung ? {
              ...editPruefung.fields,
              schueler_ref: editPruefung.fields.schueler_ref
                ? createRecordUrl(APP_IDS.FAHRSCHUELER, extractRecordId(editPruefung.fields.schueler_ref) ?? '')
                : undefined,
              lehrer_ref: editPruefung.fields.lehrer_ref
                ? createRecordUrl(APP_IDS.FAHRLEHRER, extractRecordId(editPruefung.fields.lehrer_ref) ?? '')
                : undefined,
            } : undefined}
            fahrschuelerList={fahrschueler}
            fahrlehrerList={fahrlehrer}
            enablePhotoScan={AI_PHOTO_SCAN['Pruefungen']}
          />

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <IconArrowLeft size={16} stroke={2} />
              Zurück
            </Button>
            <Button onClick={() => setStep(3)} className="gap-2">
              Weiter
              <IconArrowRight size={16} stroke={2} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Abschließen */}
      {step === 3 && selectedSchueler && (
        <div className="space-y-4">
          {/* Summary card */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Zusammenfassung</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Schüler</p>
                  <p className="text-sm font-medium truncate">
                    {[selectedSchueler.fields.vorname, selectedSchueler.fields.nachname].filter(Boolean).join(' ')}
                  </p>
                </div>
                {selectedSchueler.fields.fuehrerscheinklasse && (
                  <div>
                    <p className="text-xs text-muted-foreground">Führerscheinklasse</p>
                    <p className="text-sm font-medium">{selectedSchueler.fields.fuehrerscheinklasse.label}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Theorieprüfung</p>
                  <p className={`text-sm font-medium ${theorieBestanden ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {theorieBestanden ? 'Bestanden' : theorieFailed ? 'Nicht bestanden' : 'Ausstehend'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Praxisprüfung</p>
                  <p className={`text-sm font-medium ${praxisBestanden ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {praxisBestanden ? 'Bestanden' : praxisFailed ? 'Nicht bestanden' : 'Ausstehend'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Theorie bestanden (Feld)</p>
                  <p className="text-sm font-medium">
                    {selectedSchueler.fields.theorie_bestanden ? 'Ja' : 'Nein'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aktueller Status</p>
                  {selectedSchueler.fields.status ? (
                    <StatusBadge
                      statusKey={selectedSchueler.fields.status.key}
                      label={selectedSchueler.fields.status.label}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">–</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Erfolgreich abschließen */}
            <button
              onClick={() => handleComplete('bestanden')}
              disabled={completing}
              className={`text-left p-5 rounded-2xl border-2 transition-colors overflow-hidden ${
                bothPassed
                  ? 'border-green-400 bg-green-50 hover:bg-green-100'
                  : 'border-border bg-card hover:bg-accent'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${bothPassed ? 'bg-green-100' : 'bg-muted'}`}>
                <IconTrophy size={20} className={bothPassed ? 'text-green-600' : 'text-muted-foreground'} />
              </div>
              <p className={`font-semibold text-sm mb-1 ${bothPassed ? 'text-green-800' : 'text-foreground'}`}>
                Ausbildung erfolgreich abschließen
              </p>
              <p className="text-xs text-muted-foreground">
                Status wird auf "Bestanden" gesetzt
                {theorieBestanden ? ' und Theorie als bestanden markiert' : ''}.
              </p>
              {bothPassed && (
                <div className="mt-3 flex items-center gap-1.5">
                  <IconCheck size={14} className="text-green-600" stroke={3} />
                  <span className="text-xs font-medium text-green-700">Alle Prüfungen bestanden</span>
                </div>
              )}
            </button>

            {/* Abbrechen */}
            <button
              onClick={() => handleComplete('abgebrochen')}
              disabled={completing}
              className="text-left p-5 rounded-2xl border-2 border-border bg-card hover:bg-destructive/5 hover:border-destructive/30 transition-colors overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                <IconAlertTriangle size={20} className="text-muted-foreground" />
              </div>
              <p className="font-semibold text-sm mb-1 text-foreground">Ausbildung abbrechen</p>
              <p className="text-xs text-muted-foreground">
                Status wird auf "Abgebrochen" gesetzt.
              </p>
            </button>
          </div>

          {completing && (
            <p className="text-sm text-center text-muted-foreground">Wird gespeichert...</p>
          )}

          {/* Back only */}
          <div className="flex justify-start pt-2">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
              <IconArrowLeft size={16} stroke={2} />
              Zurück
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Abgeschlossen */}
      {step === 4 && selectedSchueler && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
              {completionResult === 'bestanden' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <IconTrophy size={32} className="text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-green-700">Bestanden!</h2>
                    <p className="text-sm text-muted-foreground mt-1">Die Ausbildung wurde erfolgreich abgeschlossen.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <IconX size={32} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Ausbildung beendet</h2>
                    <p className="text-sm text-muted-foreground mt-1">Die Ausbildung wurde als abgebrochen markiert.</p>
                  </div>
                </>
              )}

              {/* Student details */}
              <div className="w-full max-w-xs bg-secondary rounded-xl p-4 space-y-2 text-left">
                <div>
                  <p className="text-xs text-muted-foreground">Schüler</p>
                  <p className="text-sm font-semibold truncate">
                    {[selectedSchueler.fields.vorname, selectedSchueler.fields.nachname].filter(Boolean).join(' ')}
                  </p>
                </div>
                {selectedSchueler.fields.fuehrerscheinklasse && (
                  <div>
                    <p className="text-xs text-muted-foreground">Führerscheinklasse</p>
                    <p className="text-sm font-medium">{selectedSchueler.fields.fuehrerscheinklasse.label}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Abschlussdatum</p>
                  <p className="text-sm font-medium">{format(new Date(), 'dd.MM.yyyy', { locale: de })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleReset}
              className="gap-2 flex-1"
            >
              <IconRefresh size={16} stroke={2} />
              Weiteren Schüler abschließen
            </Button>
            <a href="#/fahrschueler" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <IconUsers size={16} stroke={2} />
                Alle Schüler
              </Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
