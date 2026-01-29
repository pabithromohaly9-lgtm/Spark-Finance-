
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

  const deleteAllData = () => {
    if (window.confirm('আপনি কি নিশ্চিত যে আপনি সব ডেটা মুছে ফেলতে চান? এই পদক্ষেপটি আর ফিরিয়ে আনা যাবে না।')) {
      setTransactions([]);
      setArchives([]);
      setBudgets({
        'খাবার': 5000,
        'যাতায়াত': 2000,
        'ভাড়া': 10000,
        'বিল': 3000,
        'কেনাকাটা': 4000,
        'স্বাস্থ্য': 2000,
        'অন্যান্য': 2000
      });
      setInsights([]);
      setProfileImage(null);
      localStorage.clear();
      setActiveTab('home');
      alert('সব ডেটা সফলভাবে মুছে ফেলা হয়েছে।');
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
      
      {/* HEADER SECTION WITH TOP GLOW BORDER */}
      <header className={`bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative z-[60] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isShrunk ? 'p-4 rounded-b-[24px] shadow-lg header-scrolled' : 'p-8 rounded-b-[45px] shadow-xl'}`}>
        <div className="header-top-line"></div>
        <div className={`flex justify-between items-center transition-all ${isShrunk ? 'mb-2' : 'mb-8'}`}>
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
             <div>
                <h1 className={`font-black uppercase tracking-tight text-white transition-all ${isShrunk ? 'text-[18px]' : 'text-[24px]'}`}>স্পার্ক</h1>
                {!isShrunk && <p className="text-[12px] font-bold text-indigo-200 uppercase tracking-widest opacity-90">পার্সোনাল ফিন্যান্স</p>}
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBudgetSettings(true)} className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center border-none transition-hover hover:bg-white/20 shadow-sm"><i className="fas fa-bullseye text-[14px]"></i></button>
            <button onClick={() => setShowHistory(true)} className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center border-none transition-hover hover:bg-white/20 shadow-sm"><i className="fas fa-history text-[14px]"></i></button>
          </div>
        </div>
        
        <div className="text-center">
            <p className={`text-indigo-100 font-bold uppercase transition-all tracking-widest ${isShrunk ? 'text-[12px] opacity-80 mb-0.5' : 'text-[14px] mb-2'}`}>বর্তমান ব্যালেন্স</p>
            <h2 className={`font-black tracking-tighter text-white transition-all ${isShrunk ? 'text-[32px]' : 'text-[48px]'}`}>{formatCurrency(summary.balance)}</h2>
            
            {!isShrunk && (
              <div className="mt-8 grid grid-cols-2 gap-4 animate-fadeIn">
                <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-sm">
                  <p className="text-[12px] uppercase font-bold text-indigo-200 mb-1 tracking-wider">মোট আয়</p>
                  <p className="text-[20px] font-black text-green-300">৳{summary.income}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-sm">
                  <p className="text-[12px] uppercase font-bold text-indigo-200 mb-1 tracking-wider">মোট ব্যয়</p>
                  <p className="text-[20px] font-black text-rose-300">৳{summary.expense}</p>
                </div>
              </div>
            )}
        </div>
      </header>

      {/* MAIN CONTENT AREA WITH SMOOTH SCROLLING */}
      <main ref={mainRef} className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8 scroll-smooth" onScroll={handleScroll}>
        {activeTab === 'home' ? (
          <div className="space-y-8 animate-fadeIn pb-32">
            
            {/* BUDGET TRACKER SECTION */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-400 text-[13px] uppercase tracking-widest">বাজেট ট্র্যাকার</h3>
                <button onClick={() => setShowBudgetSettings(true)} className="text-[11px] font-black text-indigo-600 uppercase tracking-tighter hover:underline">বাজেট পরিবর্তন</button>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {EXPENSE_CATEGORIES.map(cat => {
                  const spent = summary.breakdown[cat] || 0;
                  const budget = budgets[cat] || 0;
                  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                  const isOver = spent > budget && budget > 0;
                  const isNear = percent > 85 && !isOver;

                  if (budget === 0 && spent === 0) return null;

                  return (
                    <div key={cat} className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100/50 transition-all hover:border-indigo-100">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${isOver ? 'bg-rose-50 text-rose-600' : isNear ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            <i className={`fas ${CATEGORY_ICONS[cat] || 'fa-tag'}`}></i>
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-[15px]">{cat}</p>
                            <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tight">বাজেট: ৳{budget}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-[15px] ${isOver ? 'text-rose-600' : 'text-slate-800'}`}>৳{spent}</p>
                          <p className={`text-[10px] font-black uppercase ${isOver ? 'text-rose-500' : isNear ? 'text-amber-500' : 'text-slate-400'}`}>
                            {isOver ? 'সীমা অতিক্রম' : `${percent.toFixed(0)}% খরচ`}
                          </p>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full transition-all duration-700 ease-out rounded-full ${isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-indigo-500'}`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RECENT TRANSACTIONS */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-400 text-[13px] uppercase tracking-widest">সাম্প্রতিক লেনদেন</h3>
                <span className="text-[12px] bg-slate-200/50 text-slate-600 px-3 py-1.5 rounded-full font-black uppercase tracking-tighter">এই মাস</span>
              </div>
              
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.slice(0, 10).map(t => (
                    <div key={t.id} className="bg-white p-5 rounded-[28px] shadow-sm flex items-center justify-between border border-slate-100/50 animate-slideUp group hover:border-indigo-100 transition-all">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${t.type === TransactionType.INCOME ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                          <i className={`fas ${CATEGORY_ICONS[t.category] || 'fa-tag'}`}></i>
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-[16px]">{t.category}</p>
                          <p className="text-[13px] text-slate-400 font-bold uppercase tracking-tight">{t.note || 'সাধারণ লেনদেন'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <p className={`font-black text-[18px] ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-800'}`}>
                          {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount}
                        </p>
                        <button onClick={() => deleteTransaction(t.id)} className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all border-none opacity-0 group-hover:opacity-100">
                          <i className="fas fa-trash-alt text-[13px]"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center flex flex-col items-center gap-5 animate-fadeIn">
                   <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 text-4xl shadow-inner">
                     <i className="fas fa-receipt"></i>
                   </div>
                   <p className="text-slate-400 font-black text-[14px] uppercase tracking-widest">এখনো কোনো লেনদেন নেই</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'future' ? (
          <div className="space-y-8 animate-fadeIn pb-32">
             <div className="p-10 bg-slate-900 rounded-[45px] text-white relative overflow-hidden shadow-2xl">
               <h3 className="text-[26px] font-black mb-1.5 tracking-tight">এআই পরামর্শ</h3>
               <p className="text-[13px] text-slate-400 font-bold uppercase tracking-widest mb-10">স্মার্ট ফিন্যান্সিয়াল কোচ</p>
               <button onClick={fetchAIAdvice} disabled={loadingAI} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[24px] font-black uppercase text-[13px] tracking-widest transition-all active:scale-95 border-none shadow-xl shadow-indigo-500/20">
                 {loadingAI ? <><i className="fas fa-spinner animate-spin mr-2"></i> প্রসেসিং...</> : <><i className="fas fa-wand-magic-sparkles mr-2"></i> পরামর্শ নিন</>}
               </button>
               <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>
             </div>
             {insights.map((insight, idx) => (
               <div key={idx} className={`p-7 rounded-[35px] border flex gap-5 animate-slideUp shadow-sm ${insight.type === 'success' ? 'bg-green-50/50 border-green-100' : insight.type === 'warning' ? 'bg-rose-50/50 border-rose-100' : 'bg-blue-50/50 border-blue-100'}`}>
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0 ${insight.type === 'success' ? 'bg-green-500 text-white' : insight.type === 'warning' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'}`}>
                   <i className={`fas ${insight.type === 'success' ? 'fa-check' : insight.type === 'warning' ? 'fa-exclamation' : 'fa-info'}`}></i>
                 </div>
                 <div>
                   <h4 className="font-black text-slate-800 text-[16px] mb-1.5">{insight.title}</h4>
                   <p className="text-slate-600 text-[14px] font-bold leading-relaxed">{insight.description}</p>
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn pb-32">
             {/* BILL SPLITTER TOOL */}
             <div className="bg-white p-10 rounded-[45px] border border-slate-100 shadow-sm space-y-8">
               <h3 className="font-black text-slate-800 uppercase text-[14px] tracking-widest"><i className="fas fa-calculator mr-3 text-indigo-600"></i> বিল স্প্লিটার</h3>
               <div className="grid grid-cols-1 gap-6">
                 <div className="space-y-3">
                   <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-3">মোট টাকা</p>
                   <input type="number" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} placeholder="৳ ০" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[24px] font-black text-[18px] text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all border-none shadow-inner" />
                 </div>
                 <div className="space-y-3">
                   <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-3">মানুষ সংখ্যা</p>
                   <input type="number" value={splitPeople} onChange={(e) => setSplitPeople(e.target.value)} className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[24px] font-black text-[18px] text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all border-none shadow-inner" />
                 </div>
               </div>
               <div className="p-10 bg-indigo-600 rounded-[35px] text-center shadow-xl">
                 <p className="text-[13px] font-bold text-indigo-100 uppercase mb-3 tracking-widest">প্রতি জনের ভাগ</p>
                 <p className="text-[44px] font-black text-white tracking-tighter">৳ {splitAmount && splitPeople ? (parseFloat(splitAmount) / parseInt(splitPeople)).toFixed(0) : '০'}</p>
               </div>
             </div>

             {/* SYSTEM CONTROL / DANGER ZONE */}
             <div className="bg-rose-50 p-10 rounded-[45px] border border-rose-100 shadow-sm space-y-6">
               <h3 className="font-black text-rose-800 uppercase text-[14px] tracking-widest"><i className="fas fa-gears mr-3"></i> সিস্টেম কন্ট্রোল</h3>
               <p className="text-[13px] text-rose-600 font-bold leading-relaxed px-2">আপনি কি অ্যাপের সব লেনদেন, বাজেট এবং ব্যক্তিগত তথ্য মুছে ফেলতে চান? এটি পুনরায় ফিরিয়ে আনা সম্ভব হবে না।</p>
               <button 
                 onClick={deleteAllData}
                 className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-[24px] font-black uppercase text-[14px] tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-200 flex items-center justify-center gap-3 border-none"
               >
                 <i className="fas fa-trash-can"></i> সব ডেটা মুছুন
               </button>
             </div>
          </div>
        )}
      </main>

      {/* FLOATING ACTION BUTTON */}
      <div className="fixed bottom-28 right-8 z-[100]">
        {showAddMenu && (
          <div className="flex flex-col gap-4 mb-5 animate-slideUp items-end">
            <button onClick={() => { setModalType(TransactionType.INCOME); setShowAddMenu(false); }} className="flex items-center gap-4 bg-green-600 text-white px-7 py-4 rounded-[22px] font-black text-[14px] uppercase tracking-widest shadow-2xl active:scale-95 border-none transform transition-transform">
              <i className="fas fa-arrow-up"></i> আয় যোগ
            </button>
            <button onClick={() => { setModalType(TransactionType.EXPENSE); setShowAddMenu(false); }} className="flex items-center gap-4 bg-rose-600 text-white px-7 py-4 rounded-[22px] font-black text-[14px] uppercase tracking-widest shadow-2xl active:scale-95 border-none transform transition-transform">
              <i className="fas fa-arrow-down"></i> ব্যয় যোগ
            </button>
          </div>
        )}
        <button onClick={() => setShowAddMenu(!showAddMenu)} className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl shadow-[0_20px_40px_-5px_rgba(79,70,229,0.5)] transition-all active:scale-90 border-none ${showAddMenu ? 'bg-slate-800 rotate-45' : 'bg-indigo-600 scale-110'}`}>
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 px-8 py-5 flex justify-between items-center z-[150] shadow-[0_-15px_45px_rgba(0,0,0,0.06)]">
        <button onClick={() => setActiveTab('home')} className={`flex-1 flex flex-col items-center py-2 border-none bg-transparent transition-all ${activeTab === 'home' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className={`fas fa-house-chimney text-xl mb-2 ${activeTab === 'home' ? 'scale-125' : ''}`}></i>
          <span className="text-[11px] font-black uppercase tracking-widest">হোম</span>
        </button>
        <button onClick={() => setActiveTab('future')} className={`flex-1 flex flex-col items-center py-2 border-none bg-transparent transition-all ${activeTab === 'future' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className={`fas fa-rocket text-xl mb-2 ${activeTab === 'future' ? 'scale-125' : ''}`}></i>
          <span className="text-[11px] font-black uppercase tracking-widest">এআই</span>
        </button>
        <button onClick={() => setActiveTab('tools')} className={`flex-1 flex flex-col items-center py-2 border-none bg-transparent transition-all ${activeTab === 'tools' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className={`fas fa-layer-group text-xl mb-2 ${activeTab === 'tools' ? 'scale-125' : ''}`}></i>
          <span className="text-[11px] font-black uppercase tracking-widest">টুলস</span>
        </button>
      </nav>

      {/* TRANSACTION MODAL (SAME AS BEFORE) */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-8 animate-fadeIn">
          <div className="bg-white w-full max-w-[340px] rounded-[45px] overflow-hidden shadow-2xl border-none flex flex-col animate-scaleIn">
            
            <div className="flex justify-between items-center px-8 pt-8 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${modalType === TransactionType.INCOME ? 'bg-green-500' : 'bg-rose-500'}`}></div>
                <h2 className="text-[18px] font-black text-slate-800 tracking-tight">{modalType === TransactionType.INCOME ? 'টাকা যোগ' : 'খরচ যোগ'}</h2>
              </div>
              <button onClick={() => setModalType(null)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all border-none">
                <i className="fas fa-times text-[12px]"></i>
              </button>
            </div>
            
            <form onSubmit={addTransaction} className="px-8 pb-10 space-y-6">
              <div className="relative py-3 text-center">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-[28px] font-black text-slate-300 select-none">৳</span>
                  <input 
                    ref={amountInputRef}
                    type="number" 
                    name="amount" 
                    required 
                    placeholder="0" 
                    autoFocus 
                    className="w-full text-[48px] font-black text-center outline-none text-slate-900 bg-transparent tracking-tighter border-none placeholder:text-slate-100" 
                  />
                </div>
                <div className="h-[3px] w-1/2 mx-auto bg-slate-100 mt-2 relative overflow-hidden rounded-full">
                  <div className="absolute inset-0 bg-indigo-600 transition-all w-full"></div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <select name="category" className="w-full py-5 px-6 bg-slate-50 border border-slate-100 rounded-[28px] font-black text-[16px] text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 appearance-none text-center shadow-sm transition-all border-none">
                    {(modalType === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><i className="fas fa-chevron-down text-[12px]"></i></div>
                </div>

                <input 
                  type="text" 
                  name="note" 
                  placeholder="নোট (যেমন: বেতন, বাজার...)" 
                  className="w-full py-5 px-6 bg-slate-50 border border-slate-100 rounded-[28px] font-black text-[16px] text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 text-center shadow-sm placeholder:text-slate-300 transition-all border-none" 
                />
              </div>

              <div className="flex justify-center gap-2">
                {[500, 1000, 2000].map(val => (
                  <button key={val} type="button" onClick={() => handleQuickAdd(val)} className="px-4 py-2.5 bg-slate-50 rounded-full text-[12px] font-black text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all border-none active:scale-90 shadow-sm">+ {val}</button>
                ))}
              </div>
              
              <button type="submit" className={`w-full py-6 mt-3 rounded-[26px] text-white font-black text-[16px] uppercase tracking-[0.25em] shadow-xl transition-all border-none active:scale-95 ${modalType === TransactionType.INCOME ? 'bg-green-600 shadow-green-500/20' : 'bg-rose-600 shadow-rose-500/20'}`}>
                নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY & SETTINGS MODALS (SAME AS BEFORE) */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex flex-col">
          <div className="bg-white flex-1 mt-24 rounded-t-[60px] p-10 overflow-y-auto animate-slideUp shadow-2xl custom-scrollbar border-none">
             <div className="flex justify-between items-center mb-12">
                <h2 className="text-[22px] font-black text-slate-900 tracking-widest uppercase">ইতিহাস</h2>
                <button onClick={() => setShowHistory(false)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 border-none shadow-sm"><i className="fas fa-times"></i></button>
             </div>
             {archives.length > 0 ? (
               <div className="space-y-8">
                 {archives.map(arc => (
                   <div key={arc.id} className="p-8 bg-slate-50 rounded-[40px] border-none shadow-sm">
                      <p className="text-[13px] text-indigo-600 uppercase font-black tracking-widest mb-2">{arc.monthName} {arc.year}</p>
                      <p className="text-slate-900 text-[28px] font-black tracking-tighter">{formatCurrency(arc.totalIncome - arc.totalExpense)}</p>
                      <div className="flex gap-6 pt-6 mt-6 border-t border-slate-200">
                        <div className="flex-1"><p className="text-[11px] font-black text-green-600 uppercase mb-1">আয়</p><p className="text-[15px] font-black">৳{arc.totalIncome}</p></div>
                        <div className="flex-1 text-right"><p className="text-[11px] font-black text-rose-600 uppercase mb-1">ব্যয়</p><p className="text-[15px] font-black">৳{arc.totalExpense}</p></div>
                      </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-24 text-slate-400 font-black uppercase text-[14px] tracking-widest">ইতিহাস খালি</div>
             )}
          </div>
        </div>
      )}

      {showBudgetSettings && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[60px] p-10 animate-slideUp shadow-2xl overflow-y-auto max-h-[85vh] custom-scrollbar border-none">
             <div className="flex justify-between items-center mb-12">
                <h2 className="text-[22px] font-black text-slate-900 tracking-widest uppercase">বাজেট লক্ষ্য</h2>
                <button onClick={() => setShowBudgetSettings(false)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 border-none shadow-sm"><i className="fas fa-times"></i></button>
             </div>
             <div className="space-y-6 mb-10">
                {EXPENSE_CATEGORIES.map(cat => (
                  <div key={cat} className="space-y-3">
                    <label className="text-[12px] font-black text-slate-500 uppercase ml-3 tracking-widest flex items-center gap-2">
                       <i className={`fas ${CATEGORY_ICONS[cat]}`}></i> {cat}
                    </label>
                    <input type="number" value={budgets[cat] || ''} onChange={(e) => setBudgets({ ...budgets, [cat]: parseFloat(e.target.value) || 0 })} placeholder="৳ বাজেট দিন" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[24px] font-black text-[16px] outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 border-none shadow-inner transition-all" />
                  </div>
                ))}
             </div>
             <button onClick={() => setShowBudgetSettings(false)} className="w-full py-6 bg-indigo-700 text-white rounded-[26px] font-black uppercase text-[14px] tracking-widest shadow-2xl border-none active:scale-95 transition-all">সংরক্ষণ করুন</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
