
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType, MonthlyArchive, Insight, FinancialSummary } from './types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_ICONS, formatCurrency } from './constants';
import { getFinancialInsights } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'analytics' | 'tools'>('home');
  const [isShrunk, setIsShrunk] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(() => localStorage.getItem('spark_profile'));
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('spark_tx');
    return saved ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('spark_budgets');
    return saved ? JSON.parse(saved) : {
      'খাবার': 5000,
      'যাতায়াত': 2000,
      'ভাড়া': 10000,
      'বিল': 3000,
      'কেনাকাটা': 4000,
      'স্বাস্থ্য': 2000,
      'অন্যান্য': 2000
    };
  });

  const [archives, setArchives] = useState<MonthlyArchive[]>(() => {
    const saved = localStorage.getItem('spark_archives');
    return saved ? JSON.parse(saved) : [];
  });

  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [modalType, setModalType] = useState<TransactionType | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);

  // Tools state
  const [splitAmount, setSplitAmount] = useState('');
  const [splitPeople, setSplitPeople] = useState('');

  useEffect(() => {
    localStorage.setItem('spark_tx', JSON.stringify(transactions));
    localStorage.setItem('spark_archives', JSON.stringify(archives));
    localStorage.setItem('spark_budgets', JSON.stringify(budgets));
    if (profileImage) localStorage.setItem('spark_profile', profileImage);
  }, [transactions, archives, budgets, profileImage]);

  const summary = useMemo<FinancialSummary>(() => {
    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const categoryBreakdown: Record<string, number> = {};
    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
    });
    return { 
      totalIncome: income, 
      totalExpenses: expense, 
      balance: income - expense, 
      categoryBreakdown, 
      savings: income - expense, 
      previousMonthSavings: 0, 
      monthlyHistory: [] 
    };
  }, [transactions]);

  const analyticsData = useMemo(() => {
    const sortedBreakdown = (Object.entries(summary.categoryBreakdown) as [string, number][]).sort(([, a], [, b]) => b - a).slice(0, 5);
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTotal = transactions.filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(dateStr)).reduce((sum, t) => sum + t.amount, 0);
      return { day: d.toLocaleDateString('bn-BD', { weekday: 'short' }), amount: dayTotal };
    }).reverse();
    const totalBudget = (Object.values(budgets) as number[]).reduce((sum: number, b: number) => sum + b, 0);
    const budgetUsage = totalBudget > 0 ? (summary.totalExpenses / totalBudget) * 100 : 0;
    return { sortedBreakdown, last7Days, budgetUsage, avgDailySpend: summary.totalExpenses / Math.max(now.getDate(), 1) };
  }, [summary, transactions, budgets]);

  const addTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    if (!amount || amount <= 0) return;
    
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      type: modalType!,
      amount,
      category: formData.get('category') as string,
      note: (formData.get('note') as string) || '',
      date: new Date().toISOString()
    };
    setTransactions(prev => [newTx, ...prev]);
    setModalType(null);
    setShowAddMenu(false);
  };

  const fetchAIAdvice = async () => {
    if (transactions.length === 0) return;
    setLoadingAI(true);
    try {
      const results = await getFinancialInsights(transactions, summary);
      setInsights(results);
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-slate-50 shadow-2xl flex flex-col font-sans relative overflow-hidden text-slate-900 border-x border-slate-100">
      
      {/* HEADER */}
      <header className={`header-container bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative z-[60] shrink-0 transition-all duration-300 ${isShrunk ? 'p-4 rounded-b-[20px] shadow-lg' : 'p-8 rounded-b-[40px] shadow-xl'}`}>
        <div className="flex justify-between items-center mb-4 transition-all">
          <div className="flex items-center gap-3">
             <div className={`bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center relative overflow-hidden border border-white/20 transition-all ${isShrunk ? 'w-10 h-10' : 'w-14 h-14'}`}>
                {profileImage ? <img src={profileImage} className="w-full h-full object-cover" /> : <i className={`fas fa-user-circle ${isShrunk ? 'text-lg' : 'text-2xl'}`}></i>}
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setProfileImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} className="absolute inset-0 opacity-0 cursor-pointer" />
             </div>
             <div className={isShrunk ? 'hidden' : 'block animate-fadeIn'}>
                <h1 className="font-black uppercase tracking-tight text-white text-[24px]">স্পার্ক</h1>
                <p className="text-[12px] font-bold text-indigo-200 uppercase tracking-widest opacity-90">পার্সোনাল ফিন্যান্স</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBudgetSettings(true)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border-none active:scale-90 transition-all"><i className="fas fa-bullseye text-[13px]"></i></button>
            <button onClick={() => setShowHistory(true)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border-none active:scale-90 transition-all"><i className="fas fa-history text-[13px]"></i></button>
          </div>
        </div>
        <div className="text-center transition-all">
            <p className={`text-indigo-100 font-bold uppercase tracking-widest ${isShrunk ? 'hidden' : 'text-[13px] mb-2 animate-fadeIn'}`}>বর্তমান ব্যালেন্স</p>
            <h2 className={`font-black tracking-tighter text-white transition-all ${isShrunk ? 'text-[28px]' : 'text-[44px]'}`}>{formatCurrency(summary.balance)}</h2>
            {!isShrunk && (
              <div className="mt-6 grid grid-cols-2 gap-4 animate-fadeIn">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-sm text-center">
                  <p className="text-[11px] uppercase font-bold text-indigo-200 mb-1 tracking-wider">মোট আয়</p>
                  <p className="text-[18px] font-black text-green-300">৳{summary.totalIncome}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-sm text-center">
                  <p className="text-[11px] uppercase font-bold text-indigo-200 mb-1 tracking-wider">মোট ব্যয়</p>
                  <p className="text-[18px] font-black text-rose-300">৳{summary.totalExpenses}</p>
                </div>
              </div>
            )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 scroll-smooth" onScroll={(e) => {
        const scrollPos = e.currentTarget.scrollTop;
        setIsShrunk(scrollPos > 40);
      }}>
        {activeTab === 'home' ? (
          <div className="space-y-8 animate-fadeIn pb-40 pt-2">
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-400 text-[13px] uppercase tracking-widest">সাম্প্রতিক লেনদেন</h3>
              </div>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 6).map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-[24px] shadow-sm flex items-center justify-between border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${t.type === TransactionType.INCOME ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                          <i className={`fas ${CATEGORY_ICONS[t.category] || 'fa-tag'}`}></i>
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-[14px]">{t.category}</p>
                          <p className="text-[11px] text-slate-400 font-bold uppercase">{t.note || 'সাধারণ'}</p>
                        </div>
                      </div>
                      <p className={`font-black text-[15px] ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-800'}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-[30px]">
                   <p className="text-slate-400 font-black text-[12px]">কোনো লেনদেন নেই</p>
                </div>
              )}
            </div>
            {/* BUDGET PREVIEW */}
            <div className="space-y-4">
               <h3 className="font-black text-slate-400 text-[13px] uppercase tracking-widest px-2">বাজেট ট্র্যাকার</h3>
               <div className="space-y-3">
                {EXPENSE_CATEGORIES.slice(0, 3).map(cat => {
                  const spent = summary.categoryBreakdown[cat] || 0;
                  const budget = budgets[cat] || 0;
                  if (budget === 0) return null;
                  return (
                    <div key={cat} className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100">
                      <div className="flex justify-between items-center mb-2 text-[12px] font-black">
                        <p>{cat}</p>
                        <p>৳{spent} / ৳{budget}</p>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-indigo-500`} style={{ width: `${Math.min((spent / budget) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                  );
                })}
               </div>
            </div>
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="space-y-8 animate-fadeIn pb-40 pt-2">
             <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-black text-slate-800 uppercase text-[13px] tracking-widest">সাপ্তাহিক ট্রেন্ড</h3>
                <div className="flex items-end justify-between h-32 gap-2">
                   {analyticsData.last7Days.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                         <div className="w-full bg-indigo-600 rounded-full" style={{ height: `${Math.max((d.amount / (Math.max(...analyticsData.last7Days.map(x => x.amount)) || 1)) * 100, 5)}%` }}></div>
                         <span className="text-[10px] font-bold text-slate-400">{d.day}</span>
                      </div>
                   ))}
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm text-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">বাজেট ব্যবহার</p>
                   <div className="text-[24px] font-black">{analyticsData.budgetUsage.toFixed(0)}%</div>
                </div>
                <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm text-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">দৈনিক গড়</p>
                   <div className="text-[24px] font-black text-indigo-600">৳{analyticsData.avgDailySpend.toFixed(0)}</div>
                </div>
             </div>
             <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                <h3 className="text-[13px] font-black uppercase tracking-widest text-indigo-400 mb-4">এআই পর্যবেক্ষণ</h3>
                {insights.length > 0 ? (
                  <div className="space-y-4 animate-fadeIn">
                    {insights.slice(0, 1).map((insight, idx) => (
                      <div key={idx} className="space-y-2">
                        <p className="font-black text-[18px] text-white">{insight.title}</p>
                        <p className="text-slate-400 text-[14px] font-bold">{insight.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button onClick={fetchAIAdvice} disabled={loadingAI} className="w-full py-4 bg-indigo-600 rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all">
                    {loadingAI ? 'বিশ্লেষণ হচ্ছে...' : 'এআই পরামর্শ পান'}
                  </button>
                )}
             </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn pb-40 pt-2">
             <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
               <h3 className="font-black text-slate-800 uppercase text-[13px] tracking-widest">বিল স্প্লিটার</h3>
               <div className="space-y-4">
                 <input type="number" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} placeholder="৳ মোট বিল" className="w-full p-5 bg-slate-50 rounded-[22px] font-black outline-none border-none shadow-inner" />
                 <input type="number" value={splitPeople} onChange={(e) => setSplitPeople(e.target.value)} placeholder="মানুষের সংখ্যা" className="w-full p-5 bg-slate-50 rounded-[22px] font-black outline-none border-none shadow-inner" />
               </div>
               <div className="p-8 bg-indigo-600 rounded-[30px] text-center text-white">
                 <p className="text-[11px] font-bold uppercase mb-2">মাথা পিছু</p>
                 <p className="text-[32px] font-black">৳ {splitAmount && splitPeople ? (parseFloat(splitAmount) / parseInt(splitPeople)).toFixed(0) : '০'}</p>
               </div>
             </div>
          </div>
        )}
      </main>

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-28 right-6 z-[100] flex flex-col items-end gap-4">
        {showAddMenu && (
          <div className="flex flex-col gap-3 mb-2 animate-slideUp items-end">
            <button onClick={() => { setModalType(TransactionType.INCOME); setShowAddMenu(false); }} className="bg-green-600 text-white px-5 py-3 rounded-[18px] font-black text-[12px] uppercase tracking-widest shadow-xl border-none active:scale-95">
              <i className="fas fa-arrow-up mr-2"></i> আয়
            </button>
            <button onClick={() => { setModalType(TransactionType.EXPENSE); setShowAddMenu(false); }} className="bg-rose-600 text-white px-5 py-3 rounded-[18px] font-black text-[12px] uppercase tracking-widest shadow-xl border-none active:scale-95">
              <i className="fas fa-arrow-down mr-2"></i> ব্যয়
            </button>
          </div>
        )}
        
        {/* MAIN ADD BUTTON (+) WITH ANIMATION AND COLOR */}
        <button 
            onClick={() => setShowAddMenu(!showAddMenu)} 
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl transition-all active:scale-90 border-none 
                ${showAddMenu 
                    ? 'bg-slate-800 rotate-45 shadow-xl' 
                    : 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 shadow-[0_8px_30px_rgba(79,70,229,0.5)] btn-glow'
                }`}
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="fixed bottom-6 left-6 right-6 z-[150]">
        <nav className="bg-white/90 backdrop-blur-xl border border-slate-200/50 px-6 py-3 flex justify-between items-center rounded-[30px] shadow-xl overflow-hidden">
          <button onClick={() => setActiveTab('home')} className={`flex-1 flex flex-col items-center gap-1 border-none bg-transparent ${activeTab === 'home' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className="fas fa-house-chimney text-[18px]"></i>
            <span className="text-[9px] font-black uppercase">হোম</span>
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`flex-1 flex flex-col items-center gap-1 border-none bg-transparent ${activeTab === 'analytics' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className="fas fa-chart-pie text-[18px]"></i>
            <span className="text-[9px] font-black uppercase">বিশ্লেষণ</span>
          </button>
          <button onClick={() => setActiveTab('tools')} className={`flex-1 flex flex-col items-center gap-1 border-none bg-transparent ${activeTab === 'tools' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className="fas fa-layer-group text-[18px]"></i>
            <span className="text-[9px] font-black uppercase">টুলস</span>
          </button>
        </nav>
      </div>

      {/* TRANSACTION MODAL */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-[340px] rounded-[35px] shadow-2xl border-none animate-slideUp overflow-hidden">
            <div className="p-8 space-y-6">
              <h2 className="text-[18px] font-black text-slate-800 text-center">{modalType === TransactionType.INCOME ? 'আয় যোগ' : 'ব্যয় যোগ'}</h2>
              <form onSubmit={addTransaction} className="space-y-6">
                <input ref={amountInputRef} type="number" name="amount" required placeholder="৳ টাকার পরিমাণ" className="w-full text-[24px] font-black text-center outline-none border-none bg-slate-50 py-4 rounded-[20px]" />
                <select name="category" className="w-full py-4 px-6 bg-slate-50 rounded-[20px] font-black text-slate-800 outline-none border-none">
                  {(modalType === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="text" name="note" placeholder="নোট..." className="w-full py-4 px-6 bg-slate-50 rounded-[20px] font-black outline-none border-none" />
                <button type="submit" className={`w-full py-5 rounded-[22px] text-white font-black uppercase text-[13px] tracking-widest border-none ${modalType === TransactionType.INCOME ? 'bg-green-600' : 'bg-rose-600'}`}>সংরক্ষণ করুন</button>
                <button type="button" onClick={() => setModalType(null)} className="w-full py-2 text-slate-400 font-black uppercase text-[10px] border-none bg-transparent">বাতিল করুন</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* BUDGET MODAL (SIMPLIFIED) */}
      {showBudgetSettings && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 animate-slideUp overflow-y-auto max-h-[85vh] border-none">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-[18px] font-black uppercase">বাজেট সেটিংস</h2>
                <button onClick={() => setShowBudgetSettings(false)} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center border-none"><i className="fas fa-times"></i></button>
             </div>
             <div className="space-y-6 mb-8">
                {EXPENSE_CATEGORIES.map(cat => (
                  <div key={cat} className="flex flex-col gap-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase">{cat}</label>
                    <input type="number" value={budgets[cat] || ''} onChange={(e) => setBudgets({ ...budgets, [cat]: parseFloat(e.target.value) || 0 })} placeholder="৳ মাসিক বাজেট" className="w-full p-4 bg-slate-50 rounded-[18px] font-black outline-none border-none shadow-inner" />
                  </div>
                ))}
             </div>
             <button onClick={() => setShowBudgetSettings(false)} className="w-full py-5 bg-indigo-600 text-white rounded-[22px] font-black uppercase text-[12px] border-none">সেভ করুন</button>
          </div>
        </div>
      )}

      {/* HISTORY MODAL (SIMPLIFIED) */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex flex-col">
          <div className="bg-white flex-1 mt-20 rounded-t-[40px] p-8 overflow-y-auto animate-slideUp border-none">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-[18px] font-black uppercase tracking-widest">ইতিহাস</h2>
                <button onClick={() => setShowHistory(false)} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center border-none"><i className="fas fa-times"></i></button>
             </div>
             <p className="text-center py-24 text-slate-400 font-black uppercase text-[12px]">পুরানো রেকর্ড নেই</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;