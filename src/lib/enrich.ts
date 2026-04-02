import type { EnrichedFahrstunden, EnrichedPruefungen } from '@/types/enriched';
import type { Fahrlehrer, Fahrschueler, Fahrstunden, Fahrzeuge, Pruefungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface PruefungenMaps {
  fahrschuelerMap: Map<string, Fahrschueler>;
  fahrlehrerMap: Map<string, Fahrlehrer>;
}

export function enrichPruefungen(
  pruefungen: Pruefungen[],
  maps: PruefungenMaps
): EnrichedPruefungen[] {
  return pruefungen.map(r => ({
    ...r,
    schueler_refName: resolveDisplay(r.fields.schueler_ref, maps.fahrschuelerMap, 'vorname', 'nachname'),
    lehrer_refName: resolveDisplay(r.fields.lehrer_ref, maps.fahrlehrerMap, 'vorname', 'nachname'),
  }));
}

interface FahrstundenMaps {
  fahrschuelerMap: Map<string, Fahrschueler>;
  fahrlehrerMap: Map<string, Fahrlehrer>;
  fahrzeugeMap: Map<string, Fahrzeuge>;
}

export function enrichFahrstunden(
  fahrstunden: Fahrstunden[],
  maps: FahrstundenMaps
): EnrichedFahrstunden[] {
  return fahrstunden.map(r => ({
    ...r,
    schueler_refName: resolveDisplay(r.fields.schueler_ref, maps.fahrschuelerMap, 'vorname', 'nachname'),
    lehrer_refName: resolveDisplay(r.fields.lehrer_ref, maps.fahrlehrerMap, 'vorname', 'nachname'),
    fahrzeug_refName: resolveDisplay(r.fields.fahrzeug_ref, maps.fahrzeugeMap, 'kennzeichen'),
  }));
}
