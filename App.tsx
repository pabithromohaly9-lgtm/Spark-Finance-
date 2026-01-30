
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType, MonthlyArchive, Insight, FinancialSummary } from './types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_ICONS, formatCurrency } from './constants';
import { getFinancialInsights } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'analytics' | 'tools'>('home');
  const [isShrunk, setIsShrunk] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(() => localStorage.getItem('spark_profile'));
  const amountInputRef = useRef<HTMLInputElement>(null);
  
  // Voice Recognition States
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);

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
  const [splitPeople, setSplitPeople] = useState('2');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalMonths, setGoalMonths] = useState('12');

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

  const analyticsData = useMemo(() => {
    const total = summary.income + summary.expense;
    const incomePercent = total > 0 ? (summary.income / total) * 100 : 0;
    const expensePercent = total > 0 ? (summary.expense / total) * 100 : 0;
    const savingsRate = summary.income > 0 ? ((summary.income - summary.expense) / summary.income) * 100 : 0;
    
    const sortedBreakdown = (Object.entries(summary.breakdown) as [string, number][])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTotal = transactions
        .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.amount, 0);
      return { 
        day: d.toLocaleDateString('bn-BD', { weekday: 'short' }), 
        amount: dayTotal 
      };
    }).reverse();

    const totalBudget = (Object.values(budgets) as number[]).reduce((sum, b) => sum + b, 0);
    const budgetUsage = totalBudget > 0 ? (summary.expense / totalBudget) * 100 : 0;

    return { 
      incomePercent, 
      expensePercent, 
      savingsRate, 
      sortedBreakdown, 
      last7Days,
      budgetUsage,
      totalBudget,
      avgDailySpend: summary.expense / Math.max(now.getDate(), 1)
    };
  }, [summary, transactions, budgets]);

  const financialHealthScore = useMemo(() => {
    if (summary.income === 0) return 0;
    const score = Math.round(analyticsData.savingsRate + 50);
    return Math.min(Math.max(score, 0), 100);
  }, [summary, analyticsData]);

  // VOICE RECOGNITION LOGIC
  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("দুঃখিত, আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই।");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceFeedback("শুনছি... বলুন (যেমন: ১০০ টাকা খাবার খরচ)");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      processVoiceCommand(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceFeedback("বুঝতে পারিনি, আবার চেষ্টা করুন।");
      setTimeout(() => setVoiceFeedback(null), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const processVoiceCommand = (text: string) => {
    // 1. Extract Amount
    const amountMatch = text.match(/\d+/);
    const amount = amountMatch ? parseFloat(amountMatch[0]) : null;

    if (!amount) {
      setVoiceFeedback("টাকার পরিমাণ বুঝতে পারিনি।");
      setTimeout(() => setVoiceFeedback(null), 3000);
      return;
    }

    // 2. Determine Type (Default to Expense unless "income/salary/salary/salary" mentioned)
    let type = TransactionType.EXPENSE;
    if (text.includes("আয়") || text.includes("পেলাম") || text.includes("বেতন") || text.includes("লাভ")) {
      type = TransactionType.INCOME;
    }

    // 3. Determine Category
    let category = "অন্যান্য";
    const categoriesToCheck = type === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    for (const cat of categoriesToCheck) {
      if (text.includes(cat)) {
        category = cat;
        break;
      }
    }

    // 4. Create Transaction
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      type,
      amount,
      category,
      note: text,
      date: new Date().toISOString()
    };

    setTransactions(prev => [newTx, ...prev]);
    setVoiceFeedback(`সাফল্য: ৳${amount} ${category} হিসেবে যোগ হয়েছে।`);
    setTimeout(() => setVoiceFeedback(null), 4000);
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const scrollPos = e.currentTarget.scrollTop;
    if (scrollPos > 40 && !isShrunk) setIsShrunk(true);
    if (scrollPos <= 40 && isShrunk) setIsShrunk(false);
  };

  const fetchAIAdvice = async () => {
    if (transactions.length === 0) return;
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
             {isShrunk && <h1 className="font-black text-white text-[18px] animate-fadeIn">স্পার্ক</h1>}
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
          <div className="space-y-8 animate-fadeIn pb-40 pt-2">
            
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
                        <button onClick={() => deleteTransaction(t.id)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-500 border-none opacity-0 group-hover:opacity-100 transition-opacity">
                          <i className="fas fa-trash-alt text-[11px]"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-[30px]">
                   <p className="text-slate-400 font-black text-[12px] uppercase tracking-widest">কোনো লেনদেন নেই</p>
                </div>
              )}
            </div>

            {/* BUDGET TRACKER */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-black text-slate-400 text-[13px] uppercase tracking-widest">বাজেট ট্র্যাকার</h3>
                <button onClick={() => setShowBudgetSettings(true)} className="text-[11px] font-black text-indigo-600 uppercase border-none bg-transparent">বাজেট সেট</button>
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
        ) : activeTab === 'analytics' ? (
          <div className="space-y-8 animate-fadeIn pb-40 pt-2">
             
             {/* WEEKLY TREND CHART */}
             <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-800 uppercase text-[13px] tracking-widest">সাপ্তাহিক ট্রেন্ড</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase">গত ৭ দিন</span>
                </div>
                <div className="flex items-end justify-between h-32 gap-2 pt-4">
                   {analyticsData.last7Days.map((d, i) => {
                     const max = Math.max(...analyticsData.last7Days.map(day => day.amount), 1);
                     const height = (d.amount / max) * 100;
                     return (
                       <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="relative w-full flex justify-center items-end h-24">
                            <div 
                              className={`w-full max-w-[12px] rounded-full transition-all duration-500 ${d.amount > 0 ? 'bg-indigo-600 shadow-[0_4px_10px_rgba(79,70,229,0.3)]' : 'bg-slate-100'}`} 
                              style={{ height: `${Math.max(height, 5)}%` }}
                            ></div>
                            <div className="absolute -top-6 bg-slate-800 text-white text-[9px] font-black py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">৳{d.amount}</div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{d.day}</span>
                       </div>
                     );
                   })}
                </div>
             </div>

             {/* BUDGET HEALTH & SMART STATS */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">বাজেট ব্যবহার</p>
                   <div className="flex items-center gap-3">
                      <div className="text-[24px] font-black text-slate-800">{analyticsData.budgetUsage.toFixed(0)}%</div>
                      <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${analyticsData.budgetUsage > 90 ? 'bg-rose-500' : 'bg-green-500'}`} 
                          style={{ width: `${Math.min(analyticsData.budgetUsage, 100)}%` }}
                        ></div>
                      </div>
                   </div>
                </div>
                <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">গড় দৈনিক ব্যয়</p>
                   <div className="text-[20px] font-black text-indigo-600">৳{analyticsData.avgDailySpend.toFixed(0)}</div>
                </div>
             </div>

             {/* TOP SPENDING CATEGORIES */}
             <div className="space-y-4">
               <h3 className="font-black text-slate-400 text-[13px] uppercase tracking-widest px-2">সর্বোচ্চ ব্যয় (টপ ৫)</h3>
               <div className="space-y-3">
                 {analyticsData.sortedBreakdown.length > 0 ? analyticsData.sortedBreakdown.map(([cat, val]) => (
                   <div key={cat} className="bg-white p-5 rounded-[28px] shadow-sm border border-slate-100 flex items-center justify-between transition-all hover:border-indigo-100 hover:translate-x-1">
                     <div className="flex items-center gap-4">
                       <div className="w-11 h-11 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                         <i className={`fas ${CATEGORY_ICONS[cat]}`}></i>
                       </div>
                       <div className="overflow-hidden">
                          <p className="font-black text-slate-800 text-[15px]">{cat}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">মোট ব্যয়ের {((val / (summary.expense || 1)) * 100).toFixed(1)}%</p>
                       </div>
                     </div>
                     <p className="font-black text-slate-900 text-[16px]">৳{val}</p>
                   </div>
                 )) : (
                   <div className="py-12 text-center text-slate-400 font-bold uppercase text-[12px] bg-white rounded-[35px] border border-slate-100">কোনো রেকর্ড নেই</div>
                 )}
               </div>
             </div>

             {/* SMART AI SUMMARY WIDGET */}
             <div className="bg-slate-900 p-8 rounded-[40px] text-white space-y-4 relative overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center relative z-10">
                   <h3 className="text-[13px] font-black uppercase tracking-widest text-indigo-400">এআই অবজারভেশন</h3>
                   <i className="fas fa-microchip text-indigo-500/50"></i>
                </div>
                {insights.length > 0 ? (
                  <div className="space-y-4 animate-fadeIn relative z-10">
                    {insights.slice(0, 1).map((insight, idx) => (
                      <div key={idx} className="space-y-2">
                        <p className="font-black text-[18px] leading-tight text-white">{insight.title}</p>
                        <p className="text-slate-400 text-[14px] font-bold leading-relaxed">{insight.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-5 relative z-10">
                    <p className="text-slate-400 text-[14px] font-bold leading-relaxed">আপনার লেনদেন বিশ্লেষণ করে স্মার্ট টিপস পান যা আপনাকে সঞ্চয় বৃদ্ধিতে সাহায্য করবে।</p>
                    <button onClick={fetchAIAdvice} disabled={loadingAI} className="w-full py-4 bg-indigo-600 rounded-2xl font-black uppercase text-[11px] tracking-widest border-none transition-all active:scale-95 shadow-lg shadow-indigo-500/30">
                      {loadingAI ? <i className="fas fa-spinner animate-spin mr-2"></i> : null}
                      {loadingAI ? 'বিশ্লেষণ হচ্ছে...' : 'বিশ্লেষণ শুরু করুন'}
                    </button>
                  </div>
                )}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -left-10 -top-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
             </div>

          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn pb-40 pt-2">
             
             {/* FINANCIAL HEALTH CHECK */}
             <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-4">
               <div className="flex justify-between items-center">
                 <h3 className="font-black text-slate-800 uppercase text-[13px] tracking-widest">আর্থিক স্বাস্থ্য</h3>
                 <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${financialHealthScore > 70 ? 'bg-green-100 text-green-700' : financialHealthScore > 40 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                   {financialHealthScore > 70 ? 'চমৎকার' : financialHealthScore > 40 ? 'মোটামুটি' : 'উদ্বেগজনক'}
                 </span>
               </div>
               <div className="flex items-center gap-6">
                 <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                      <path className="text-slate-100" strokeDasharray="100, 100" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-indigo-600" strokeDasharray={`${financialHealthScore}, 100`} strokeWidth="3" strokeLinecap="round" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-black text-lg text-slate-800">{financialHealthScore}%</div>
                 </div>
                 <p className="text-[12px] font-bold text-slate-500 leading-relaxed">আপনার সঞ্চয় এবং ব্যয়ের ওপর ভিত্তি করে এই স্কোরটি তৈরি করা হয়েছে।</p>
               </div>
             </div>

             {/* BILL SPLITTER */}
             <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
               <h3 className="font-black text-slate-800 uppercase text-[13px] tracking-widest"><i className="fas fa-calculator mr-2 text-indigo-500"></i> বিল স্প্লিটার</h3>
               <div className="space-y-4">
                 <input type="number" value={splitAmount} onChange={(e) => setSplitAmount(e.target.value)} placeholder="৳ মোট বিল" className="w-full p-5 bg-slate-50 rounded-[22px] font-black text-slate-900 outline-none border-none shadow-inner" />
                 <input type="number" value={splitPeople} onChange={(e) => setSplitPeople(e.target.value)} placeholder="মানুষের সংখ্যা" className="w-full p-5 bg-slate-50 rounded-[22px] font-black text-slate-900 outline-none border-none shadow-inner" />
               </div>
               <div className="p-8 bg-indigo-600 rounded-[30px] text-center shadow-lg transition-all hover:scale-[1.02]">
                 <p className="text-[11px] font-bold text-indigo-100 uppercase mb-2">মাথা পিছু খরচ</p>
                 <p className="text-[32px] font-black text-white tracking-tighter">৳ {splitAmount && splitPeople ? (parseFloat(splitAmount) / parseInt(splitPeople)).toFixed(0) : '০'}</p>
               </div>
             </div>

             {/* SAVINGS GOAL CALCULATOR */}
             <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
               <h3 className="font-black text-slate-800 uppercase text-[13px] tracking-widest"><i className="fas fa-bullseye mr-2 text-green-500"></i> লক্ষ্য ক্যালকুলেটর</h3>
               <div className="space-y-4">
                    <input type="number" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} placeholder="৳ লক্ষ্য পরিমাণ" className="w-full p-5 bg-slate-50 rounded-[22px] font-black text-slate-900 outline-none border-none shadow-inner" />
                    <input type="number" value={goalMonths} onChange={(e) => setGoalMonths(e.target.value)} placeholder="সময়কাল (মাস)" className="w-full p-5 bg-slate-50 rounded-[22px] font-black text-slate-900 outline-none border-none shadow-inner" />
               </div>
               <div className="p-8 bg-green-600 rounded-[30px] text-center shadow-lg transition-all hover:scale-[1.02]">
                 <p className="text-[11px] font-bold text-green-100 uppercase mb-2">মাসিক সঞ্চয় লক্ষ্য</p>
                 <p className="text-[32px] font-black text-white tracking-tighter">৳ {goalAmount && goalMonths ? (parseFloat(goalAmount) / parseInt(goalMonths)).toFixed(0) : '০'}</p>
               </div>
             </div>

             {/* QUICK TIPS */}
             <div className="bg-indigo-50 p-8 rounded-[40px] border border-indigo-100 space-y-4">
               <h3 className="font-black text-indigo-800 uppercase text-[12px] tracking-widest"><i className="fas fa-lightbulb mr-2"></i> প্রো টিপস</h3>
               <ul className="space-y-3">
                 <li className="flex gap-3 text-[13px] font-bold text-slate-600"><span className="text-indigo-500">•</span> সঞ্চয় করুন আগে, ব্যয় করুন পরে।</li>
                 <li className="flex gap-3 text-[13px] font-bold text-slate-600"><span className="text-indigo-500">•</span> ৫-৩০-২০ নিয়ম মেনে চলুন।</li>
               </ul>
             </div>

             {/* SYSTEM CONTROL */}
             <div className="bg-rose-50 p-8 rounded-[40px] border border-rose-100 shadow-sm">
               <button onClick={deleteAllData} className="w-full py-5 bg-rose-600 text-white rounded-[22px] font-black uppercase text-[12px] tracking-widest active:scale-95 shadow-lg shadow-rose-200 border-none transition-all hover:bg-rose-700">
                 <i className="fas fa-trash-can mr-2"></i> সব ডেটা মুছুন
               </button>
             </div>

             <div className="h-10"></div>
          </div>
        )}
      </main>

      {/* VOICE FEEDBACK OVERLAY */}
      {voiceFeedback && (
        <div className="fixed bottom-44 left-6 right-6 z-[200] animate-fadeIn">
           <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-[25px] shadow-2xl flex items-center gap-4 border border-white/10">
              <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-rose-500 animate-pulse' : 'bg-green-500'}`}></div>
              <p className="text-[13px] font-black uppercase tracking-wide flex-1">{voiceFeedback}</p>
           </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-28 right-6 z-[100] flex flex-col items-end gap-4">
        
        {/* VOICE INPUT BUTTON (NEW) */}
        <button 
          onClick={startVoiceInput} 
          disabled={isListening}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl shadow-lg transition-all active:scale-90 border-none ${isListening ? 'bg-rose-600 animate-pulse' : 'bg-sky-500 shadow-sky-500/30'}`}
        >
          <i className={`fas ${isListening ? 'fa-circle-stop' : 'fa-microphone'}`}></i>
        </button>

        {showAddMenu && (
          <div className="flex flex-col gap-3 mb-2 animate-slideUp items-end">
            <button onClick={() => { setModalType(TransactionType.INCOME); setShowAddMenu(false); }} className="bg-green-600 text-white px-5 py-3 rounded-[18px] font-black text-[12px] uppercase tracking-widest shadow-xl border-none active:scale-95 transition-all hover:bg-green-700">
              <i className="fas fa-arrow-up mr-2"></i> আয়
            </button>
            <button onClick={() => { setModalType(TransactionType.EXPENSE); setShowAddMenu(false); }} className="bg-rose-600 text-white px-5 py-3 rounded-[18px] font-black text-[12px] uppercase tracking-widest shadow-xl border-none active:scale-95 transition-all hover:bg-rose-700">
              <i className="fas fa-arrow-down mr-2"></i> ব্যয়
            </button>
          </div>
        )}
        
        {/* MAIN ADD BUTTON */}
        <button onClick={() => setShowAddMenu(!showAddMenu)} className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl shadow-[0_8px_25px_rgba(79,70,229,0.4)] transition-all active:scale-90 border-none ${showAddMenu ? 'bg-slate-800 rotate-45' : 'bg-indigo-600'}`}>
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {/* BOTTOM NAVIGATION - FLOATING ISLAND DESIGN */}
      <div className="fixed bottom-6 left-6 right-6 z-[150]">
        <nav className="bg-white/90 backdrop-blur-xl border border-slate-200/50 px-6 py-3 flex justify-between items-center rounded-[30px] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden">
          <button 
            onClick={() => setActiveTab('home')} 
            className={`flex-1 flex flex-col items-center gap-1 border-none bg-transparent transition-all duration-300 ${activeTab === 'home' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${activeTab === 'home' ? 'bg-indigo-50' : 'bg-transparent'}`}>
              <i className="fas fa-house-chimney text-[18px]"></i>
            </div>
            <span className="text-[9px] font-black uppercase">হোম</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('analytics')} 
            className={`flex-1 flex flex-col items-center gap-1 border-none bg-transparent transition-all duration-300 ${activeTab === 'analytics' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${activeTab === 'analytics' ? 'bg-indigo-50' : 'bg-transparent'}`}>
              <i className="fas fa-chart-pie text-[18px]"></i>
            </div>
            <span className="text-[9px] font-black uppercase">পরিসংখ্যান</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('tools')} 
            className={`flex-1 flex flex-col items-center gap-1 border-none bg-transparent transition-all duration-300 ${activeTab === 'tools' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${activeTab === 'tools' ? 'bg-indigo-50' : 'bg-transparent'}`}>
              <i className="fas fa-layer-group text-[18px]"></i>
            </div>
            <span className="text-[9px] font-black uppercase">টুলস</span>
          </button>
        </nav>
      </div>

      {/* TRANSACTION MODAL */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-[340px] rounded-[35px] shadow-2xl border-none animate-slideUp overflow-hidden">
            <div className="flex justify-between items-center px-8 pt-8">
              <h2 className="text-[18px] font-black text-slate-800">{modalType === TransactionType.INCOME ? 'আয় যোগ' : 'ব্যয় যোগ'}</h2>
              <button onClick={() => setModalType(null)} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border-none transition-all hover:bg-slate-100"><i className="fas fa-times text-[10px]"></i></button>
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
                  <button key={val} type="button" onClick={() => handleQuickAdd(val)} className="px-3 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-500 border-none active:scale-90 shadow-sm transition-all hover:bg-indigo-50">+ {val}</button>
                ))}
              </div>
              <button type="submit" className={`w-full py-5 rounded-[22px] text-white font-black uppercase text-[13px] tracking-widest shadow-xl border-none active:scale-95 transition-all ${modalType === TransactionType.INCOME ? 'bg-green-600 shadow-green-500/20' : 'bg-rose-600 shadow-rose-500/20'}`}>নিশ্চিত করুন</button>
            </form>
          </div>
        </div>
      )}

      {/* BUDGET SETTINGS MODAL */}
      {showBudgetSettings && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 animate-slideUp overflow-y-auto max-h-[85vh] custom-scrollbar border-none">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-[18px] font-black text-slate-900 uppercase">বাজেট লক্ষ্য</h2>
                <button onClick={() => setShowBudgetSettings(false)} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center border-none transition-hover hover:bg-slate-200"><i className="fas fa-times"></i></button>
             </div>
             <div className="space-y-6 mb-8">
                {EXPENSE_CATEGORIES.map(cat => (
                  <div key={cat} className="flex flex-col gap-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-3"><i className={`fas ${CATEGORY_ICONS[cat]}`}></i> {cat}</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">৳</span>
                       <input type="number" value={budgets[cat] || ''} onChange={(e) => setBudgets({ ...budgets, [cat]: parseFloat(e.target.value) || 0 })} placeholder="মাসিক বাজেট" className="w-full p-4 pl-10 bg-slate-50 rounded-[18px] font-black outline-none border-none shadow-inner" />
                    </div>
                  </div>
                ))}
             </div>
             <button onClick={() => setShowBudgetSettings(false)} className="w-full py-5 bg-indigo-600 text-white rounded-[22px] font-black uppercase text-[12px] tracking-widest shadow-xl border-none mb-4 transition-all hover:bg-indigo-700">সংরক্ষণ করুন</button>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex flex-col">
          <div className="bg-white flex-1 mt-20 rounded-t-[40px] p-8 overflow-y-auto animate-slideUp border-none custom-scrollbar shadow-2xl">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-[18px] font-black text-slate-900 uppercase tracking-widest">ইতিহাস</h2>
                <button onClick={() => setShowHistory(false)} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center border-none transition-hover hover:bg-slate-200"><i className="fas fa-times"></i></button>
             </div>
             {archives.length > 0 ? (
               <div className="space-y-5">
                 {archives.map(arc => (
                   <div key={arc.id} className="p-6 bg-slate-50 rounded-[28px] shadow-sm border border-slate-100 transition-all hover:border-indigo-100">
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
               <div className="text-center py-24 flex flex-col items-center gap-4 opacity-40">
                  <i className="fas fa-box-open text-4xl"></i>
                  <p className="font-black uppercase text-[12px] tracking-widest">ইতিহাস খালি</p>
               </div>
             )}
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
