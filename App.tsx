
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, MonthlyArchive, Insight, FinancialSummary } from './types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_ICONS, formatCurrency } from './constants';
import { getFinancialInsights } from './services/geminiService';

const App: React.FC = () => {
  // Navigation Tabs: Home, Future, Tools
  const [activeTab, setActiveTab] = useState<'home' | 'future' | 'tools'>('home');
  const [profileImage, setProfileImage] = useState<string | null>(() => localStorage.getItem('spark_profile'));
  
  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('spark_tx');
    return saved ? JSON.parse(saved) : [];
  });

  // Budgets State
  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('spark_budgets');
    return saved ? JSON.parse(saved) : {};
  });

  // History State
  const [archives, setArchives] = useState<MonthlyArchive[]>(() => {
    const saved = localStorage.getItem('spark_archives');
    return saved ? JSON.parse(saved) : [];
  });

  // AI Insights State
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  // Bill Splitter State
  const [splitAmount, setSplitAmount] = useState('');
  const [splitPeople, setSplitPeople] = useState('2');

  // Modals
  const [modalType, setModalType] = useState<TransactionType | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showBudgetSettings, setShowBudgetSettings] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('spark_tx', JSON.stringify(transactions));
    localStorage.setItem('spark_archives', JSON.stringify(archives));
    localStorage.setItem('spark_budgets', JSON.stringify(budgets));
    if (profileImage) localStorage.setItem('spark_profile', profileImage);
  }, [transactions, archives, budgets, profileImage]);

  // Financial Summary
  const summary = useMemo(() => {
    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const breakdown: Record<string, number> = {};
    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
      breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
    });
    return { income, expense, balance: income - expense, breakdown };
  }, [transactions]);

  // AI Logic
  const fetchAIAdvice = async () => {
    if (transactions.length === 0) {
      alert("পরামর্শ পেতে প্রথমে কিছু লেনদেন যোগ করুন।");
      return;
    }
    setLoadingAI(true);
    const finSummary: FinancialSummary = {
      totalIncome: summary.income,
      totalExpenses: summary.expense,
      balance: summary.balance,
      savings: summary.balance,
      previousMonthSavings: (archives[0]?.totalIncome ?? 0) - (archives[0]?.totalExpense ?? 0),
      categoryBreakdown: summary.breakdown,
      monthlyHistory: archives.slice(0, 5).map(a => ({
        month: a.monthName,
        income: a.totalIncome,
        expense: a.totalExpense
      }))
    };
    const results = await getFinancialInsights(transactions, finSummary);
    setInsights(results);
    setLoadingAI(false);
  };

  const addTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    if (!amount || amount <= 0) return;
    
    const newTx: Transaction = {
      id: Date.now().toString(),
      type: modalType!,
      amount,
      category: formData.get('category') as string,
      note: (formData.get('note') as string) || '',
      date: new Date().toISOString()
    };
    setTransactions(prev => [newTx, ...prev]);
    setModalType(null);
  };

  const deleteTransaction = (id: string) => {
    if (window.confirm('আপনি কি এই লেনদেনটি মুছে ফেলতে চান?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const activeBudgetData = useMemo(() => {
    return (Object.entries(budgets) as [string, number][]).filter(([_, amount]) => amount > 0);
  }, [budgets]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 shadow-2xl flex flex-col font-sans relative pb-32 overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-700 via-blue-600 to-indigo-800 p-8 text-white rounded-b-[40px] shadow-2xl relative z-20">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center relative overflow-hidden border border-white/30 shadow-lg backdrop-blur-sm group">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-user-circle text-3xl text-blue-100"></i>
                )}
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setProfileImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} className="absolute inset-0 opacity-0 cursor-pointer" />
             </div>
             <div>
                <h1 className="text-2xl font-black uppercase tracking-tight">স্পার্ক</h1>
                <p className="text-[10px] font-black text-blue-200 mt-0.5 uppercase tracking-widest">আমার স্মার্ট বাজেট</p>
             </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowBudgetSettings(true)} className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 shadow-sm backdrop-blur-md">
              <i className="fas fa-bullseye"></i>
            </button>
            <button onClick={() => setShowHistory(true)} className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 shadow-sm backdrop-blur-md">
              <i className="fas fa-history"></i>
            </button>
          </div>
        </div>
        
        <div className="text-center py-2">
          <p className="text-blue-100 text-[11px] font-black uppercase tracking-[0.3em] mb-3">মোট টাকা</p>
          <h2 className="text-5xl font-black mb-10 tracking-tighter drop-shadow-lg">{formatCurrency(summary.balance)}</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-4 rounded-[28px] border border-white/20">
              <p className="text-[10px] uppercase font-black text-blue-200 mb-1">মোট আয়</p>
              <p className="text-xl font-black text-green-300">৳{summary.income}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl p-4 rounded-[28px] border border-white/20">
              <p className="text-[10px] uppercase font-black text-blue-200 mb-1">মোট ব্যয়</p>
              <p className="text-xl font-black text-rose-300">৳{summary.expense}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8">
        {activeTab === 'home' ? (
          <div className="space-y-10 animate-fadeIn">
            {/* Balance Adding Options - Attractive Design */}
            <div className="grid grid-cols-2 gap-5">
              <button 
                onClick={() => setModalType(TransactionType.INCOME)} 
                className="group p-6 bg-white border border-slate-100 rounded-[35px] flex flex-col items-center gap-3 transition-all hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-[22px] flex items-center justify-center text-3xl shadow-lg shadow-green-100 transition-transform group-hover:rotate-6">
                  <i className="fas fa-plus"></i>
                </div>
                <span className="text-[12px] font-black text-slate-800 uppercase tracking-widest">টাকা যোগ</span>
              </button>
              
              <button 
                onClick={() => setModalType(TransactionType.EXPENSE)} 
                className="group p-6 bg-white border border-slate-100 rounded-[35px] flex flex-col items-center gap-3 transition-all hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-[22px] flex items-center justify-center text-3xl shadow-lg shadow-rose-100 transition-transform group-hover:-rotate-6">
                  <i className="fas fa-minus"></i>
                </div>
                <span className="text-[12px] font-black text-slate-800 uppercase tracking-widest">খরচ যোগ</span>
              </button>
            </div>

            {/* Budget Progress bars */}
            {activeBudgetData.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span> মাসিক বাজেট
                </h3>
                <div className="space-y-4 bg-white p-7 rounded-[35px] border border-slate-100 shadow-sm">
                  {activeBudgetData.map(([cat, budget]) => {
                    const spent = summary.breakdown[cat] || 0;
                    const percent = Math.min((spent / budget) * 100, 100);
                    const isOver = spent > budget;
                    return (
                      <div key={cat} className="space-y-2.5">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase">
                          <span className="text-slate-800">{cat}</span>
                          <span className={isOver ? 'text-rose-600 font-black' : 'text-slate-500'}>
                            ৳{spent} / ৳{budget}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-indigo-600'}`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transaction List with working Delete */}
            <div className="space-y-5 pb-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span> লেনদেনের তালিকা
                </h3>
                <button onClick={() => {
                  if (transactions.length === 0) return alert("লেনদেন নেই।");
                  if (window.confirm('পুরো মাসের হিসাব ইতিহাসে জমা করবেন?')) {
                    const now = new Date();
                    const newArchive: MonthlyArchive = {
                      id: Date.now().toString(),
                      monthName: now.toLocaleString('bn-BD', { month: 'long' }),
                      year: now.getFullYear(),
                      totalIncome: summary.income,
                      totalExpense: summary.expense,
                      transactions: [...transactions]
                    };
                    setArchives([newArchive, ...archives]);
                    setTransactions([]);
                  }
                }} className="text-[9px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl uppercase hover:bg-blue-600 hover:text-white transition-all">আর্কাইভ</button>
              </div>

              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map(t => (
                    <div key={t.id} className="group bg-white border border-slate-100 p-5 rounded-[30px] shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-indigo-100">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${t.type === TransactionType.INCOME ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                          <i className={`fas ${CATEGORY_ICONS[t.category] || 'fa-tag'}`}></i>
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-[15px]">{t.category}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{t.note || 'সাধারণ'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`font-black text-[16px] tracking-tight ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-900'}`}>
                          {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount}
                        </p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTransaction(t.id);
                          }}
                          className="w-10 h-10 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90"
                          title="মুছে ফেলুন"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <i className="fas fa-receipt text-slate-200 text-3xl"></i>
                  </div>
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">কোনো লেনদেন নেই</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'future' ? (
          <div className="space-y-8 animate-fadeIn">
            <div className="p-10 bg-slate-900 rounded-[45px] text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-3xl font-black mb-3 tracking-tight">ভবিষ্যৎ পরামর্শ</h3>
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-10 opacity-70">এআই এর মাধ্যমে আর্থিক বিশ্লেষণ</p>
                
                <button 
                  onClick={fetchAIAdvice}
                  disabled={loadingAI}
                  className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-[24px] font-black uppercase text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loadingAI ? (
                    <><i className="fas fa-circle-notch animate-spin"></i> বিশ্লেষণ হচ্ছে...</>
                  ) : (
                    <><i className="fas fa-sparkles"></i> এআই পরামর্শ নিন</>
                  )}
                </button>
              </div>
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]"></div>
            </div>

            {insights.length > 0 ? (
              <div className="space-y-4">
                {insights.map((insight, idx) => (
                  <div key={idx} className={`p-7 rounded-[35px] border-2 ${insight.type === 'success' ? 'bg-green-50/50 border-green-100' : insight.type === 'warning' ? 'bg-rose-50/50 border-rose-100' : 'bg-blue-50/50 border-blue-100'} animate-fadeIn shadow-sm`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl shadow-sm ${insight.type === 'success' ? 'bg-green-500 text-white' : insight.type === 'warning' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}`}>
                        <i className={`fas ${insight.type === 'success' ? 'fa-check' : insight.type === 'warning' ? 'fa-exclamation' : 'fa-lightbulb'}`}></i>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-[16px] mb-1">{insight.title}</h4>
                        <p className="text-slate-600 text-[13px] font-bold leading-relaxed">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !loadingAI && (
              <div className="text-center py-16 px-8 border-2 border-dashed border-slate-200 rounded-[45px] bg-white">
                <p className="text-slate-400 font-black text-[11px] uppercase tracking-widest leading-loose">পরামর্শ পেতে এআই বাটনে ক্লিক করুন</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-10 animate-fadeIn">
            <div className="bg-white p-10 rounded-[45px] border border-slate-100 shadow-sm space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-100"><i className="fas fa-calculator"></i></div>
                <h3 className="font-black text-slate-900 uppercase text-[14px] tracking-widest">বিল স্প্লিটার</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-2">মোট বিল</label>
                  <input type="number" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} placeholder="৳ ০" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-black text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-2">মানুষ</label>
                  <input type="number" value={splitPeople} onChange={(e) => setSplitPeople(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[25px] font-black text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-inner" />
                </div>
              </div>
              
              <div className="p-10 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[35px] text-center shadow-xl shadow-indigo-100">
                <p className="text-[10px] font-black text-blue-100 uppercase mb-2 tracking-[0.3em]">প্রতি জনের অংশ</p>
                <p className="text-5xl font-black text-white tracking-tighter">৳ {splitAmount && splitPeople ? (parseFloat(splitAmount) / parseInt(splitPeople)).toFixed(0) : '০'}</p>
              </div>
            </div>
            
            <button 
              onClick={() => { if(window.confirm('নিশ্চিত তো? সব তথ্য মুছে যাবে!')) { setTransactions([]); setArchives([]); setBudgets({}); alert('সব ডেটা মুছে ফেলা হয়েছে'); } }}
              className="w-full p-6 bg-rose-50 border border-rose-100 text-rose-600 rounded-[30px] flex items-center justify-between font-black uppercase text-[12px] tracking-widest hover:bg-rose-600 hover:text-white transition-all"
            >
              সব তথ্য মুছে ফেলুন
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        )}
      </main>

      {/* Improved Bottom Navigation - High Highlighted Icons */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 p-4 pb-8 flex justify-around items-center z-[100] shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.15)] rounded-t-[40px]">
        <button 
          onClick={() => setActiveTab('home')} 
          className={`flex flex-col items-center gap-2 p-2 px-6 rounded-3xl transition-all duration-300 relative ${activeTab === 'home' ? 'text-blue-700' : 'text-slate-400'}`}
        >
          <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${activeTab === 'home' ? 'bg-blue-100 scale-110 shadow-sm' : ''}`}>
            <i className="fas fa-house-user text-xl"></i>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity ${activeTab === 'home' ? 'opacity-100' : 'opacity-60'}`}>হোম</span>
          {activeTab === 'home' && <div className="absolute -bottom-1 w-6 h-1 bg-blue-700 rounded-full"></div>}
        </button>
        
        <button 
          onClick={() => setActiveTab('future')} 
          className={`flex flex-col items-center gap-2 p-2 px-6 rounded-3xl transition-all duration-300 relative ${activeTab === 'future' ? 'text-indigo-700' : 'text-slate-400'}`}
        >
          <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${activeTab === 'future' ? 'bg-indigo-100 scale-110 shadow-sm' : ''}`}>
            <i className="fas fa-rocket text-xl"></i>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity ${activeTab === 'future' ? 'opacity-100' : 'opacity-60'}`}>ভবিষ্যৎ</span>
          {activeTab === 'future' && <div className="absolute -bottom-1 w-6 h-1 bg-indigo-700 rounded-full"></div>}
        </button>
        
        <button 
          onClick={() => setActiveTab('tools')} 
          className={`flex flex-col items-center gap-2 p-2 px-6 rounded-3xl transition-all duration-300 relative ${activeTab === 'tools' ? 'text-blue-700' : 'text-slate-400'}`}
        >
          <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${activeTab === 'tools' ? 'bg-blue-100 scale-110 shadow-sm' : ''}`}>
            <i className="fas fa-layer-group text-xl"></i>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity ${activeTab === 'tools' ? 'opacity-100' : 'opacity-60'}`}>টুলস</span>
          {activeTab === 'tools' && <div className="absolute -bottom-1 w-6 h-1 bg-blue-700 rounded-full"></div>}
        </button>
      </nav>

      {/* Transaction Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[55px] p-10 animate-slideUp shadow-2xl border-t border-white/20">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight">{modalType === TransactionType.INCOME ? 'টাকা যোগ' : 'খরচ যোগ'}</h2>
              <button onClick={() => setModalType(null)} className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 hover:bg-slate-200 shadow-sm"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <form onSubmit={addTransaction} className="space-y-8">
              <div className="bg-slate-50 rounded-[40px] p-10 border-2 border-slate-100 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-inner">
                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">পরিমাণ (৳)</p>
                <input 
                  type="number" 
                  name="amount" 
                  required 
                  placeholder="০" 
                  autoFocus 
                  className="w-full text-6xl font-black text-center outline-none text-slate-900 bg-transparent tracking-tighter placeholder:text-slate-200"
                />
              </div>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-4 tracking-widest">ক্যাটাগরি</label>
                  <select name="category" className="w-full p-6 bg-white border-2 border-slate-100 rounded-[30px] font-black text-slate-900 outline-none focus:border-blue-600 shadow-sm appearance-none cursor-pointer">
                    {(modalType === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase ml-4 tracking-widest">নোট</label>
                  <input type="text" name="note" placeholder="যেমন: বাজার, বেতন..." className="w-full p-6 bg-white border-2 border-slate-100 rounded-[30px] font-black text-slate-900 outline-none focus:border-blue-600 shadow-sm" />
                </div>
              </div>
              
              <button type="submit" className={`w-full py-7 rounded-[35px] text-white font-black text-xl shadow-2xl active:scale-95 transition-all mb-4 ${modalType === TransactionType.INCOME ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-rose-500 to-pink-600'}`}>নিশ্চিত করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* Other modals remain similar but with consistent styling */}
      {showBudgetSettings && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[55px] p-10 animate-slideUp shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
             <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight">বাজেট লক্ষ্য</h2>
                <button onClick={() => setShowBudgetSettings(false)} className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 shadow-sm"><i className="fas fa-times text-xl"></i></button>
             </div>
             <div className="space-y-6 mb-10">
                {EXPENSE_CATEGORIES.map(cat => (
                  <div key={cat} className="space-y-3">
                    <div className="flex items-center gap-3 ml-3">
                      <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-sm"><i className={`fas ${CATEGORY_ICONS[cat]}`}></i></div>
                      <label className="text-[12px] font-black text-slate-800 uppercase tracking-widest">{cat}</label>
                    </div>
                    <input 
                      type="number" 
                      value={budgets[cat] || ''}
                      onChange={(e) => setBudgets({ ...budgets, [cat]: parseFloat(e.target.value) || 0 })}
                      placeholder="৳ বাজেট দিন"
                      className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[30px] font-black text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                ))}
             </div>
             <button onClick={() => setShowBudgetSettings(false)} className="w-full py-7 bg-slate-900 text-white rounded-[35px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl active:scale-95 transition-all mb-6">সংরক্ষণ করুন</button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex flex-col">
          <div className="bg-white flex-1 mt-24 rounded-t-[60px] p-10 overflow-y-auto animate-slideUp shadow-2xl">
             <div className="flex justify-between items-center mb-12">
                <h2 className="text-3xl font-black uppercase text-slate-900">ইতিহাস</h2>
                <button onClick={() => setShowHistory(false)} className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 shadow-sm"><i className="fas fa-times text-xl"></i></button>
             </div>
             {archives.length > 0 ? (
               <div className="space-y-8">
                 {archives.map(arc => (
                   <div key={arc.id} className="p-8 bg-slate-50 rounded-[45px] border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                           <p className="text-[13px] text-indigo-600 uppercase font-black tracking-widest mb-1">{arc.monthName} {arc.year}</p>
                           <p className="text-slate-900 text-4xl font-black tracking-tighter mt-1">৳{arc.totalIncome - arc.totalExpense}</p>
                        </div>
                        <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-md border border-slate-50">
                          <i className="fas fa-calendar-alt text-blue-600 text-xl"></i>
                        </div>
                      </div>
                      <div className="flex gap-6 pt-6 border-t border-slate-200">
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-green-600 uppercase mb-1">আয়</p>
                          <p className="text-lg font-black text-slate-900 tracking-tight">৳{arc.totalIncome}</p>
                        </div>
                        <div className="w-px bg-slate-200 h-10 self-center"></div>
                        <div className="flex-1 text-right">
                          <p className="text-[10px] font-black text-rose-600 uppercase mb-1">ব্যয়</p>
                          <p className="text-lg font-black text-slate-900 tracking-tight">৳{arc.totalExpense}</p>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-32 bg-slate-50 rounded-[60px] border-2 border-dashed border-slate-100 mt-10">
                  <p className="text-slate-400 font-black uppercase text-[12px] tracking-[0.4em]">ইতিহাস খালি</p>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
