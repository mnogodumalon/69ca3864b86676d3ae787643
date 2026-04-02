import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Fahrschueler, Fahrzeuge, Pruefungen, Fahrlehrer, Fahrstunden } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [fahrschueler, setFahrschueler] = useState<Fahrschueler[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<Fahrzeuge[]>([]);
  const [pruefungen, setPruefungen] = useState<Pruefungen[]>([]);
  const [fahrlehrer, setFahrlehrer] = useState<Fahrlehrer[]>([]);
  const [fahrstunden, setFahrstunden] = useState<Fahrstunden[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [fahrschuelerData, fahrzeugeData, pruefungenData, fahrlehrerData, fahrstundenData] = await Promise.all([
        LivingAppsService.getFahrschueler(),
        LivingAppsService.getFahrzeuge(),
        LivingAppsService.getPruefungen(),
        LivingAppsService.getFahrlehrer(),
        LivingAppsService.getFahrstunden(),
      ]);
      setFahrschueler(fahrschuelerData);
      setFahrzeuge(fahrzeugeData);
      setPruefungen(pruefungenData);
      setFahrlehrer(fahrlehrerData);
      setFahrstunden(fahrstundenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [fahrschuelerData, fahrzeugeData, pruefungenData, fahrlehrerData, fahrstundenData] = await Promise.all([
          LivingAppsService.getFahrschueler(),
          LivingAppsService.getFahrzeuge(),
          LivingAppsService.getPruefungen(),
          LivingAppsService.getFahrlehrer(),
          LivingAppsService.getFahrstunden(),
        ]);
        setFahrschueler(fahrschuelerData);
        setFahrzeuge(fahrzeugeData);
        setPruefungen(pruefungenData);
        setFahrlehrer(fahrlehrerData);
        setFahrstunden(fahrstundenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const fahrschuelerMap = useMemo(() => {
    const m = new Map<string, Fahrschueler>();
    fahrschueler.forEach(r => m.set(r.record_id, r));
    return m;
  }, [fahrschueler]);

  const fahrzeugeMap = useMemo(() => {
    const m = new Map<string, Fahrzeuge>();
    fahrzeuge.forEach(r => m.set(r.record_id, r));
    return m;
  }, [fahrzeuge]);

  const fahrlehrerMap = useMemo(() => {
    const m = new Map<string, Fahrlehrer>();
    fahrlehrer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [fahrlehrer]);

  return { fahrschueler, setFahrschueler, fahrzeuge, setFahrzeuge, pruefungen, setPruefungen, fahrlehrer, setFahrlehrer, fahrstunden, setFahrstunden, loading, error, fetchAll, fahrschuelerMap, fahrzeugeMap, fahrlehrerMap };
}