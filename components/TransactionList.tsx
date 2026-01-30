
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, CATEGORY_ICONS, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  title: string;
  budgets?: Record<string, number>;
  categoryBreakdown?: Record<string, number>;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, title, budgets, categoryBreakdown }) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
      const tDate = new Date(t.date).getTime();
      
      // Handle date filters precisely
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
      
      const matchStart = !start || tDate >= start;
      const matchEnd = !end || tDate <= end;
      
      return matchCategory && matchStart && matchEnd;
    });
  }, [transactions, categoryFilter, startDate, endDate]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    // Add all standard categories to the filter dropdown for better user choice
    [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].forEach(c => cats.add(c));
    return Array.from(cats);
  }, []);

  const activeBudget = categoryFilter !== 'all' && budgets ? budgets[categoryFilter] : null;
  const activeSpent = categoryFilter !== 'all' && categoryBreakdown ? categoryBreakdown[categoryFilter] : null;

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">ক্যাটাগরি ফিল্টার</label>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-[20px] px-4 py-4 text-[13px] font-black text-slate-800 outline-none appearance-none cursor-pointer shadow-inner"
            >
              <option value="all">সব ক্যাটাগরি</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">শুরু</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-[20px] px-4 py-3 text-[12px] font-black text-slate-800 outline-none shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">শেষ</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-[20px] px-4 py-3 text-[12px] font-black text-slate-800 outline-none shadow-inner"
              />
            </div>
          </div>
        </div>
        <button 
          onClick={() => { setCategoryFilter('all'); setStartDate(''); setEndDate(''); }}
          className="w-full py-3 text-[11px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100 rounded-[20px] hover:bg-indigo-50 transition-all"
        >
          ফিল্টার রিসেট
        </button>
      </div>

      {/* Budget Progress for Filtered Category */}
      {activeBudget && activeBudget > 0 && activeSpent !== null && (
        <div className="bg-white p-5 rounded-[30px] border border-slate-100 shadow-sm flex flex-col gap-3 animate-fadeIn">
          <div className="flex justify-between items-center text-[12px] font-black">
            <span className="text-slate-500 uppercase tracking-widest">{categoryFilter} বাজেট</span>
            <span className={activeSpent > activeBudget ? 'text-rose-600' : 'text-slate-800'}>
              {formatCurrency(activeSpent)} / {formatCurrency(activeBudget)}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ${activeSpent > activeBudget ? 'bg-rose-500' : 'bg-indigo-600'}`}
              style={{ width: `${Math.min((activeSpent / activeBudget) * 100, 100)}%` }}
            ></div>
          </div>
          {activeSpent > activeBudget && (
            <p className="text-[10px] text-rose-500 font-black uppercase text-center">আপনি বাজেট অতিক্রম করেছেন!</p>
          )}
        </div>
      )}

      {/* Transactions Card List */}
      <div className="space-y-3">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((t) => (
            <div key={t.id} className="bg-white p-5 rounded-[28px] shadow-sm flex items-center justify-between border border-slate-100 animate-slideUp group hover:border-indigo-200 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${t.type === TransactionType.INCOME ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                  <i className={`fas ${CATEGORY_ICONS[t.category] || 'fa-tag'}`}></i>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800 text-[14px]">{t.category}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(t.date).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-bold uppercase truncate max-w-[140px]">{t.note || 'সাধারণ লেনদেন'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`font-black text-[15px] ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-800'}`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount}
                  </p>
                </div>
                <button 
                  onClick={() => onDelete(t.id)}
                  className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center border-none"
                >
                  <i className="fas fa-trash-alt text-[14px]"></i>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400 gap-3">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl opacity-20">
              <i className="fas fa-search"></i>
            </div>
            <p className="text-[12px] font-black uppercase tracking-widest">কোনো ফলাফল পাওয়া যায়নি</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
