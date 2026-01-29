
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

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

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
    if (scrollPos > 20 && !isShrunk) setIsShrunk(true);
    if (scrollPos <= 20 && isShrunk) setIsShrunk(false);
  };

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
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: modalType!,
      amount,
      category: formData.get('category') as string,
      note: (formData.get('note') as string) || '',
      date: new Date().toISOString()
    };
    setTransactions(prev => [newTx, ...prev]);
    setModalType(null);
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const deleteTransaction = (id: string) => {
    if (window.confirm('আপনি কি এই লেনদেনটি মুছে ফেলতে চান?')) {
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
    <div className="max-w-md mx-auto h-screen bg-[#f8fafc] shadow-2xl flex flex-col font-sans relative overflow-hidden text-slate-900">
      <header className={`bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 text-white shadow-2xl relative z-20 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[padding,border-radius] ${isShrunk ? 'p-4 rounded-b-[24px]' : 'p-7 rounded-b-[45px]'}`}>
        <div className={`flex justify-between items-center transition-all duration-500 ${isShrunk ? 'mb-1' : 'mb-6'}`}>
          <div className="flex items-center gap-3">
             <div className={`bg-white/20 rounded-2xl flex items-center justify-center relative overflow-hidden border border-white/30 shadow-lg backdrop-blur-md transition-all duration-500 ${isShrunk ? 'w-8 h-8' : 'w-12 h-12'}`}>
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <i className={`fas fa-user-circle text-white transition-all ${isShrunk ? 'text-base' : 'text-2xl'}`}></i>
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
             <div className={`${isShrunk ? 'flex items-center gap-2' : ''}`}>
                <h1 className={`font-black uppercase tracking-tight text-white transition-all duration-500 ${isShrunk ? 'text-[14px]' : 'text-[21px]'}`}>স্পার্ক</h1>
                <p className={`font-black text-indigo-200 uppercase tracking-widest opacity-80 transition-all ${isShrunk ? 'hidden' : 'text-[9.5px] mt-0.5'}`}>স্মার্ট ওয়ালেট</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBudgetSettings(true)} className={`bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md text-white border-none ${isShrunk ? 'w-8 h-8' : 'w-10 h-10'}`}>
              <i className="fas fa-bullseye text-[12px]"></i>
            </button>
            <button onClick={() => setShowHistory(true)} className={`bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md text-white border-none ${isShrunk ? 'w-8 h-8' : 'w-10 h-10'}`}>
              <i className="fas fa-history text-[12px]"></i>
            </button>
          </div>
        </div>
        
        <div className={`text-center transition-all duration-500 ${isShrunk ? 'flex flex-row items-center justify-between px-1' : 'py-1'}`}>
          <div className={`${isShrunk ? 'flex items-baseline gap-2' : ''}`}>
            <p className={`text-indigo-100 font-black uppercase transition-all duration-500 ${isShrunk ? 'text-[8px] tracking-[0.1em]' : 'text-[10px] tracking-[0.3em] mb-2 opacity-90'}`}>বর্তমান ব্যালেন্স</p>
            <h2 className={`font-black tracking-tighter drop-shadow-lg text-white transition-all duration-500 ${isShrunk ? 'text-[20px]' : 'text-[38px] mb-8'}`}>{formatCurrency(summary.balance)}</h2>
          </div>
          
          {!isShrunk && (
            <div className="max-h-[200px] opacity-100 grid grid-cols-2 gap-3 transition-all duration-500">
              <div className="bg-white/10 backdrop-blur-xl p-3.5 rounded-[24px] border border-white/20 shadow-sm">
                <p className="text-[9px] uppercase font-black text-indigo-200 mb-1">মোট আয়</p>
                <p className="text-[19px] font-black text-green-300">৳{summary.income}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl p-3.5 rounded-[24px] border border-white/20 shadow-sm">
                <p className="text-[9px] uppercase font-black text-indigo-200 mb-1">মোট ব্যয়</p>
                <p className="text-[19px] font-black text-rose-300">৳{summary.expense}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8" onScroll={handleScroll}>
        {activeTab === 'home' ? (
          <div className="space-y-10 animate-fadeIn">
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setModalType(TransactionType.INCOME)} className="relative overflow-hidden p-6 bg-white border border-slate-100 rounded-[35px] flex flex-col items-center gap-3 transition-all hover:shadow-2xl hover:-translate-y-1 active:scale-95 group border-none">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-[22px] flex items-center justify-center text-[25px] shadow-lg shadow-green-100 relative z-10">
                  <i className="fas fa-plus"></i>
                </div>
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-[0.15em] relative z-10">টাকা যোগ</span>
              </button>
              
              <button onClick={() => setModalType(TransactionType.EXPENSE)} className="relative overflow-hidden p-6 bg-white border border-slate-100 rounded-[35px] flex flex-col items-center gap-3 transition-all hover:shadow-2xl hover:-translate-y-1 active:scale-95 group border-none">
                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-[22px] flex items-center justify-center text-[25px] shadow-lg shadow-rose-100 relative z-10">
                  <i className="fas fa-minus"></i>
                </div>
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-[0.15em] relative z-10">খরচ যোগ</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em] opacity-60">সাম্প্রতিক লেনদেন</h3>
              </div>
              {transactions.length > 0 ? (
                <div className="space-y-3 pb-24">
                  {transactions.map(t => (
                    <div key={t.id} className="bg-white border border-slate-100 p-4 rounded-[28px] shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-colors border-none animate-fadeIn">
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-[19px] ${t.type === TransactionType.INCOME ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                          <i className={`fas ${CATEGORY_ICONS[t.category] || 'fa-tag'}`}></i>
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-[14px]">{t.category}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase">{t.note || 'সাধারণ'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`font-black text-[14px] ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-800'}`}>
                          {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount}
                        </p>
                        <button onClick={() => deleteTransaction(t.id)} className="w-9 h-9 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90 border-none">
                          <i className="fas fa-trash-alt text-[12px]"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-[40px] border border-dashed border-slate-200">
                  <i className="fas fa-receipt text-slate-200 text-[32px] mb-3"></i>
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">খালি তালিকা</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'future' ? (
          <div className="space-y-8 animate-fadeIn pb-24">
             <div className="p-9 bg-slate-900 rounded-[45px] text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-[25px] font-black mb-2 text-white">ভবিষ্যৎ সঞ্চয়</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-10 opacity-70">এআই এর মাধ্যমে আর্থিক পূর্বাভাস</p>
                <button onClick={fetchAIAdvice} disabled={loadingAI} className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-[22px] font-black uppercase text-[10px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border-none">
                  {loadingAI ? <><i className="fas fa-spinner animate-spin"></i> প্রসেসিং...</> : <><i className="fas fa-wand-magic-sparkles"></i> পরামর্শ নিন</>}
                </button>
              </div>
              <div className="absolute -right-16 -bottom-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl"></div>
            </div>
            {insights.map((insight, idx) => (
              <div key={idx} className={`p-6 rounded-[35px] border ${insight.type === 'success' ? 'bg-green-50 border-green-100' : insight.type === 'warning' ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100'} animate-fadeIn`}>
                <div className="flex gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-[21px] shadow-sm ${insight.type === 'success' ? 'bg-green-500 text-white' : insight.type === 'warning' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}`}>
                    <i className={`fas ${insight.type === 'success' ? 'fa-check-circle' : insight.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}></i>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-[14px] mb-1">{insight.title}</h4>
                    <p className="text-slate-600 text-[12px] font-bold leading-relaxed">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn pb-24">
             <div className="bg-white p-9 rounded-[45px] border border-slate-100 shadow-sm space-y-7 border-none">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-[21px] shadow-lg shadow-indigo-100"><i className="fas fa-calculator text-white"></i></div>
                <h3 className="font-black text-slate-900 uppercase text-[12px] tracking-widest">বিল স্প্লিটার</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">মোট টাকা</p>
                   <input type="number" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} placeholder="৳ ০" className="w-full p-4.5 bg-slate-50 border border-slate-200 rounded-[22px] font-black text-slate-900 outline-none focus:border-indigo-600 transition-all shadow-inner text-center border-none" />
                </div>
                <div className="space-y-1.5">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">মানুষের সংখ্যা</p>
                   <input type="number" value={splitPeople} onChange={(e) => setSplitPeople(e.target.value)} className="w-full p-4.5 bg-slate-50 border border-slate-200 rounded-[22px) font-black text-slate-900 outline-none focus:border-indigo-600 transition-all shadow-inner text-center border-none" />
                </div>
              </div>
              <div className="p-9 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[35px] text-center shadow-lg relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-indigo-100 uppercase mb-2 tracking-widest">প্রতি জনের ভাগ</p>
                  <p className="text-[44px] font-black text-white">৳ {splitAmount && splitPeople ? (parseFloat(splitAmount) / parseInt(splitPeople)).toFixed(0) : '০'}</p>
                </div>
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-2.5 flex justify-between items-center z-[100] shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.08)]">
        <button onClick={() => setActiveTab('home')} className="flex-1 flex flex-col items-center justify-center gap-1 py-1 border-none bg-transparent group">
          <div className={`w-14 h-9 flex items-center justify-center rounded-[18px] transition-all duration-400 ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-transparent text-slate-400'}`}>
            <i className={`fas fa-house-chimney ${activeTab === 'home' ? 'text-[16px]' : 'text-[18px]'}`}></i>
          </div>
          <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-colors ${activeTab === 'home' ? 'text-indigo-600' : 'text-slate-400 opacity-60'}`}>হোম</span>
        </button>
        <button onClick={() => setActiveTab('future')} className="flex-1 flex flex-col items-center justify-center gap-1 py-1 border-none bg-transparent group">
          <div className={`w-14 h-9 flex items-center justify-center rounded-[18px] transition-all duration-400 ${activeTab === 'future' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-transparent text-slate-400'}`}>
            <i className={`fas fa-rocket ${activeTab === 'future' ? 'text-[16px]' : 'text-[18px]'}`}></i>
          </div>
          <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-colors ${activeTab === 'future' ? 'text-indigo-600' : 'text-slate-400 opacity-60'}`}>এআই</span>
        </button>
        <button onClick={() => setActiveTab('tools')} className="flex-1 flex flex-col items-center justify-center gap-1 py-1 border-none bg-transparent group">
          <div className={`w-14 h-9 flex items-center justify-center rounded-[18px] transition-all duration-400 ${activeTab === 'tools' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-transparent text-slate-400'}`}>
            <i className={`fas fa-layer-group ${activeTab === 'tools' ? 'text-[16px]' : 'text-[18px]'}`}></i>
          </div>
          <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-colors ${activeTab === 'tools' ? 'text-indigo-600' : 'text-slate-400 opacity-60'}`}>টুলস</span>
        </button>
      </nav>

      {/* NEW SMART COMPACT POPUP - REBUILT FROM SCRATCH */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-8 animate-fadeIn">
          <div className="bg-white w-full max-w-[310px] rounded-[32px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border-none flex flex-col animate-slideUp">
            
            {/* Minimal Popup Header */}
            <div className="flex justify-between items-center px-6 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${modalType === TransactionType.INCOME ? 'bg-green-500' : 'bg-rose-500'}`}></div>
                <h2 className="text-[15px] font-black text-slate-800 tracking-tight">{modalType === TransactionType.INCOME ? 'টাকা যোগ' : 'খরচ যোগ'}</h2>
              </div>
              <button onClick={() => setModalType(null)} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all border-none">
                <i className="fas fa-times text-[10px]"></i>
              </button>
            </div>
            
            <form onSubmit={addTransaction} className="px-6 pb-6 space-y-4">
              {/* COMPACT & BALANCED AMOUNT INPUT */}
              <div className="relative w-full py-2">
                <div className="flex items-center justify-center gap-1.5">
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
                {/* Slim Animated Line */}
                <div className="h-[2px] w-full bg-slate-100 mt-1 relative overflow-hidden rounded-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00cec9] to-[#00b894] transition-all duration-500 w-full"></div>
                </div>
              </div>
              
              {/* THICKER & MORE VISIBLE INPUT FIELDS */}
              <div className="space-y-3">
                <div className="relative">
                  <select name="category" className="w-full py-4.5 px-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold text-[14px] text-slate-800 outline-none focus:bg-white focus:border-[#00cec9] appearance-none text-center shadow-sm transition-all">
                    {(modalType === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><i className="fas fa-chevron-down text-[10px]"></i></div>
                </div>

                <input 
                  type="text" 
                  name="note" 
                  placeholder="নোট (যেমন: বেতন, বাজার...)" 
                  className="w-full py-4.5 px-4 bg-slate-50 border border-slate-100 rounded-[20px] font-bold text-[14px] text-slate-800 outline-none focus:bg-white focus:border-[#00cec9] text-center shadow-sm placeholder:text-slate-300 transition-all" 
                />
              </div>

              {/* Quick Amount Pills */}
              <div className="flex justify-center gap-1.5 flex-wrap">
                {[500, 1000, 2000].map(val => (
                  <button key={val} type="button" onClick={() => handleQuickAdd(val)} className="px-3 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-500 hover:bg-slate-100 transition-all border-none active:scale-90">+ {val}</button>
                ))}
              </div>
              
              <button type="submit" className="w-full py-5 mt-2 rounded-2xl text-white font-black text-[15px] uppercase tracking-[0.2em] shadow-lg transition-all border-none bg-gradient-to-r from-[#00cec9] to-[#00b894] active:scale-[0.96]">
                নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex flex-col">
          <div className="bg-white flex-1 mt-20 rounded-t-[50px] p-9 overflow-y-auto animate-slideUp shadow-2xl custom-scrollbar">
             <div className="flex justify-between items-center mb-12">
                <h2 className="text-[22px] font-black text-slate-900 tracking-widest uppercase">ইতিহাস</h2>
                <button onClick={() => setShowHistory(false)} className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 border-none"><i className="fas fa-times"></i></button>
             </div>
             {archives.length > 0 ? (
               <div className="space-y-7 pb-24">
                 {archives.map(arc => (
                   <div key={arc.id} className="p-7 bg-slate-50 rounded-[38px] border-none shadow-sm">
                      <p className="text-[11px] text-indigo-600 uppercase font-black tracking-widest mb-2">{arc.monthName} {arc.year}</p>
                      <p className="text-slate-900 text-[26px] font-black tracking-tighter">৳{arc.totalIncome - arc.totalExpense}</p>
                      <div className="flex gap-4 pt-5 mt-5 border-t border-slate-200">
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-green-600 uppercase mb-1">আয়</p>
                          <p className="text-[13px] font-black text-slate-800">৳{arc.totalIncome}</p>
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-[9px] font-black text-rose-600 uppercase mb-1">ব্যয়</p>
                          <p className="text-[13px] font-black text-slate-800">৳{arc.totalExpense}</p>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-24 text-slate-400 font-black uppercase text-[11px] tracking-widest">ইতিহাস খালি</div>
             )}
          </div>
        </div>
      )}

      {showBudgetSettings && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[50px] p-9 animate-slideUp shadow-2xl overflow-y-auto max-h-[85vh] custom-scrollbar border-none">
             <div className="flex justify-between items-center mb-10">
                <h2 className="text-[20px] font-black text-slate-900 tracking-widest uppercase">বাজেট লক্ষ্য</h2>
                <button onClick={() => setShowBudgetSettings(false)} className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 border-none"><i className="fas fa-times"></i></button>
             </div>
             <div className="space-y-5 mb-10">
                {EXPENSE_CATEGORIES.map(cat => (
                  <div key={cat} className="space-y-2 text-slate-900">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-3 tracking-widest">{cat}</label>
                    <input type="number" value={budgets[cat] || ''} onChange={(e) => setBudgets({ ...budgets, [cat]: parseFloat(e.target.value) || 0 })} placeholder="৳ বাজেট দিন" className="w-full p-4.5 bg-slate-50 border border-slate-200 rounded-[22px] font-black text-[13.5px] text-slate-900 outline-none focus:border-indigo-600 border-none shadow-inner" />
                  </div>
                ))}
             </div>
             <button onClick={() => setShowBudgetSettings(false)} className="w-full py-6 bg-indigo-700 text-white rounded-[28px] font-black uppercase text-[13.5px] tracking-widest shadow-2xl mb-6 border-none">সংরক্ষণ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
