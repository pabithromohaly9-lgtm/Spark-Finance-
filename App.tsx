
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType, MonthlyArchive, Insight, FinancialSummary } from './types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_ICONS, formatCurrency } from './constants';
import { getFinancialInsights } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'future' | 'tools'>('home');
  const [isShrunk, setIsShrunk] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(() => localStorage.getItem('spark_profile'));
  const mainRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('spark_tx');
    return saved ? JSON.parse(saved) : [];
  });

  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('spark_budgets');
    return saved ? JSON.parse(saved) : {};
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
    if (scrollPos > 30 && !isShrunk) setIsShrunk(true);
    if (scrollPos <= 30 && isShrunk) setIsShrunk(false);
  };

  const fetchAIAdvice = async () => {
    if (transactions.length === 0) return;
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
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
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

  const handleQuickAdd = (value: number) => {
    if (amountInputRef.current) {
      const currentVal = parseFloat(amountInputRef.current.value) || 0;
      amountInputRef.current.value = (currentVal + value).toString();
      amountInputRef.current.focus();
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-slate-50 shadow-2xl flex flex-col font-sans relative overflow-hidden text-slate-900 border-x border-slate-100">
      
      {/* HEADER SECTION */}
      <header className={`bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative z-[60] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isShrunk ? 'p-4 rounded-b-[24px] shadow-lg' : 'p-8 rounded-b-[45px] shadow-xl'}`}>
        <div className={`flex justify-between items-center transition-all ${isShrunk ? 'mb-2' : 'mb-8'}`}>
          <div className="flex items-center gap-3">
             <div className={`bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center relative overflow-hidden border border-white/20 transition-all ${isShrunk ? 'w-8 h-8' : 'w-12 h-12'}`}>
                {profileImage ? <img src={profileImage} className="w-full h-full object-cover" /> : <i className={`fas fa-user-circle ${isShrunk ? 'text-sm' : 'text-xl'}`}></i>}
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
                <h1 className={`font-black uppercase tracking-tight text-white transition-all ${isShrunk ? 'text-[14px]' : 'text-[22px]'}`}>স্পার্ক</h1>
                {!isShrunk && <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest opacity-80">পার্সোনাল ফিন্যান্স</p>}
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBudgetSettings(true)} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border-none transition-hover hover:bg-white/20"><i className="fas fa-bullseye text-[12px]"></i></button>
            <button onClick={() => setShowHistory(true)} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border-none transition-hover hover:bg-white/20"><i className="fas fa-history text-[12px]"></i></button>
          </div>
        </div>
        
        <div className="text-center">
            <p className={`text-indigo-100 font-black uppercase transition-all tracking-widest ${isShrunk ? 'text-[8px] opacity-70 mb-0.5' : 'text-[10px] mb-2'}`}>বর্তমান ব্যালেন্স</p>
            <h2 className={`font-black tracking-tighter text-white transition-all ${isShrunk ? 'text-[24px]' : 'text-[44px]'}`}>{formatCurrency(summary.balance)}</h2>
            
            {!isShrunk && (
              <div className="mt-8 grid grid-cols-2 gap-3 animate-fadeIn">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                  <p className="text-[9px] uppercase font-black text-indigo-200 mb-1">মোট আয়</p>
                  <p className="text-[17px] font-black text-green-300">৳{summary.income}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                  <p className="text-[9px] uppercase font-black text-indigo-200 mb-1">মোট ব্যয়</p>
                  <p className="text-[17px] font-black text-rose-300">৳{summary.expense}</p>
                </div>
              </div>
            )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main ref={mainRef} className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8" onScroll={handleScroll}>
        {activeTab === 'home' ? (
          <div className="space-y-8 animate-fadeIn pb-32">
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-400 text-[11px] uppercase tracking-widest">সাম্প্রতিক লেনদেন</h3>
                <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-black uppercase tracking-tighter">এই মাস</span>
              </div>
              
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map(t => (
                    <div key={t.id} className="bg-white p-4.5 rounded-[28px] shadow-sm flex items-center justify-between border border-slate-100/50 animate-slideUp group hover:border-indigo-100 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm ${t.type === TransactionType.INCOME ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                          <i className={`fas ${CATEGORY_ICONS[t.category] || 'fa-tag'}`}></i>
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-[14px]">{t.category}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{t.note || 'সাধারণ লেনদেন'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`font-black text-[15px] ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-800'}`}>
                          {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount}
                        </p>
                        <button onClick={() => deleteTransaction(t.id)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all border-none opacity-0 group-hover:opacity-100">
                          <i className="fas fa-trash-alt text-[11px]"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center gap-4 animate-fadeIn">
                   <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 text-3xl">
                     <i className="fas fa-receipt"></i>
                   </div>
                   <p className="text-slate-400 font-black text-[11px] uppercase tracking-widest">এখনো কোনো লেনদেন নেই</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'future' ? (
          <div className="space-y-8 animate-fadeIn pb-32">
             <div className="p-8 bg-slate-900 rounded-[40px] text-white relative overflow-hidden shadow-xl">
               <h3 className="text-[22px] font-black mb-1">এআই পরামর্শ</h3>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-8">স্মার্ট ফিন্যান্সিয়াল কোচ</p>
               <button onClick={fetchAIAdvice} disabled={loadingAI} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all active:scale-95 border-none shadow-lg shadow-indigo-500/20">
                 {loadingAI ? <><i className="fas fa-spinner animate-spin"></i> প্রসেসিং...</> : <><i className="fas fa-wand-magic-sparkles"></i> পরামর্শ নিন</>}
               </button>
               <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
             </div>
             {insights.map((insight, idx) => (
               <div key={idx} className={`p-6 rounded-[32px] border flex gap-4 animate-slideUp ${insight.type === 'success' ? 'bg-green-50/50 border-green-100' : insight.type === 'warning' ? 'bg-rose-50/50 border-rose-100' : 'bg-blue-50/50 border-blue-100'}`}>
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm flex-shrink-0 ${insight.type === 'success' ? 'bg-green-500 text-white' : insight.type === 'warning' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}`}>
                   <i className={`fas ${insight.type === 'success' ? 'fa-check' : insight.type === 'warning' ? 'fa-exclamation' : 'fa-info'}`}></i>
                 </div>
                 <div>
                   <h4 className="font-black text-slate-800 text-[14px] mb-1">{insight.title}</h4>
                   <p className="text-slate-600 text-[12px] font-bold leading-relaxed">{insight.description}</p>
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn pb-32">
             <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
               <h3 className="font-black text-slate-800 uppercase text-[12px] tracking-widest"><i className="fas fa-calculator mr-2 text-indigo-600"></i> বিল স্প্লিটার</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">মোট টাকা</p>
                   <input type="number" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} placeholder="৳ ০" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 outline-none focus:border-indigo-600 transition-all border-none shadow-inner" />
                 </div>
                 <div className="space-y-2">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">মানুষ সংখ্যা</p>
                   <input type="number" value={splitPeople} onChange={(e) => setSplitPeople(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 outline-none focus:border-indigo-600 transition-all border-none shadow-inner" />
                 </div>
               </div>
               <div className="p-8 bg-indigo-600 rounded-[30px] text-center shadow-lg">
                 <p className="text-[10px] font-black text-indigo-100 uppercase mb-2 tracking-widest">প্রতি জনের ভাগ</p>
                 <p className="text-[36px] font-black text-white">৳ {splitAmount && splitPeople ? (parseFloat(splitAmount) / parseInt(splitPeople)).toFixed(0) : '০'}</p>
               </div>
             </div>
          </div>
        )}
      </main>

      {/* FLOATING ACTION BUTTON - REPLACES BIG BUTTONS */}
      <div className="fixed bottom-24 right-6 z-[100]">
        {showAddMenu && (
          <div className="flex flex-col gap-3 mb-4 animate-slideUp items-end">
            <button onClick={() => { setModalType(TransactionType.INCOME); setShowAddMenu(false); }} className="flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl active:scale-95 border-none">
              <i className="fas fa-arrow-up"></i> আয় যোগ
            </button>
            <button onClick={() => { setModalType(TransactionType.EXPENSE); setShowAddMenu(false); }} className="flex items-center gap-3 bg-rose-600 text-white px-5 py-3 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl active:scale-95 border-none">
              <i className="fas fa-arrow-down"></i> ব্যয় যোগ
            </button>
          </div>
        )}
        <button onClick={() => setShowAddMenu(!showAddMenu)} className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl shadow-[0_15px_30px_-5px_rgba(79,70,229,0.5)] transition-all active:scale-90 border-none ${showAddMenu ? 'bg-slate-800 rotate-45' : 'bg-indigo-600'}`}>
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 py-4 flex justify-between items-center z-[150] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('home')} className={`flex-1 flex flex-col items-center py-1 border-none bg-transparent transition-all ${activeTab === 'home' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className={`fas fa-house-chimney text-lg mb-1.5 ${activeTab === 'home' ? 'scale-110' : ''}`}></i>
          <span className="text-[9px] font-black uppercase tracking-widest">হোম</span>
        </button>
        <button onClick={() => setActiveTab('future')} className={`flex-1 flex flex-col items-center py-1 border-none bg-transparent transition-all ${activeTab === 'future' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className={`fas fa-rocket text-lg mb-1.5 ${activeTab === 'future' ? 'scale-110' : ''}`}></i>
          <span className="text-[9px] font-black uppercase tracking-widest">এআই</span>
        </button>
        <button onClick={() => setActiveTab('tools')} className={`flex-1 flex flex-col items-center py-1 border-none bg-transparent transition-all ${activeTab === 'tools' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className={`fas fa-layer-group text-lg mb-1.5 ${activeTab === 'tools' ? 'scale-110' : ''}`}></i>
          <span className="text-[9px] font-black uppercase tracking-widest">টুলস</span>
        </button>
      </nav>

      {/* SMART COMPACT TRANSACTION POPUP */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-8 animate-fadeIn">
          <div className="bg-white w-full max-w-[310px] rounded-[35px] overflow-hidden shadow-2xl border-none flex flex-col animate-scaleIn">
            
            <div className="flex justify-between items-center px-6 pt-6 pb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${modalType === TransactionType.INCOME ? 'bg-green-500' : 'bg-rose-500'}`}></div>
                <h2 className="text-[16px] font-black text-slate-800 tracking-tight">{modalType === TransactionType.INCOME ? 'টাকা যোগ' : 'খরচ যোগ'}</h2>
              </div>
              <button onClick={() => setModalType(null)} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all border-none">
                <i className="fas fa-times text-[10px]"></i>
              </button>
            </div>
            
            <form onSubmit={addTransaction} className="px-6 pb-7 space-y-4">
              {/* COMPACT AMOUNT INPUT */}
              <div className="relative py-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[24px] font-black text-slate-300 select-none">৳</span>
                  <input 
                    ref={amountInputRef}
                    type="number" 
                    name="amount" 
                    required 
                    placeholder="0" 
                    autoFocus 
                    className="w-full text-[42px] font-black text-center outline-none text-slate-900 bg-transparent tracking-tighter border-none placeholder:text-slate-100" 
                  />
                </div>
                <div className="h-[2px] w-1/2 mx-auto bg-slate-100 mt-1 relative overflow-hidden rounded-full">
                  <div className="absolute inset-0 bg-indigo-600 transition-all w-full"></div>
                </div>
              </div>
              
              {/* THICKER & MORE VISIBLE INPUT FIELDS */}
              <div className="space-y-3">
                <div className="relative">
                  <select name="category" className="w-full py-4.5 px-4 bg-slate-50 border border-slate-100 rounded-[22px] font-black text-[14px] text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 appearance-none text-center shadow-sm transition-all border-none">
                    {(modalType === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><i className="fas fa-chevron-down text-[10px]"></i></div>
                </div>

                <input 
                  type="text" 
                  name="note" 
                  placeholder="নোট (যেমন: বেতন, বাজার...)" 
                  className="w-full py-4.5 px-4 bg-slate-50 border border-slate-100 rounded-[22px] font-black text-[14px] text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 text-center shadow-sm placeholder:text-slate-300 transition-all border-none" 
                />
              </div>

              {/* Quick Pills */}
              <div className="flex justify-center gap-1.5">
                {[500, 1000, 2000].map(val => (
                  <button key={val} type="button" onClick={() => handleQuickAdd(val)} className="px-3 py-2 bg-slate-50 rounded-full text-[10px] font-black text-slate-500 hover:bg-slate-100 transition-all border-none active:scale-90 shadow-sm">+ {val}</button>
                ))}
              </div>
              
              <button type="submit" className={`w-full py-5 mt-2 rounded-2xl text-white font-black text-[14px] uppercase tracking-[0.2em] shadow-lg transition-all border-none active:scale-95 ${modalType === TransactionType.INCOME ? 'bg-green-600' : 'bg-rose-600'}`}>
                নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex flex-col">
          <div className="bg-white flex-1 mt-20 rounded-t-[50px] p-9 overflow-y-auto animate-slideUp shadow-2xl custom-scrollbar border-none">
             <div className="flex justify-between items-center mb-10">
                <h2 className="text-[20px] font-black text-slate-900 tracking-widest uppercase">ইতিহাস</h2>
                <button onClick={() => setShowHistory(false)} className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 border-none"><i className="fas fa-times"></i></button>
             </div>
             {archives.length > 0 ? (
               <div className="space-y-6">
                 {archives.map(arc => (
                   <div key={arc.id} className="p-6 bg-slate-50 rounded-[35px] border-none">
                      <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mb-1">{arc.monthName} {arc.year}</p>
                      <p className="text-slate-900 text-[24px] font-black tracking-tighter">{formatCurrency(arc.totalIncome - arc.totalExpense)}</p>
                      <div className="flex gap-4 pt-4 mt-4 border-t border-slate-200">
                        <div className="flex-1"><p className="text-[8px] font-black text-green-600 uppercase">আয়</p><p className="text-[12px] font-black">৳{arc.totalIncome}</p></div>
                        <div className="flex-1 text-right"><p className="text-[8px] font-black text-rose-600 uppercase">ব্যয়</p><p className="text-[12px] font-black">৳{arc.totalExpense}</p></div>
                      </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-20 text-slate-400 font-black uppercase text-[10px] tracking-widest">ইতিহাস খালি</div>
             )}
          </div>
        </div>
      )}

      {/* BUDGET SETTINGS */}
      {showBudgetSettings && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[50px] p-9 animate-slideUp shadow-2xl overflow-y-auto max-h-[85vh] custom-scrollbar border-none">
             <div className="flex justify-between items-center mb-10">
                <h2 className="text-[20px] font-black text-slate-900 tracking-widest uppercase">বাজেট লক্ষ্য</h2>
                <button onClick={() => setShowBudgetSettings(false)} className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 border-none"><i className="fas fa-times"></i></button>
             </div>
             <div className="space-y-4 mb-8">
                {EXPENSE_CATEGORIES.map(cat => (
                  <div key={cat} className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">{cat}</label>
                    <input type="number" value={budgets[cat] || ''} onChange={(e) => setBudgets({ ...budgets, [cat]: parseFloat(e.target.value) || 0 })} placeholder="৳ বাজেট দিন" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-[14px] outline-none focus:border-indigo-600 border-none shadow-inner" />
                  </div>
                ))}
             </div>
             <button onClick={() => setShowBudgetSettings(false)} className="w-full py-5 bg-indigo-700 text-white rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl border-none active:scale-95 transition-all">সংরক্ষণ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
