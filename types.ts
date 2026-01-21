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
  productPrice?: number; // Ticket value
  productCost?: number;  // COGS / CMV
}

export interface AdEntry {
  id: string;
  date: string; // ISO string YYYY-MM-DD
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
  dayOfMonth: number; // 1-31
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

export type ViewMode = 'overview' | 'traffic_only' | 'net_profit';

export type DateRangeType = 'today' | 'yesterday' | 'last3days' | 'last7days' | 'last30days' | 'thisMonth' | 'allTime';