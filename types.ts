
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum Frequency {
  NONE = 'NONE',
  MONTHLY = 'MONTHLY'
}

export enum IncomeCategory {
  SALARY = 'বেতন',
  FREELANCING = 'ফ্রিল্যান্সিং',
  BUSINESS = 'ব্যবসা',
  GIFT = 'উপহার',
  OTHER = 'অন্যান্য'
}

export enum ExpenseCategory {
  FOOD = 'খাবার',
  TRANSPORT = 'যাতায়াত',
  RENT = 'ভাড়া',
  BILLS = 'বিল',
  SHOPPING = 'কেনাকাটা',
  ENTERTAINMENT = 'বিনোদন',
  HEALTH = 'স্বাস্থ্য',
  OTHER = 'অন্যান্য'
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // ISO string
  note: string;
  isRecurring?: boolean;
  frequency?: Frequency;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  previousMonthSavings: number;
  categoryBreakdown: Record<string, number>;
  monthlyHistory: Array<{ month: string; income: number; expense: number }>;
}

export interface Insight {
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
}

export interface UserSettings {
  categoryColors: Record<string, string>;
  budgets: Record<string, number>;
}
