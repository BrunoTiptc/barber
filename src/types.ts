export interface Cliente {
  id: string;
  nome: string;
  whatsapp: string;
  termo_aceito: boolean;
  validado: boolean;
}

export type UserRole = 'admin' | 'barbeiro';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  funcao: UserRole;
  foto_url: string;
  senha?: string; // Para login simples no protótipo
  horarios_bloqueados?: string[]; // Array de strings "YYYY-MM-DD_HH:MM" ou apenas "HH:MM"
}

export interface Servico {
  id: string;
  nome_servico: string;
  preco: number;
}

export type AgendamentoStatus = 'pendente' | 'confirmado' | 'cancelado';

export interface Agendamento {
  id: string;
  cliente_id: string;
  barbeiro_id: string;
  servico_id: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  status: AgendamentoStatus;
  // Campos auxiliares para exibição em tempo real sem precisar de múltiplos lookups
  cliente_nome?: string;
  cliente_whatsapp?: string;
  barbeiro_nome?: string;
  servico_nome?: string;
  servico_preco?: number;
}

export interface EstabelecimentoConfig {
  id: string;
  horario_inicio: string; // e.g. "09:00"
  horario_fim: string; // e.g. "19:00"
  intervalo_minutos: number; // e.g. 30
  dias_bloqueados: number[]; // e.g. [0] para domingos
  lembretes_antecedencia: number; // e.g. 60
  lembretes_unidade: 'minutos' | 'horas' | 'dias';
  lembretes_ativo: boolean;
}
