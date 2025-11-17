import { useInfiniteQuery } from '@tanstack/react-query';
import { 
  collection, query, orderBy, where, getDocs, limit, startAfter, documentId 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const ITEMS_PER_PAGE = 20;

/**
 * Hook que gerencia a busca, paginação, filtro e CACHE do inventário.
 */
export const useInventoryQuery = ({ 
  filters, 
  isAdmin, 
  allowedUnits 
}) => {
  
  return useInfiniteQuery({
    // A "Chave do Cache". Se qualquer um desses valores mudar, 
    // o React Query entende que é uma nova busca e reseta a lista.
    queryKey: ['inventory', filters, isAdmin, allowedUnits],
    
    queryFn: async ({ pageParam = null }) => {
      const { searchTerm, type, status, unit } = filters;
      let q;
      const collectionRef = collection(db, 'assets');

      // --- MODO BUSCA ESPECÍFICA (Texto) ---
      if (searchTerm) {
        // Busca por ID (Tombamento) com prefixo
        // Nota: Buscas textuais complexas não suportam paginação simples do Firestore
        const constraints = [
          orderBy(documentId()),
          where(documentId(), '>=', searchTerm),
          where(documentId(), '<=', searchTerm + '\uf8ff'),
          limit(50)
        ];
        q = query(collectionRef, ...constraints);
      
      } else {
        // --- MODO LISTAGEM NORMAL (Com Paginação) ---
        let constraints = [orderBy('createdAt', 'desc')];

        // 1. Segurança
        if (!isAdmin) {
          if (allowedUnits.length > 0) constraints.push(where("unitId", "in", allowedUnits));
          else constraints.push(where("unitId", "==", "SEM_PERMISSAO"));
        }

        // 2. Filtros
        if (type !== "all") constraints.push(where("type", "==", type));
        if (status !== "all") constraints.push(where("status", "==", status));
        if (unit !== "all") {
           if (isAdmin || allowedUnits.includes(unit)) {
             constraints.push(where("unitId", "==", unit));
           }
        }

        // 3. Paginação
        constraints.push(limit(ITEMS_PER_PAGE));
        if (pageParam) {
          constraints.push(startAfter(pageParam));
        }

        q = query(collectionRef, ...constraints);
      }

      // Executa a busca
      const snapshot = await getDocs(q);
      const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Retorna os dados e o "cursor" para a próxima página
      return {
        data: assets,
        nextCursor: snapshot.docs.length === ITEMS_PER_PAGE ? snapshot.docs[snapshot.docs.length - 1] : undefined,
      };
    },
    
    // Define como pegar o próximo cursor
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    
    // Mantém os dados anteriores na tela enquanto carrega novos (UX Fluida)
    placeholderData: (previousData) => previousData,
  });
};