import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '/src/lib/firebase.js';
import { sortOptions } from '../utils/sortOptions';

export const useOptions = (optionKeys = []) => {
  const [snapshot, loading, error] = useCollection(
    collection(db, 'systemOptions')
  );

  const optionsMap = useMemo(() => {
    if (!snapshot) return {};

    const map = {};
    snapshot.docs.forEach(doc => {
      map[doc.id] = doc.data().values || [];
    });
    return map;
  }, [snapshot]);

  const result = useMemo(() => {
    const returnValue = {};

    optionKeys.forEach(key => {
      if (optionsMap[key] && optionsMap[key].length > 0) {
        returnValue[key] = sortOptions(optionsMap[key]);
      } else {
        returnValue[key] = [];
      }
    });

    return returnValue;
  }, [optionKeys, optionsMap]);

  return { options: result, loading, error, isEmpty: !loading && !error && Object.keys(optionsMap).length === 0 };
};

export const useAllOptions = () => {
  const [snapshot, loading, error] = useCollection(collection(db, 'systemOptions'));

  const optionsMap = useMemo(() => {
    if (!snapshot) return {};

    const map = {};
    snapshot.docs.forEach(doc => {
      map[doc.id] = doc.data().values || [];
    });
    return map;
  }, [snapshot]);

  return { options: optionsMap, loading, error };
};
