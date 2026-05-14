import { useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, where, documentId } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUnitsQuery as buildUnitsQuery } from '../utils/queryHelpers';

export const useUnits = (allowedUnits = [], isAdmin = false) => {
  const unitsQuery = useMemo(() => {
    return buildUnitsQuery(allowedUnits, isAdmin);
  }, [isAdmin, allowedUnits]);

  const [snapshot, loading, error] = useCollection(unitsQuery);

  const unitsSnapshot = useMemo(() => {
    if (!snapshot || !allowedUnits || allowedUnits.length === 0) return snapshot;
    const allowedSet = new Set(allowedUnits);
    const filtered = snapshot.docs.filter(doc => allowedSet.has(doc.id));
    return { ...snapshot, docs: filtered, size: filtered.length };
  }, [snapshot, allowedUnits]);

  const getUnitName = (unitId) => {
    if (!unitId || !unitsSnapshot) return unitId;
    const unitDoc = unitsSnapshot.docs.find(d => d.id === unitId);
    if (unitDoc) {
      return unitDoc.data().sigla || unitDoc.data().name || unitId;
    }
    return unitId;
  };

  const units = useMemo(() => {
    if (!unitsSnapshot) return [];
    return unitsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      displayName: doc.data().sigla || doc.data().name
    }));
  }, [unitsSnapshot]);

  const getUnitsAsOptions = () => {
    if (!unitsSnapshot) return [];
    return unitsSnapshot.docs.map(doc => ({
      value: doc.id,
      label: doc.data().sigla || doc.data().name
    }));
  };

  return { units, loading, error, getUnitName, getUnitsAsOptions };
};

export const useSystemOptionsKeys = () => {
  return ['setores', 'pavimentos', 'salas', 'sistemas_operacionais'];
};

export const useRoles = () => {
  const rolesQuery = useMemo(() => {
    return query(collection(db, 'roles'), orderBy('name', 'asc'));
  }, []);

  const [rolesSnapshot, loading, error] = useCollection(rolesQuery);

  const roles = useMemo(() => {
    if (!rolesSnapshot) return [];
    return rolesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }, [rolesSnapshot]);

  return { roles, loading, error };
};

export const useUsers = () => {
  const usersQuery = useMemo(() => {
    return query(collection(db, 'users'), orderBy('displayName', 'asc'));
  }, []);

  const [usersSnapshot, loading, error] = useCollection(usersQuery);

  const users = useMemo(() => {
    if (!usersSnapshot) return [];
    return usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }, [usersSnapshot]);

  return { users, loading, error };
};

export default useUnits;