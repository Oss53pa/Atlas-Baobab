/** Annuaire embarqué de structures (CDC §M9). Données de démonstration —
 * l'annuaire réel est maintenu par sync + contribution communautaire modérée. */

export interface Structure {
  name: string;
  kind: string;
  city: string;
  phone: string;
}

export const DIRECTORY: Structure[] = [
  { name: 'Centre Les Orchidées', kind: 'Centre spécialisé TSA', city: 'Abidjan · Cocody', phone: '+225 27 22 00 00 00' },
  { name: 'Association Ivoire Autisme', kind: 'Association de familles', city: 'Abidjan · Yopougon', phone: '+225 07 07 00 00 00' },
  { name: 'Service pédopsychiatrie CHU', kind: 'Hôpital public', city: 'Abidjan · Treichville', phone: '+225 27 21 00 00 00' },
  { name: 'Cabinet d’orthophonie La Parole', kind: 'Orthophonie', city: 'Abidjan · Marcory', phone: '+225 05 05 00 00 00' },
];
