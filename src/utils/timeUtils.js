import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Calcula a duração legível entre duas datas.
 */
export const calculateDuration = (startDate, endDate = new Date()) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const days = differenceInDays(end, start);
  const hours = differenceInHours(end, start) % 24;
  
  if (days > 0) return `${days}d ${hours}h`;
  
  const minutes = differenceInMinutes(end, start) % 60;
  return `${hours}h ${minutes}m`;
};

/**
 * Processa o histórico bruto do Firebase e cria "Ciclos" com início e fim.
 */
export const processAssetTimeline = (historyDocs) => {
  if (!historyDocs || historyDocs.length === 0) return [];

  // 1. Ordena do mais antigo para o mais novo
  const sortedLogs = [...historyDocs].sort((a, b) => 
    a.timestamp?.toDate() - b.timestamp?.toDate()
  );

  const cycles = [];

  for (let i = 0; i < sortedLogs.length; i++) {
    const currentLog = sortedLogs[i];
    const nextLog = sortedLogs[i + 1]; // Pode ser undefined se for o último (atual)

    // Data de início é a data deste log
    const startDate = currentLog.timestamp?.toDate();
    
    // Data de fim é a data do próximo log, OU "Agora" se for o último
    const endDate = nextLog ? nextLog.timestamp?.toDate() : new Date();
    
    // Verifica se é o último ciclo (ainda está acontecendo)
    const isCurrent = !nextLog;

    cycles.push({
      id: currentLog.id,
      status: currentLog.newStatus || currentLog.oldStatus || 'Desconhecido',
      // Tenta pegar o funcionário do log, ou da info salva no log, ou 'Não identificado'
      funcionario: currentLog.newData?.funcionario || currentLog.details?.match(/Funcionário: (.*?)$/m)?.[1] || 'N/A',
      sector: currentLog.newData?.setor || currentLog.newSetor || 'N/A',
      type: currentLog.type, // 'Movimentação', 'Manutenção', etc.
      startDate,
      endDate,
      duration: calculateDuration(startDate, endDate),
      isCurrent
    });
  }

  // Retorna invertido (mais recente no topo)
  return cycles.reverse();
};