
export enum OfferStatus {
  RUNNING = 'Rodando / Escala',
  VALIDATED = 'Validada',
  PRODUCING = 'Em Produção',
  TESTING = 'Em Teste',
  PAUSED = 'Pausada'
}

export interface Offer {
  id: string;
  name: string;
  status: OfferStatus;
  productPrice?: number;
  productCost?: number;
}

export interface AdEntry {
  id: string;
  date: string;
  offerId: string;
  spend: number;
  revenue: number;
}

export enum ExpenseCategory {
  BM_GGMAX = 'BM / Contingência',
  DOMAIN = 'Domínio / Hospedagem',
  CHARGEBACK = 'Chargeback / Reembolso',
  TOOLS = 'Ferramentas / SaaS',
  OTHER = 'Outros'
}

export interface ExtraExpense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  category: ExpenseCategory;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalSpend: number;
  totalExtras: number;
  netProfit: number;
  roas: number;
  roi: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar_url?: string;
}

export interface Task {
  id: string;
  project_id: string;
  text: string;
  completed: boolean;
  assignee_id?: string;
  instructions?: string;
  assignee_notes?: string;
  completed_at?: string;
  instruction_author?: string; 
  notes_author?: string;       
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'Ativo' | 'Pausado' | 'Concluído';
  progress: number;
  created_at?: string;
}

export type ViewMode = 'overview' | 'traffic_only' | 'net_profit';

export type DateRangeType = 'today' | 'yesterday' | 'last3days' | 'last7days' | 'last30days' | 'thisMonth' | 'allTime' | 'custom';
