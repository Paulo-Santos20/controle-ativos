export const TIPOS_ATIVO_COMPUTADOR = ["Desktop", "All in One", "Notebook", "Tablet"];

export const TIPOS_ATIVO_IMPRESSORA = [
  "Multifuncional", 
  "Comum", 
  "Etiquetadora", 
  "Pulseira", 
  "Térmica", 
  "Outro"
];

export const TIPOS_ATIVO_IMPRESSORA_PAGE = [
  "Multifuncional",
  "Impressora (Térmica)",
  "Impressora (Matricial)",
  "Impressora (Laser)",
  "Impressora (Jato de Tinta)",
  "Outro"
];

export const OPCOES_MARCA_IMPRESSORA = [
  "Brother", "HP", "Epson", "Gainscha", "Dascom", 
  "GODEX", "Konica Minolta", "Ricoh", "Samsung", "Outra"
];

export const OPCOES_POSSE = ["Própria", "Alugado", "Doação", "Empréstimo"];
export const OPCOES_PROPRIEDADE = ["Própria", "Alugada", "Doação"];

export const OPCOES_STATUS = [
  "Em uso",
  "Manutenção",
  "Inativo",
  "Estoque",
  "Manutenção agendada",
  "Devolução agendada",
  "Devolvido",
  "Reativação agendada"
];

export const OPCOES_STATUS_IMPRESSORA = [...OPCOES_STATUS, "Pronta", "Ocupada", "Ativa", "ATIVA"];

export const OPCOES_SO = [
  "Windows 11 Pro",
  "Windows 11 Home",
  "Windows 10 Pro",
  "Windows 10 Home",
  "Ubuntu",
  "Linux (Outro)",
  "macOS",
  "Não possui"
];

export const OPCOES_PAVIMENTO = [
  "Subsolo",
  "Térreo",
  "1º Andar",
  "2º Andar",
  "3º Andar",
  "4º Andar",
  "Outro"
];

export const OPCOES_SETOR = [
  "Recepção",
  "Triagem",
  "Emergência",
  "UTI Adulto",
  "UTI Neonatal",
  "UTI Pediátrica",
  "Bloco Cirúrgico",
  "Centro Obstétrico",
  "Enfermaria",
  "Apartamentos",
  "Centro de Diagnóstico (CDI)",
  "Laboratório",
  "Farmácia",
  "Almoxarifado",
  "TI",
  "Administração",
  "Faturamento",
  "Manutenção",
  "Nutrição (SND)",
  "Higienização (SHL)",
  "Outro"
];

export const OPCOES_SALA = [
  "Bloco",
  "Central",
  "Laudos",
  "Emergência",
  ...Array.from({ length: 10 }, (_, i) => `Consultório ${i + 1}`),
  ...Array.from({ length: 3 }, (_, i) => `CPD ${i + 1}`),
  ...Array.from({ length: 3 }, (_, i) => `Recepção ${i + 1}`),
  ...Array.from({ length: 2 }, (_, i) => `Posto ${i + 1}`)
];

export const OPCOES_CONECTIVIDADE = ["Rede/USB", "Rede", "USB", "Wi-Fi", "Bluetooth", "Outro"];
export const OPCOES_FRENTE_VERSO = ["Sim", "Não", "Não se aplica"];
export const OPCOES_CARTUCHO = [
  "Laser (Toner)", 
  "Jato de Tinta", 
  "Térmica (Ribbon)", 
  "Térmica (Direta)", 
  "Matricial (Fita)", 
  "Etiqueta",
  "Outro"
];
export const OPCOES_COLORIDO = ["Sim", "Não"];

export const ATTENTION_STATUSES = [
  "Manutenção agendada",
  "Em manutenção",
  "Devolução agendada"
];

export const STATUS_CLASS_MAP = {
  "Em uso": "statusUsage",
  "Em manutenção": "statusMaintenance",
  "Inativo": "statusInactive",
  "Estoque": "statusStock",
  "Devolvido": "statusReturned"
};

export const getStatusClass = (status) => STATUS_CLASS_MAP[status] || "";

export const FILTRO_TIPO = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'computador', label: 'Computadores' },
  { value: 'impressora', label: 'Impressoras' }
];

export const FILTRO_STATUS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'Em uso', label: 'Em uso' },
  { value: 'Estoque', label: 'Estoque' },
  { value: 'Manutenção', label: 'Manutenção' },
  { value: 'Devolvido', label: 'Devolvido' },
  { value: 'Inativo', label: 'Inativo' }
];

export const COLORS = ['#007aff', '#5ac8fa', '#ff9500', '#34c759', '#ff3b30', '#af52de'];

export const ITEMS_PER_PAGE = 20;
export const BULK_MOVE_LIMIT = 250;