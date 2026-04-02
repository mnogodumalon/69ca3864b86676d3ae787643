import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichPruefungen, enrichFahrstunden } from '@/lib/enrich';
import type { EnrichedPruefungen, EnrichedFahrstunden } from '@/types/enriched';
import type { Fahrstunden, Pruefungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FahrstundenDialog } from '@/components/dialogs/FahrstundenDialog';
import { PruefungenDialog } from '@/components/dialogs/PruefungenDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconCar, IconUsers,
  IconClipboardCheck, IconCalendar, IconClock, IconUser,
  IconChevronLeft, IconChevronRight, IconUserPlus, IconAward,
} from '@tabler/icons-react';
import { format, isToday, isTomorrow, isYesterday, parseISO, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';

const APPGROUP_ID = '69ca3864b86676d3ae787643';
const REPAIR_ENDPOINT = '/claude/build/repair';

const STATUS_COLORS: Record<string, string> = {
  geplant: 'bg-blue-500/10 text-blue-700 border-blue-200',
  durchgefuehrt: 'bg-green-500/10 text-green-700 border-green-200',
  abgesagt: 'bg-red-500/10 text-red-700 border-red-200',
  nicht_erschienen: 'bg-orange-500/10 text-orange-700 border-orange-200',
};

const TYP_COLORS: Record<string, string> = {
  uebungsfahrt: 'bg-indigo-100 text-indigo-700',
  autobahn: 'bg-purple-100 text-purple-700',
  nachtfahrt: 'bg-slate-700 text-slate-100',
  ueberlandfahrt: 'bg-teal-100 text-teal-700',
  stadtfahrt: 'bg-amber-100 text-amber-700',
};

const PRUEFUNG_ERGEBNIS_COLORS: Record<string, string> = {
  bestanden: 'bg-green-500/10 text-green-700 border-green-200',
  nicht_bestanden: 'bg-red-500/10 text-red-700 border-red-200',
  ausstehend: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
};

function formatDayLabel(date: Date): string {
  if (isToday(date)) return 'Heute';
  if (isTomorrow(date)) return 'Morgen';
  if (isYesterday(date)) return 'Gestern';
  return format(date, 'EEEE, d. MMMM', { locale: de });
}

export default function DashboardOverview() {
  const {
    fahrschueler, fahrzeuge, pruefungen, fahrlehrer, fahrstunden,
    fahrschuelerMap, fahrzeugeMap, fahrlehrerMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedPruefungen = enrichPruefungen(pruefungen, { fahrschuelerMap, fahrlehrerMap });
  const enrichedFahrstunden = enrichFahrstunden(fahrstunden, { fahrschuelerMap, fahrlehrerMap, fahrzeugeMap });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [fahrstundeDialogOpen, setFahrstundeDialogOpen] = useState(false);
  const [editFahrstunde, setEditFahrstunde] = useState<EnrichedFahrstunden | null>(null);
  const [deleteFahrstunde, setDeleteFahrstunde] = useState<EnrichedFahrstunden | null>(null);
  const [pruefungDialogOpen, setPruefungDialogOpen] = useState(false);
  const [editPruefung, setEditPruefung] = useState<EnrichedPruefungen | null>(null);
  const [deletePruefung, setDeletePruefung] = useState<EnrichedPruefungen | null>(null);
  const [activeTab, setActiveTab] = useState<'fahrstunden' | 'pruefungen'>('fahrstunden');

  const todayFahrstunden = useMemo(() => {
    return enrichedFahrstunden
      .filter(f => {
        if (!f.fields.datum) return false;
        try { return isSameDay(parseISO(f.fields.datum), selectedDate); } catch { return false; }
      })
      .sort((a, b) => (a.fields.datum ?? '').localeCompare(b.fields.datum ?? ''));
  }, [enrichedFahrstunden, selectedDate]);

  const todayPruefungen = useMemo(() => {
    return enrichedPruefungen
      .filter(p => {
        if (!p.fields.datum) return false;
        try { return isSameDay(parseISO(p.fields.datum), selectedDate); } catch { return false; }
      })
      .sort((a, b) => (a.fields.datum ?? '').localeCompare(b.fields.datum ?? ''));
  }, [enrichedPruefungen, selectedDate]);

  const stats = useMemo(() => {
    const aktiveSchueler = fahrschueler.filter(s => s.fields.status?.key === 'aktiv').length;
    const einsatzbereiteFahrzeuge = fahrzeuge.filter(f => f.fields.zustand?.key === 'einsatzbereit').length;
    const todayTotal = enrichedFahrstunden.filter(f => {
      if (!f.fields.datum) return false;
      try { return isSameDay(parseISO(f.fields.datum), new Date()); } catch { return false; }
    }).length;
    const offenePruefungen = pruefungen.filter(p => p.fields.ergebnis?.key === 'ausstehend').length;
    return { aktiveSchueler, einsatzbereiteFahrzeuge, todayTotal, offenePruefungen };
  }, [fahrschueler, fahrzeuge, enrichedFahrstunden, pruefungen]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleSaveFahrstunde = async (fields: Fahrstunden['fields']) => {
    if (editFahrstunde) {
      await LivingAppsService.updateFahrstundenEntry(editFahrstunde.record_id, fields);
    } else {
      await LivingAppsService.createFahrstundenEntry(fields);
    }
    fetchAll();
    setEditFahrstunde(null);
    setFahrstundeDialogOpen(false);
  };

  const handleDeleteFahrstunde = async () => {
    if (!deleteFahrstunde) return;
    await LivingAppsService.deleteFahrstundenEntry(deleteFahrstunde.record_id);
    fetchAll();
    setDeleteFahrstunde(null);
  };

  const handleSavePruefung = async (fields: Pruefungen['fields']) => {
    if (editPruefung) {
      await LivingAppsService.updatePruefungenEntry(editPruefung.record_id, fields);
    } else {
      await LivingAppsService.createPruefungenEntry(fields);
    }
    fetchAll();
    setEditPruefung(null);
    setPruefungDialogOpen(false);
  };

  const handleDeletePruefung = async () => {
    if (!deletePruefung) return;
    await LivingAppsService.deletePruefungenEntry(deletePruefung.record_id);
    fetchAll();
    setDeletePruefung(null);
  };

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const defaultFahrstundeValues = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd') + 'T08:00';
    return { datum: dateStr };
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Workflow-Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="#/intents/schueler-onboarding"
          className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <IconUserPlus size={20} className="text-primary" stroke={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Schüler einschreiben</div>
            <div className="text-xs text-muted-foreground mt-0.5">Neuen Fahrschüler anlegen, Fahrstunden planen und Prüfungen vorbuchen</div>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
        </a>
        <a
          href="#/intents/pruefungsabschluss"
          className="flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <IconAward size={20} className="text-primary" stroke={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Prüfung abschließen</div>
            <div className="text-xs text-muted-foreground mt-0.5">Prüfungsergebnisse eintragen und Ausbildung erfolgreich beenden</div>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
        </a>
      </div>

      {/* KPI Leiste */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Aktive Schüler"
          value={String(stats.aktiveSchueler)}
          description="Aktuell in Ausbildung"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Heute"
          value={String(stats.todayTotal)}
          description="Fahrstunden heute"
          icon={<IconCar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Fahrzeuge"
          value={String(stats.einsatzbereiteFahrzeuge)}
          description="Einsatzbereit"
          icon={<IconCar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Prüfungen"
          value={String(stats.offenePruefungen)}
          description="Ausstehend"
          icon={<IconClipboardCheck size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Tagesplan Hero */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {/* Datumsnavigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <button
            onClick={prevDay}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <IconChevronLeft size={18} className="shrink-0" />
          </button>
          <div className="flex items-center gap-2">
            <IconCalendar size={16} className="text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm">
              {formatDayLabel(selectedDate)}
            </span>
            {!isToday(selectedDate) && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-xs text-primary underline underline-offset-2 hover:no-underline ml-1"
              >
                Heute
              </button>
            )}
          </div>
          <button
            onClick={nextDay}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <IconChevronRight size={18} className="shrink-0" />
          </button>
        </div>

        {/* Tab-Leiste */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('fahrstunden')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'fahrstunden'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <IconCar size={15} className="shrink-0" />
            Fahrstunden
            <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground">
              {todayFahrstunden.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pruefungen')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'pruefungen'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <IconClipboardCheck size={15} className="shrink-0" />
            Prüfungen
            <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground">
              {todayPruefungen.length}
            </span>
          </button>
        </div>

        {/* Inhalt */}
        <div className="p-4">
          {activeTab === 'fahrstunden' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {todayFahrstunden.length === 0
                    ? 'Keine Fahrstunden geplant'
                    : `${todayFahrstunden.length} Fahrstunde${todayFahrstunden.length !== 1 ? 'n' : ''}`}
                </span>
                <Button
                  size="sm"
                  onClick={() => { setEditFahrstunde(null); setFahrstundeDialogOpen(true); }}
                >
                  <IconPlus size={14} className="shrink-0 mr-1" />
                  Neue Fahrstunde
                </Button>
              </div>

              {todayFahrstunden.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <IconCar size={48} stroke={1.5} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Keine Fahrstunden für diesen Tag</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditFahrstunde(null); setFahrstundeDialogOpen(true); }}
                  >
                    <IconPlus size={14} className="shrink-0 mr-1" />
                    Fahrstunde anlegen
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayFahrstunden.map(fs => (
                    <FahrstundeCard
                      key={fs.record_id}
                      fahrstunde={fs}
                      onEdit={() => { setEditFahrstunde(fs); setFahrstundeDialogOpen(true); }}
                      onDelete={() => setDeleteFahrstunde(fs)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'pruefungen' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {todayPruefungen.length === 0
                    ? 'Keine Prüfungen geplant'
                    : `${todayPruefungen.length} Prüfung${todayPruefungen.length !== 1 ? 'en' : ''}`}
                </span>
                <Button
                  size="sm"
                  onClick={() => { setEditPruefung(null); setPruefungDialogOpen(true); }}
                >
                  <IconPlus size={14} className="shrink-0 mr-1" />
                  Neue Prüfung
                </Button>
              </div>

              {todayPruefungen.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <IconClipboardCheck size={48} stroke={1.5} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Keine Prüfungen für diesen Tag</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditPruefung(null); setPruefungDialogOpen(true); }}
                  >
                    <IconPlus size={14} className="shrink-0 mr-1" />
                    Prüfung anlegen
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayPruefungen.map(p => (
                    <PruefungCard
                      key={p.record_id}
                      pruefung={p}
                      onEdit={() => { setEditPruefung(p); setPruefungDialogOpen(true); }}
                      onDelete={() => setDeletePruefung(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Schüler-Übersicht */}
      <SchuelerUebersicht fahrschueler={fahrschueler} />

      {/* Dialoge */}
      <FahrstundenDialog
        open={fahrstundeDialogOpen}
        onClose={() => { setFahrstundeDialogOpen(false); setEditFahrstunde(null); }}
        onSubmit={handleSaveFahrstunde}
        defaultValues={editFahrstunde
          ? {
              ...editFahrstunde.fields,
              schueler_ref: editFahrstunde.fields.schueler_ref
                ? createRecordUrl(APP_IDS.FAHRSCHUELER, editFahrstunde.fields.schueler_ref.replace(/.*\//, ''))
                : undefined,
              lehrer_ref: editFahrstunde.fields.lehrer_ref
                ? createRecordUrl(APP_IDS.FAHRLEHRER, editFahrstunde.fields.lehrer_ref.replace(/.*\//, ''))
                : undefined,
              fahrzeug_ref: editFahrstunde.fields.fahrzeug_ref
                ? createRecordUrl(APP_IDS.FAHRZEUGE, editFahrstunde.fields.fahrzeug_ref.replace(/.*\//, ''))
                : undefined,
            }
          : defaultFahrstundeValues}
        fahrschuelerList={fahrschueler}
        fahrlehrerList={fahrlehrer}
        fahrzeugeList={fahrzeuge}
        enablePhotoScan={AI_PHOTO_SCAN['Fahrstunden']}
      />

      <PruefungenDialog
        open={pruefungDialogOpen}
        onClose={() => { setPruefungDialogOpen(false); setEditPruefung(null); }}
        onSubmit={handleSavePruefung}
        defaultValues={editPruefung
          ? {
              ...editPruefung.fields,
              schueler_ref: editPruefung.fields.schueler_ref
                ? createRecordUrl(APP_IDS.FAHRSCHUELER, editPruefung.fields.schueler_ref.replace(/.*\//, ''))
                : undefined,
              lehrer_ref: editPruefung.fields.lehrer_ref
                ? createRecordUrl(APP_IDS.FAHRLEHRER, editPruefung.fields.lehrer_ref.replace(/.*\//, ''))
                : undefined,
            }
          : { datum: format(selectedDate, 'yyyy-MM-dd') + 'T09:00' }}
        fahrschuelerList={fahrschueler}
        fahrlehrerList={fahrlehrer}
        enablePhotoScan={AI_PHOTO_SCAN['Pruefungen']}
      />

      <ConfirmDialog
        open={!!deleteFahrstunde}
        title="Fahrstunde löschen"
        description="Diese Fahrstunde wirklich löschen?"
        onConfirm={handleDeleteFahrstunde}
        onClose={() => setDeleteFahrstunde(null)}
      />

      <ConfirmDialog
        open={!!deletePruefung}
        title="Prüfung löschen"
        description="Diese Prüfung wirklich löschen?"
        onConfirm={handleDeletePruefung}
        onClose={() => setDeletePruefung(null)}
      />
    </div>
  );
}

function FahrstundeCard({
  fahrstunde,
  onEdit,
  onDelete,
}: {
  fahrstunde: EnrichedFahrstunden;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusKey = fahrstunde.fields.status?.key ?? '';
  const typKey = fahrstunde.fields.fahrstunden_typ?.key ?? '';
  const timeStr = fahrstunde.fields.datum
    ? format(parseISO(fahrstunde.fields.datum), 'HH:mm')
    : '–';

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-background p-3 hover:bg-accent/30 transition-colors">
      <div className="flex flex-col items-center min-w-[44px]">
        <span className="text-base font-bold tabular-nums leading-none">{timeStr}</span>
        {fahrstunde.fields.dauer_minuten && (
          <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
            <IconClock size={10} className="shrink-0" />
            {fahrstunde.fields.dauer_minuten}m
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-sm truncate">
            {(fahrstunde as any).schuelerName ?? '–'}
          </span>
          {typKey && (
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${TYP_COLORS[typKey] ?? 'bg-muted text-muted-foreground'}`}>
              {fahrstunde.fields.fahrstunden_typ?.label}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {(fahrstunde as any).lehrerName && (
            <span className="flex items-center gap-1">
              <IconUser size={11} className="shrink-0" />
              {(fahrstunde as any).lehrerName}
            </span>
          )}
          {(fahrstunde as any).fahrzeugName && (
            <span className="flex items-center gap-1">
              <IconCar size={11} className="shrink-0" />
              {(fahrstunde as any).fahrzeugName}
            </span>
          )}
        </div>
        {fahrstunde.fields.notizen && (
          <p className="text-xs text-muted-foreground line-clamp-1">{fahrstunde.fields.notizen}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {statusKey && (
          <span className={`hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[statusKey] ?? 'bg-muted'}`}>
            {fahrstunde.fields.status?.label}
          </span>
        )}
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <IconPencil size={14} className="shrink-0" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
        >
          <IconTrash size={14} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}

function PruefungCard({
  pruefung,
  onEdit,
  onDelete,
}: {
  pruefung: EnrichedPruefungen;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ergebnisKey = pruefung.fields.ergebnis?.key ?? 'ausstehend';
  const timeStr = pruefung.fields.datum
    ? format(parseISO(pruefung.fields.datum), 'HH:mm')
    : '–';

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-background p-3 hover:bg-accent/30 transition-colors">
      <div className="flex flex-col items-center min-w-[44px]">
        <span className="text-base font-bold tabular-nums leading-none">{timeStr}</span>
        <span className="text-[11px] text-muted-foreground mt-0.5">
          {pruefung.fields.pruefungsart?.label ?? '–'}
        </span>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-sm truncate">
            {(pruefung as any).schuelerName ?? '–'}
          </span>
        </div>
        {(pruefung as any).lehrerName && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconUser size={11} className="shrink-0" />
            {(pruefung as any).lehrerName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span className={`hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full border font-medium ${PRUEFUNG_ERGEBNIS_COLORS[ergebnisKey] ?? 'bg-muted'}`}>
          {pruefung.fields.ergebnis?.label ?? 'Ausstehend'}
        </span>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <IconPencil size={14} className="shrink-0" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
        >
          <IconTrash size={14} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}

function SchuelerUebersicht({ fahrschueler }: { fahrschueler: import('@/types/app').Fahrschueler[] }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('alle');

  const filtered = useMemo(() => {
    return fahrschueler.filter(s => {
      const name = `${s.fields.vorname ?? ''} ${s.fields.nachname ?? ''}`.toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase());
      const matchStatus = filterStatus === 'alle' || s.fields.status?.key === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [fahrschueler, search, filterStatus]);

  const statusOptions = ['alle', 'aktiv', 'pausiert', 'bestanden', 'abgebrochen'];

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconUsers size={16} className="text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm">Fahrschüler</span>
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} von {fahrschueler.length}</span>
      </div>

      <div className="p-3 border-b flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[120px] text-sm px-3 py-1.5 rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex flex-wrap gap-1">
          {statusOptions.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'alle' ? 'Alle' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <IconUsers size={36} stroke={1.5} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Keine Schüler gefunden</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20 text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Klasse</th>
                <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">Theorie</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.record_id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-medium truncate max-w-[160px]">
                      {s.fields.vorname} {s.fields.nachname}
                    </div>
                    {s.fields.email && (
                      <div className="text-xs text-muted-foreground truncate max-w-[160px]">{s.fields.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                      {s.fields.fuehrerscheinklasse?.label ?? '–'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    {s.fields.theorie_bestanden ? (
                      <span className="inline-flex items-center gap-1 text-green-700 text-xs">
                        <IconCheck size={12} className="shrink-0" /> Ja
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Nein</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge statusKey={s.fields.status?.key ?? ''} label={s.fields.status?.label ?? '–'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ statusKey, label }: { statusKey: string; label: string }) {
  const colors: Record<string, string> = {
    aktiv: 'bg-green-500/10 text-green-700',
    pausiert: 'bg-yellow-500/10 text-yellow-700',
    bestanden: 'bg-blue-500/10 text-blue-700',
    abgebrochen: 'bg-red-500/10 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[statusKey] ?? 'bg-muted text-muted-foreground'}`}>
      {label}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
