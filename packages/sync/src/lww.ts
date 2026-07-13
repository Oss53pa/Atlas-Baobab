/**
 * Fusion last-write-wins PAR CHAMP, horodatée HLC (CDC §2.4 : "résolution
 * last-write-wins par champ"). Chaque champ porte son propre timestamp HLC ;
 * la fusion prend, pour chaque champ, la valeur au HLC le plus grand. Deux
 * éditions concurrentes sur des champs différents sont donc TOUTES conservées
 * (pas de perte), et une édition concurrente du même champ est tranchée de
 * façon déterministe (pas de doublon, résultat identique sur tous les appareils).
 */

import { hlcCompare, type Hlc } from './hlc.js';

export interface FieldValue<T> {
  value: T;
  hlc: Hlc;
}

/** Un enregistrement répliqué : id stable + champs versionnés indépendamment. */
export interface LwwRecord {
  id: string;
  fields: Record<string, FieldValue<unknown>>;
}

/** Pose/écrase un champ avec un timestamp HLC donné. */
export function setField<T>(record: LwwRecord, key: string, value: T, hlc: Hlc): LwwRecord {
  return {
    ...record,
    fields: { ...record.fields, [key]: { value, hlc } },
  };
}

/** Fusion de deux versions d'un même enregistrement (commutative, idempotente). */
export function mergeRecord(a: LwwRecord, b: LwwRecord): LwwRecord {
  if (a.id !== b.id) throw new Error(`mergeRecord: id mismatch ${a.id} != ${b.id}`);
  const keys = new Set([...Object.keys(a.fields), ...Object.keys(b.fields)]);
  const fields: Record<string, FieldValue<unknown>> = {};
  for (const k of keys) {
    const fa = a.fields[k];
    const fb = b.fields[k];
    if (fa && fb) fields[k] = hlcCompare(fa.hlc, fb.hlc) >= 0 ? fa : fb;
    else fields[k] = (fa ?? fb)!;
  }
  return { id: a.id, fields };
}

/** Projette un enregistrement LWW en objet plat { champ: valeur }. */
export function materialize<T extends Record<string, unknown>>(record: LwwRecord): T {
  const out: Record<string, unknown> = {};
  for (const [k, fv] of Object.entries(record.fields)) out[k] = fv.value;
  return out as T;
}

/**
 * Fusion d'un ensemble d'enregistrements (deux répliques d'une table) en une
 * map id -> enregistrement fusionné. Les évènements de type "append-only"
 * (observations, télémétrie) sont naturellement dédoublonnés par id.
 */
export function mergeCollections(
  local: LwwRecord[],
  remote: LwwRecord[],
): Map<string, LwwRecord> {
  const byId = new Map<string, LwwRecord>();
  for (const r of local) byId.set(r.id, r);
  for (const r of remote) {
    const existing = byId.get(r.id);
    byId.set(r.id, existing ? mergeRecord(existing, r) : r);
  }
  return byId;
}
