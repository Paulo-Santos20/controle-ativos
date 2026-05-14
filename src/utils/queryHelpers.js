import { where, query, orderBy, documentId, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const IN_LIMIT = 10;

export function chunkArray(arr, size = IN_LIMIT) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function getUnitConstraints(allowedUnits, isAdmin) {
  if (!allowedUnits || allowedUnits.length === 0) {
    return isAdmin ? [] : [where('unitId', '==', 'BLOQUEADO')];
  }
  if (allowedUnits.length <= IN_LIMIT) {
    return [where('unitId', 'in', allowedUnits)];
  }
  return [];
}

export function getUnitsQuery(allowedUnits, isAdmin) {
  if (!allowedUnits || allowedUnits.length === 0) {
    return isAdmin ? query(collection(db, 'units'), orderBy('name', 'asc')) : null;
  }
  if (allowedUnits.length <= IN_LIMIT) {
    return query(collection(db, 'units'), where(documentId(), 'in', allowedUnits));
  }
  return query(collection(db, 'units'), orderBy('name', 'asc'));
}

export function filterUnitsByAllowed(snapshot, allowedUnits) {
  if (!snapshot || !allowedUnits || allowedUnits.length === 0) return snapshot;
  const allowedSet = new Set(allowedUnits);
  const filtered = snapshot.docs.filter(doc => allowedSet.has(doc.id));
  return { ...snapshot, docs: filtered, size: filtered.length };
}
