
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

// Added missing Enums and Interfaces to resolve import errors in components
export enum IncomeCategory {
  SALARY = 'বেতন',
  BUSINESS = 'ব্যবসা',
  FREELANCING = 'ফ্রিল্যান্সিং',
  GIFT = 'উপহার',
  OTHER = 'অন্যান্য'
}

export enum ExpenseCategory {
  FOOD = 'খাবার',
  TRANSPORT = 'যাতায়াত',
  RENT = 'ভাড়া',
  BILLS = 'বিল',
  SHOPPING = 'কেনাকাটা',
  HEALTH = 'স্বাস্থ্য',
  OTHER = 'অন্যান্য'
}

export enum Frequency {
  NONE = 'NONE',
  MONTHLY = 'MONTHLY'
}

export interface UserSettings {
  budgets: Record<string, number>;
  categoryColors: Record<string, string>;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  note: string;
  isRecurring?: boolean;
  frequency?: Frequency;
}

export interface MonthlyArchive {
  id: string;
  monthName: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  transactions: Transaction[];
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savings: number;
  previousMonthSavings: number;
  categoryBreakdown: Record<string, number>;
  monthlyHistory: { month: string; income: number; expense: number }[];
}

export interface Insight {
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info';
}
