import { collection, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '/src/lib/firebase.js';

/**
 * Registra uma ação no Log de Auditoria Global.
 * Grava em 'system_logs/audit/history' para ser capturado pelo collectionGroup.
 * * @param {string} actionType - Ex: "Exclusão de Usuário", "Alteração de Configuração"
 * @param {string} details - Descrição detalhada do que aconteceu
 * @param {string} target - O alvo da ação (ex: Nome do usuário excluído, Nome da Unidade editada)
 */
export const logAudit = async (actionType, details, target = "Sistema") => {
  try {
    const user = auth.currentUser;
    const userName = user?.displayName || user?.email || "Sistema";

    // Grava em uma coleção centralizada que respeita o nome 'history'
    const auditRef = collection(db, 'system_logs', 'audit', 'history');

    await addDoc(auditRef, {
      type: actionType,
      details: details,
      target: target, // Novo campo para saber quem sofreu a ação
      user: userName,
      timestamp: serverTimestamp(),
      category: 'admin' // Marcador para diferenciar de logs de ativos
    });

    console.log(`Audit log gravado: ${actionType}`);
  } catch (error) {
    console.error("Falha ao gravar log de auditoria:", error);
    // Não lançamos erro para não travar a ação principal do usuário
  }
};