import type { Fahrstunden, Pruefungen } from './app';

export type EnrichedPruefungen = Pruefungen & {
  schueler_refName: string;
  lehrer_refName: string;
};

export type EnrichedFahrstunden = Fahrstunden & {
  schueler_refName: string;
  lehrer_refName: string;
  fahrzeug_refName: string;
};
