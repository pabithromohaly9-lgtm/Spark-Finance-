
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType, MonthlyArchive, Insight, FinancialSummary } from './types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_ICONS, formatCurrency } from './constants';
import { getFinancialInsights } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'future' | 'tools'>('home');
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
  const [splitAmount, setSplitAmount] = useState('');
  const [splitPeople, setSplitPeople] = useState('2');

  useEffect(() => {
    localStorage.setItem('spark_tx', JSON.stringify(transactions));
    localStorage.setItem('spark_archives', JSON.stringify(archives));
    localStorage.setItem('spark_budgets', JSON.stringify(budgets));
    if (profileImage) localStorage.setItem('spark_profile', profileImage);
  }, [transactions, archives, budgets, profileImage]);

  const summary = useMemo(() => {
    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const breakdown: Record<string, number> = {};
    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
      breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
    });
    return { income, expense, balance: income - expense, breakdown };
  }, [transactions]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const scrollPos = e.currentTarget.scrollTop;
    if (scrollPos > 40 && !isShrunk) setIsShrunk(true);
    if (scrollPos <= 40 && isShrunk) setIsShrunk(false);
  };

  const fetchAIAdvice = async () => {
    if (transactions.length === 0) {
      alert('পরামর্শ পেতে প্রথমে কিছু লেনদেন যোগ করুন।');
      return;
    }
    setLoadingAI(true);
    try {
      const finSummary: FinancialSummary = {
        totalIncome: summary.income,
        totalExpenses: summary.expense,
        balance: summary.balance,
        savings: summary.balance,
        previousMonthSavings: archives.length > 0 ? (archives[0].totalIncome - archives[0].totalExpense) : 0,
        categoryBreakdown: summary.breakdown,
        monthlyHistory: archives.slice(0, 5).map(a => ({
          month: a.monthName,
          income: a.totalIncome,
          expense: a.totalExpense
        }))
      };
      const results = await getFinancialInsights(transactions, finSummary);
      setInsights(results);
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setLoadingAI(false);
    }
  };

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

  const deleteTransaction = (id: string) => {
    if (window.confirm('লেনদেনটি মুছে ফেলতে চান?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const deleteAllData = () => {
    if (window.confirm('সব ডেটা মুছে ফেলতে চান?')) {
      setTransactions([]);
      setArchives([]);
      setInsights([]);
      localStorage.clear();
      setActiveTab('home');
    }
  };

  const handleQuickAdd = (value: number) => {
    if (amountInputRef.current) {
      const currentVal = parseFloat(amountInputRef.current.value) || 0;
      amountInputRef.current.value = (currentVal + value).toString();
      amountInputRef.current.focus();
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-slate-50 shadow-2xl flex flex-col font-sans relative overflow-hidden text-slate-900 border-x border-slate-100">
      
      {/* HEADER - STICKY TO PREVENT BUMPING */}
      <header className={`header-container bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative z-[60] shrink-0 ${isShrunk ? 'p-4 rounded-b-[20px] shadow-lg' : 'p-8 rounded-b-[40px] shadow-xl'}`}>
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
             {isShrunk && <h1 className="font-black text-white text-[18px] animate-fadeIn">স্পার্ক</h1>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBudgetSettings(true)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-all hover:bg-white/20"><i className="fas fa-bullseye text-[13px]"></i></button>
            <button onClick={() => setShowHistory(true)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center transition-all hover:bg-white/20"><i className="fas fa-history text-[13px]"></i></button>
          </div>
        </div>
        
        <div className="text-center transition-all">
            <p className={`text-indigo-100 font-bold uppercase tracking-widest ${isShrunk ? 'hidden' : 'text-[13px] mb-2 animate-fadeIn'}`}>বর্তমান ব্যালেন্স</p>
            <h2 className={`font-black tracking-tighter text-white ${isShrunk ? 'text-[28px]' : 'text-[44px]'}`}>{formatCurrency(summary.balance)}</h2>
            
            {!isShrunk && (
              <div className="mt-6 grid grid-cols-2 gap-4 animate-fadeIn">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-sm text-center">
                  <p className="text-[11px] uppercase font-bold text-indigo-200 mb-1 tracking-wider">মোট আয়</p>
                  <p className="text-[18px] font-black text-green-300">৳{summary.income}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-sm text-center">
                  <p className="text-[11px] uppercase font-bold text-indigo-200 mb-1 tracking-wider">মোট ব্যয়</p>
                  <p className="text-[18px] font-black text-rose-300">৳{summary.expense}</p>
                </div>
              </div>
            )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 scroll-smooth" onScroll={handleScroll}>
        {activeTab === 'home' ? (
          <div className="space-y-8 animate-fadeIn pb-32">
            
            {/* RECENT TRANSACTIONS */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-400 text-[13px] uppercase tracking-widest">সাম্প্রতিক লেনদেন</h3>
                <span className="text-[11px] bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-black">এই মাস</span>
              </div>
              
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 8).map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-[24px] shadow-sm flex items-center justify-between border border-slate-100 animate-slideUp group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${t.type === TransactionType.INCOME ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                          <i className={`fas ${CATEGORY_ICONS[t.category] || 'fa-tag'}`}></i>
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-black text-slate-800 text-[14px] truncate">{t.category}</p>
                          <p className="text-[11px] text-slate-400 font-bold uppercase truncate">{t.note || 'সাধারণ'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`font-black text-[15px] ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-800'}`}>
                          {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount}
                        </p>
                        <button onClick={() => deleteTransaction(t.id)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <i className="fas fa-trash-alt text-[11px]"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                   <p className="text-slate-400 font-black text-[12px] uppercase tracking-widest">কোনো লেনদেন নেই</p>
                </div>
              )}
            </div>

            {/* BUDGET TRACKER */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-400 text-[13px] uppercase tracking-widest">বাজেট ট্র্যাকার</h3>
                <button onClick={() => setShowBudgetSettings(true)} className="text-[11px] font-black text-indigo-600 uppercase tracking-tighter">বাজেট সেট</button>
              </div>
              
              <div className="space-y-3">
                {EXPENSE_CATEGORIES.map(cat => {
                  const spent = summary.breakdown[cat] || 0;
                  const budget = budgets[cat] || 0;
                  if (budget === 0 && spent === 0) return null;
                  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                  return (
                    <div key={cat} className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <i className={`fas ${CATEGORY_ICONS[cat]} text-slate-400 text-[14px]`}></i>
                          <p className="font-black text-slate-800 text-[14px]">{cat}</p>
                        </div>
                        <p className="text-[12px] font-black">৳{spent} <span className="text-slate-300">/ ৳{budget}</span></p>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${spent > budget ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : activeTab === 'future' ? (
          <div className="space-y-8 animate-fadeIn pb-32">
             <div className="p-10 bg-slate-900 rounded-[40px] text-white relative overflow-hidden shadow-2xl">
               <h3 className="text-[24px] font-black mb-1">এআই পরামর্শ</h3>
               <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest mb-10">স্মার্ট কোচ</p>
               <button onClick={fetchAIAdvice} disabled={loadingAI} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-[12px] tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                 {loadingAI ? <><i className="fas fa-spinner animate-spin mr-2"></i> লোডিং...</> : <><i className="fas fa-wand-magic-sparkles mr-2"></i> পরামর্শ নিন</>}
               </button>
             </div>
             {insights.map((insight, idx) => (
               <div key={idx} className={`p-6 rounded-[30px] border flex gap-4 animate-slideUp shadow-sm ${insight.type === 'success' ? 'bg-green-50/50 border-green-100' : 'bg-blue-50/50 border-blue-100'}`}>
                 <div className="flex-1">
                   <h4 className="font-black text-slate-800 text-[15px] mb-1">{insight.title}</h4>
                   <p className="text-slate-600 text-[13px] font-bold leading-relaxed">{insight.description}</p>
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn pb-32">
             <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
               <h3 className="font-black text-slate-800 uppercase text-[13px] tracking-widest">বিল স্প্লিটার</h3>
               <div className="space-y-4">
                 <input type="number" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} placeholder="৳ মোট টাকা" className="w-full p-5 bg-slate-50 rounded-[20px] font-black text-slate-900 outline-none border-none shadow-inner" />
                 <input type="number" value={splitPeople} onChange={(e) => setSplitPeople(e.target.value)} placeholder="মানুষের সংখ্যা" className="w-full p-5 bg-slate-50 rounded-[20px] font-black text-slate-900 outline-none border-none shadow-inner" />
               </div>
               <div className="p-8 bg-indigo-600 rounded-[30px] text-center shadow-lg">
                 <p className="text-[11px] font-bold text-indigo-100 uppercase mb-2">মাথা পিছু খরচ</p>
                 <p className="text-[32px] font-black text-white tracking-tighter">৳ {splitAmount && splitPeople ? (parseFloat(splitAmount) / parseInt(splitPeople)).toFixed(0) : '০'}</p>
               </div>
             </div>
             <div className="bg-rose-50 p-8 rounded-[40px] border border-rose-100 shadow-sm">
               <button onClick={deleteAllData} className="w-full py-5 bg-rose-600 text-white rounded-[22px] font-black uppercase text-[12px] tracking-widest active:scale-95 shadow-lg shadow-rose-200"><i className="fas fa-trash-can mr-2"></i> সব ডেটা মুছুন</button>
             </div>
          </div>
        )}
      </main>

      {/* FLOATING ACTION BUTTON - SMALLER */}
      <div className="fixed bottom-20 right-6 z-[100]">
        {showAddMenu && (
          <div className="flex flex-col gap-3 mb-4 animate-slideUp items-end">
            <button onClick={() => { setModalType(TransactionType.INCOME); setShowAddMenu(false); }} className="bg-green-600 text-white px-5 py-3 rounded-[18px] font-black text-[12px] uppercase tracking-widest shadow-xl border-none">
              <i className="fas fa-arrow-up mr-2"></i> আয়
            </button>
            <button onClick={() => { setModalType(TransactionType.EXPENSE); setShowAddMenu(false); }} className="bg-rose-600 text-white px-5 py-3 rounded-[18px] font-black text-[12px] uppercase tracking-widest shadow-xl border-none">
              <i className="fas fa-arrow-down mr-2"></i> ব্যয়
            </button>
          </div>
        )}
        <button onClick={() => setShowAddMenu(!showAddMenu)} className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl shadow-lg transition-all active:scale-90 border-none ${showAddMenu ? 'bg-slate-800 rotate-45' : 'bg-indigo-600'}`}>
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {/* BOTTOM NAVIGATION - COMPACT */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 px-8 py-2.5 flex justify-between items-center z-[150] shadow-2xl">
        <button onClick={() => setActiveTab('home')} className={`flex-1 flex flex-col items-center border-none bg-transparent ${activeTab === 'home' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className="fas fa-house-chimney text-[18px]"></i>
          <span className="text-[9px] font-black uppercase mt-1">হোম</span>
        </button>
        <button onClick={() => setActiveTab('future')} className={`flex-1 flex flex-col items-center border-none bg-transparent ${activeTab === 'future' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className="fas fa-rocket text-[18px]"></i>
          <span className="text-[9px] font-black uppercase mt-1">এআই</span>
        </button>
        <button onClick={() => setActiveTab('tools')} className={`flex-1 flex flex-col items-center border-none bg-transparent ${activeTab === 'tools' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className="fas fa-layer-group text-[18px]"></i>
          <span className="text-[9px] font-black uppercase mt-1">টুলস</span>
        </button>
      </nav>

      {/* TRANSACTION MODAL */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-[340px] rounded-[35px] overflow-hidden shadow-2xl border-none flex flex-col animate-slideUp">
            <div className="flex justify-between items-center px-8 pt-8">
              <h2 className="text-[18px] font-black text-slate-800">{modalType === TransactionType.INCOME ? 'আয় যোগ' : 'ব্যয় যোগ'}</h2>
              <button onClick={() => setModalType(null)} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border-none"><i className="fas fa-times text-[10px]"></i></button>
            </div>
            <form onSubmit={addTransaction} className="px-8 pb-10 pt-4 space-y-6">
              <div className="text-center relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[20px] font-black text-slate-300">৳</span>
                <input ref={amountInputRef} type="number" name="amount" required placeholder="0" autoFocus className="w-full text-[36px] font-black text-center outline-none text-slate-900 bg-transparent border-none" />
              </div>
              <div className="space-y-4">
                <select name="category" className="w-full py-4 px-6 bg-slate-50 rounded-[20px] font-black text-slate-800 outline-none border-none shadow-inner appearance-none text-center">
                  {(modalType === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="text" name="note" placeholder="নোট..." className="w-full py-4 px-6 bg-slate-50 rounded-[20px] font-black text-slate-800 outline-none border-none shadow-inner text-center" />
              </div>
              <div className="flex justify-center gap-2">
                {[500, 1000, 2000].map(val => (
                  <button key={val} type="button" onClick={() => handleQuickAdd(val)} className="px-3 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-500 border-none active:scale-90 shadow-sm">+ {val}</button>
                ))}
              </div>
              <button type="submit" className={`w-full py-5 rounded-[22px] text-white font-black uppercase text-[13px] tracking-widest shadow-xl border-none active:scale-95 ${modalType === TransactionType.INCOME ? 'bg-green-600 shadow-green-500/20' : 'bg-rose-600 shadow-rose-500/20'}`}>নিশ্চিত করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* BUDGET SETTINGS MODAL */}
      {showBudgetSettings && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 animate-slideUp overflow-y-auto max-h-[80vh] custom-scrollbar border-none">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-[18px] font-black text-slate-900 uppercase">বাজেট লক্ষ্য</h2>
                <button onClick={() => setShowBudgetSettings(false)} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center border-none"><i className="fas fa-times"></i></button>
             </div>
             <div className="space-y-6 mb-8">
                {EXPENSE_CATEGORIES.map(cat => (
                  <div key={cat} className="flex flex-col gap-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-3"><i className={`fas ${CATEGORY_ICONS[cat]}`}></i> {cat}</label>
                    <input type="number" value={budgets[cat] || ''} onChange={(e) => setBudgets({ ...budgets, [cat]: parseFloat(e.target.value) || 0 })} placeholder="৳ মাসিক বাজেট" className="w-full p-4 bg-slate-50 rounded-[18px] font-black outline-none border-none shadow-inner" />
                  </div>
                ))}
             </div>
             <button onClick={() => setShowBudgetSettings(false)} className="w-full py-5 bg-indigo-600 text-white rounded-[22px] font-black uppercase text-[12px] tracking-widest shadow-xl border-none mb-4">সংরক্ষণ করুন</button>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex flex-col">
          <div className="bg-white flex-1 mt-20 rounded-t-[40px] p-8 overflow-y-auto animate-slideUp border-none">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-[18px] font-black text-slate-900 uppercase">ইতিহাস</h2>
                <button onClick={() => setShowHistory(false)} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center border-none"><i className="fas fa-times"></i></button>
             </div>
             {archives.length > 0 ? (
               <div className="space-y-5">
                 {archives.map(arc => (
                   <div key={arc.id} className="p-6 bg-slate-50 rounded-[28px] shadow-sm">
                      <p className="text-[11px] text-indigo-600 uppercase font-black mb-1">{arc.monthName} {arc.year}</p>
                      <p className="text-slate-900 text-[20px] font-black">{formatCurrency(arc.totalIncome - arc.totalExpense)}</p>
                      <div className="flex gap-4 mt-4 pt-4 border-t border-slate-200 text-[12px] font-black">
                        <span className="text-green-600">আয়: ৳{arc.totalIncome}</span>
                        <span className="text-rose-600">ব্যয়: ৳{arc.totalExpense}</span>
                      </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-20 text-slate-400 font-black uppercase text-[12px]">ইতিহাস খালি</div>
             )}
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
