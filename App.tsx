
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, FinancialSummary, Frequency, UserSettings } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import AddTransactionModal from './components/AddTransactionModal';
import Navbar from './components/Navbar';
import InsightsPanel from './components/InsightsPanel';
import Settings from './components/Settings';
import { DEFAULT_CATEGORY_COLORS, BENGALI_MONTHS } from './constants';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('zen_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('zen_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        categoryColors: parsed.categoryColors || DEFAULT_CATEGORY_COLORS,
        budgets: parsed.budgets || {}
      };
    }
    return { categoryColors: DEFAULT_CATEGORY_COLORS, budgets: {} };
  });
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expense' | 'insights' | 'settings'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.EXPENSE);

  useEffect(() => {
    localStorage.setItem('zen_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('zen_settings', JSON.stringify(settings));
  }, [settings]);

  // Automated Recurring Transaction Logic
  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const recurringTemplates = transactions.filter(t => t.isRecurring);
    
    const newAdditions: Transaction[] = [];
    
    recurringTemplates.forEach(template => {
      const templateDate = new Date(template.date);
      const alreadyExists = transactions.some(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.note.includes(`[Auto:${template.id}]`);
      });

      if (!alreadyExists && templateDate.getTime() < new Date(currentYear, currentMonth, templateDate.getDate()).getTime()) {
        const newOccurence: Transaction = {
          ...template,
          id: `auto-${Date.now()}-${Math.random()}`,
          date: new Date(currentYear, currentMonth, templateDate.getDate()).toISOString(),
          note: `${template.note} [Auto:${template.id}]`,
          isRecurring: false 
        };
        newAdditions.push(newOccurence);
      }
    });

    if (newAdditions.length > 0) {
      setTransactions(prev => [...newAdditions, ...prev]);
    }
  }, []);

  const summary: FinancialSummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const lastMonthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    const income = currentMonthTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = currentMonthTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const prevIncome = lastMonthTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);

    const prevExpenses = lastMonthTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown: Record<string, number> = {};
    currentMonthTransactions.forEach(t => {
      if (t.type === TransactionType.EXPENSE) {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
      }
    });

    const monthlyHistory = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = targetDate.getMonth();
      const y = targetDate.getFullYear();
      const mTrans = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === m && d.getFullYear() === y;
      });
      monthlyHistory.push({
        month: BENGALI_MONTHS[m],
        income: mTrans.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0),
        expense: mTrans.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0)
      });
    }

    return {
      totalIncome: income,
      totalExpenses: expenses,
      savings: income - expenses,
      previousMonthSavings: prevIncome - prevExpenses,
      categoryBreakdown,
      monthlyHistory
    };
  }, [transactions]);

  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: Date.now().toString() };
    setTransactions(prev => [newTransaction, ...prev]);
    setIsModalOpen(false);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const openAddModal = (type: TransactionType) => {
    setModalType(type);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-64 bg-slate-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-5xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && (
          <Dashboard 
            summary={summary} 
            transactions={transactions.slice(0, 5)} 
            categoryColors={settings.categoryColors}
            budgets={settings.budgets}
            onAddExpense={() => openAddModal(TransactionType.EXPENSE)}
            onAddIncome={() => openAddModal(TransactionType.INCOME)}
          />
        )}

        {activeTab === 'income' && (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">আয়ের তালিকা</h1>
              <button 
                onClick={() => openAddModal(TransactionType.INCOME)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
              >
                <i className="fas fa-plus"></i> আয় যোগ করুন
              </button>
            </header>
            <TransactionList 
              title="আয়ের তালিকা"
              transactions={transactions.filter(t => t.type === TransactionType.INCOME)}
              onDelete={handleDeleteTransaction}
            />
          </div>
        )}

        {activeTab === 'expense' && (
          <div className="space-y-6">
            <header className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">ব্যয়ের তালিকা</h1>
              <button 
                onClick={() => openAddModal(TransactionType.EXPENSE)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
              >
                <i className="fas fa-plus"></i> খরচ যোগ করুন
              </button>
            </header>
            <TransactionList 
              title="ব্যয়ের তালিকা"
              transactions={transactions.filter(t => t.type === TransactionType.EXPENSE)}
              onDelete={handleDeleteTransaction}
              budgets={settings.budgets}
              categoryBreakdown={summary.categoryBreakdown}
            />
          </div>
        )}

        {activeTab === 'insights' && (
          <InsightsPanel transactions={transactions} summary={summary} />
        )}

        {activeTab === 'settings' && (
          <Settings 
            settings={settings} 
            onUpdateSettings={setSettings} 
          />
        )}
      </main>

      <button 
        onClick={() => openAddModal(TransactionType.EXPENSE)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg md:hidden flex items-center justify-center text-xl z-10"
      >
        <i className="fas fa-plus"></i>
      </button>

      {isModalOpen && (
        <AddTransactionModal 
          type={modalType} 
          onClose={() => setIsModalOpen(false)} 
          onAdd={handleAddTransaction} 
        />
      )}
    </div>
  );
};

export default App;
