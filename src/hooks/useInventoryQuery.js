import { useInfiniteQuery } from '@tanstack/react-query';
import { 
  collection, query, orderBy, where, getDocs, limit, startAfter, documentId 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUnitConstraints, IN_LIMIT, chunkArray } from '../utils/queryHelpers';

const ITEMS_PER_PAGE = 100;

/**
 * Hook avançado que gerencia busca, paginação e filtros combinados no servidor.
 */
export const useInventoryQuery = ({ filters, isAdmin, allowedUnits }) => {
  
  return useInfiniteQuery({
    queryKey: ['inventory', filters, isAdmin, allowedUnits],
    
    queryFn: async ({ pageParam = null }) => {
      const { searchTerm, type, status, unit } = filters;
      const collectionRef = collection(db, 'assets');

      // --- CONSTRAINTS DE SEGURANÇA E FILTROS COMUNS ---
      // Criamos uma lista base de filtros que sempre se aplicam
      const baseConstraints = [];

      const safeConstraints = getUnitConstraints(allowedUnits, isAdmin);
      baseConstraints.push(...safeConstraints);

      // 2. Filtros Dropdown (Server-Side)
      if (type !== "all") baseConstraints.push(where("type", "==", type));
      if (status !== "all") baseConstraints.push(where("status", "==", status));
      if (unit !== "all") {
         // Validação extra de segurança
         if (isAdmin || allowedUnits.includes(unit)) {
           baseConstraints.push(where("unitId", "==", unit));
         }
      }

      // =========================================================
      // CENÁRIO A: BUSCA TEXTUAL (MODO AVANÇADO PARALELO)
      // =========================================================
      if (searchTerm) {
        const term = searchTerm.toUpperCase(); // Normalizar para busca
        // O Firestore só busca por prefixo ("COMEÇA COM")
        const endTerm = term + '\uf8ff';

        // Disparamos 3 buscas simultâneas no servidor para cobrir todos os campos
        // Nota: Isso requer índices compostos se combinado com outros filtros.
        // Para simplificar e evitar erros de índice agora, na busca textual
        // aplicamos a segurança/filtros básicos no cliente DEPOIS de buscar no servidor.
        
        const queries = [
          // 1. Busca por ID (Tombamento)
          query(collectionRef, where(documentId(), '>=', term), where(documentId(), '<=', endTerm), limit(20)),
          // 2. Busca por Serial
          query(collectionRef, where('serial', '>=', term), where('serial', '<=', endTerm), limit(20)),
          // 3. Busca por Hostname
          query(collectionRef, where('hostname', '>=', term), where('hostname', '<=', endTerm), limit(20))
        ];

        // Executa tudo ao mesmo tempo (Parallel Execution)
        const snapshots = await Promise.all(queries.map(q => getDocs(q)));

        // Junta e Dedupilica os resultados
        const combinedMap = new Map();
        snapshots.forEach(snap => {
          snap.docs.forEach(doc => {
            // AQUI aplicamos o filtro de segurança/tipo manualmente 
            // pois o Firestore não suporta OR + AND complexos facilmente
            const data = doc.data();
            
            // Verifica Filtros
            const passType = type === 'all' || data.type === type;
            const passStatus = status === 'all' || data.status === status;
            const passUnit = isAdmin || allowedUnits.includes(data.unitId);
            const passUnitFilter = unit === 'all' || data.unitId === unit;

            if (passType && passStatus && passUnit && passUnitFilter) {
               combinedMap.set(doc.id, { id: doc.id, ...data });
            }
          });
        });

        return {
          data: Array.from(combinedMap.values()),
          nextCursor: undefined, // Busca textual desativa paginação infinita por enquanto
        };
      }

      // =========================================================
      // CENÁRIO B: LISTAGEM PADRÃO (PAGINADA)
      // =========================================================

      const hasUnitFilter = allowedUnits && allowedUnits.length > 0 && allowedUnits.length <= IN_LIMIT;
      const useChunked = allowedUnits && allowedUnits.length > IN_LIMIT && !isAdmin;

      if (useChunked) {
        const chunks = chunkArray(allowedUnits);
        const pageLimit = pageParam ? [startAfter(pageParam)] : [];
        const chunkQueries = chunks.map(chunk =>
          query(collectionRef, ...baseConstraints, where("unitId", "in", chunk), orderBy('createdAt', 'desc'), limit(ITEMS_PER_PAGE), ...pageLimit)
        );
        const snapshots = await Promise.all(chunkQueries.map(q => getDocs(q)));
        const mergedMap = new Map();
        let hasMore = false;
        snapshots.forEach(snap => {
          snap.docs.forEach(doc => { if (!mergedMap.has(doc.id)) mergedMap.set(doc.id, { id: doc.id, ...doc.data() }); });
          if (snap.docs.length === ITEMS_PER_PAGE) hasMore = true;
        });
        return {
          data: Array.from(mergedMap.values()),
          nextCursor: hasMore ? snapshots.find(s => s.docs.length > 0)?.docs[snapshots.find(s => s.docs.length > 0).docs.length - 1] : undefined,
        };
      }

      const constraints = [...baseConstraints, orderBy('createdAt', 'desc')];
      constraints.push(limit(ITEMS_PER_PAGE));
      if (pageParam) {
        constraints.push(startAfter(pageParam));
      }

      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);
      const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return {
        data: assets,
        nextCursor: snapshot.docs.length === ITEMS_PER_PAGE ? snapshot.docs[snapshot.docs.length - 1] : undefined,
      };
    },
    
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: (previousData) => previousData,
  });
};