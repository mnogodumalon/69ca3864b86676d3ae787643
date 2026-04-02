// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Fahrschueler {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    fuehrerscheinklasse?: LookupValue;
    status?: LookupValue;
    theorie_bestanden?: boolean;
  };
}

export interface Fahrzeuge {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kennzeichen?: string;
    marke_modell?: string;
    fahrzeugtyp?: LookupValue;
    fuehrerscheinklasse?: LookupValue;
    zustand?: LookupValue;
  };
}

export interface Pruefungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    schueler_ref?: string; // applookup -> URL zu 'Fahrschueler' Record
    lehrer_ref?: string; // applookup -> URL zu 'Fahrlehrer' Record
    pruefungsart?: LookupValue;
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    ergebnis?: LookupValue;
  };
}

export interface Fahrlehrer {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    telefon?: string;
    lizenzen?: LookupValue[];
    verfuegbarkeit?: LookupValue;
  };
}

export interface Fahrstunden {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    schueler_ref?: string; // applookup -> URL zu 'Fahrschueler' Record
    lehrer_ref?: string; // applookup -> URL zu 'Fahrlehrer' Record
    fahrzeug_ref?: string; // applookup -> URL zu 'Fahrzeuge' Record
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    dauer_minuten?: number;
    fahrstunden_typ?: LookupValue;
    status?: LookupValue;
    notizen?: string;
  };
}

export const APP_IDS = {
  FAHRSCHUELER: '69ca3843ded5938eab2327f3',
  FAHRZEUGE: '69ca38442d14580b19bbb885',
  PRUEFUNGEN: '69ca3845da08db8b979a68c8',
  FAHRLEHRER: '69ca383e14f24285902ff59a',
  FAHRSTUNDEN: '69ca38443e4e86a47529a3e4',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'fahrschueler': {
    fuehrerscheinklasse: [{ key: "b", label: "B" }, { key: "a", label: "A" }, { key: "a2", label: "A2" }, { key: "be", label: "BE" }, { key: "am", label: "AM" }],
    status: [{ key: "aktiv", label: "Aktiv" }, { key: "pausiert", label: "Pausiert" }, { key: "bestanden", label: "Bestanden" }, { key: "abgebrochen", label: "Abgebrochen" }],
  },
  'fahrzeuge': {
    fahrzeugtyp: [{ key: "pkw", label: "PKW" }, { key: "motorrad", label: "Motorrad" }, { key: "lkw", label: "LKW" }, { key: "anhaenger", label: "Anhänger" }],
    fuehrerscheinklasse: [{ key: "b", label: "B" }, { key: "a", label: "A" }, { key: "a2", label: "A2" }, { key: "be", label: "BE" }, { key: "am", label: "AM" }],
    zustand: [{ key: "einsatzbereit", label: "Einsatzbereit" }, { key: "in_werkstatt", label: "In Werkstatt" }, { key: "ausgemustert", label: "Ausgemustert" }],
  },
  'pruefungen': {
    pruefungsart: [{ key: "theorie", label: "Theorie" }, { key: "praxis", label: "Praxis" }],
    ergebnis: [{ key: "bestanden", label: "Bestanden" }, { key: "nicht_bestanden", label: "Nicht bestanden" }, { key: "ausstehend", label: "Ausstehend" }],
  },
  'fahrlehrer': {
    lizenzen: [{ key: "b", label: "B" }, { key: "a", label: "A" }, { key: "a2", label: "A2" }, { key: "be", label: "BE" }, { key: "am", label: "AM" }],
    verfuegbarkeit: [{ key: "vollzeit", label: "Vollzeit" }, { key: "teilzeit", label: "Teilzeit" }, { key: "vertretung", label: "Vertretung" }],
  },
  'fahrstunden': {
    fahrstunden_typ: [{ key: "uebungsfahrt", label: "Übungsfahrt" }, { key: "autobahn", label: "Autobahnfahrt" }, { key: "nachtfahrt", label: "Nachtfahrt" }, { key: "ueberlandfahrt", label: "Überlandfahrt" }, { key: "stadtfahrt", label: "Stadtfahrt" }],
    status: [{ key: "geplant", label: "Geplant" }, { key: "durchgefuehrt", label: "Durchgeführt" }, { key: "abgesagt", label: "Abgesagt" }, { key: "nicht_erschienen", label: "Nicht erschienen" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'fahrschueler': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'geburtsdatum': 'date/date',
    'fuehrerscheinklasse': 'lookup/select',
    'status': 'lookup/radio',
    'theorie_bestanden': 'bool',
  },
  'fahrzeuge': {
    'kennzeichen': 'string/text',
    'marke_modell': 'string/text',
    'fahrzeugtyp': 'lookup/select',
    'fuehrerscheinklasse': 'lookup/select',
    'zustand': 'lookup/radio',
  },
  'pruefungen': {
    'schueler_ref': 'applookup/select',
    'lehrer_ref': 'applookup/select',
    'pruefungsart': 'lookup/radio',
    'datum': 'date/datetimeminute',
    'ergebnis': 'lookup/select',
  },
  'fahrlehrer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'telefon': 'string/tel',
    'lizenzen': 'multiplelookup/checkbox',
    'verfuegbarkeit': 'lookup/select',
  },
  'fahrstunden': {
    'schueler_ref': 'applookup/select',
    'lehrer_ref': 'applookup/select',
    'fahrzeug_ref': 'applookup/select',
    'datum': 'date/datetimeminute',
    'dauer_minuten': 'number',
    'fahrstunden_typ': 'lookup/select',
    'status': 'lookup/radio',
    'notizen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateFahrschueler = StripLookup<Fahrschueler['fields']>;
export type CreateFahrzeuge = StripLookup<Fahrzeuge['fields']>;
export type CreatePruefungen = StripLookup<Pruefungen['fields']>;
export type CreateFahrlehrer = StripLookup<Fahrlehrer['fields']>;
export type CreateFahrstunden = StripLookup<Fahrstunden['fields']>;