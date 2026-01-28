
import React, { useState, useMemo } from 'react';
import { Transaction, IncomeCategory, ExpenseCategory } from '../types';
import { formatCurrency, CATEGORY_ICONS } from '../constants';

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
      const matchStart = !startDate || tDate >= new Date(startDate).getTime();
      const matchEnd = !endDate || tDate <= new Date(endDate).getTime();
      return matchCategory && matchStart && matchEnd;
    });
  }, [transactions, categoryFilter, startDate, endDate]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => cats.add(t.category));
    return Array.from(cats);
  }, [transactions]);

  const activeBudget = categoryFilter !== 'all' && budgets ? budgets[categoryFilter] : null;
  const activeSpent = categoryFilter !== 'all' && categoryBreakdown ? categoryBreakdown[categoryFilter] : null;

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">ক্যাটাগরি ফিল্টার</label>
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">সব ক্যাটাগরি</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">শুরুর তারিখ</label>
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">শেষ তারিখ</label>
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
          />
        </div>
        <button 
          onClick={() => { setCategoryFilter('all'); setStartDate(''); setEndDate(''); }}
          className="mt-5 text-xs font-bold text-blue-600 hover:text-blue-700"
        >
          রিসেট
        </button>
      </div>

      {activeBudget && activeSpent !== null && (
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex-1 mr-4">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-500">মাসিক বাজেট প্রগতি</span>
              <span className={activeSpent > activeBudget ? 'text-rose-600' : 'text-slate-700'}>
                {formatCurrency(activeSpent)} / {formatCurrency(activeBudget)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${activeSpent > activeBudget ? 'bg-rose-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min((activeSpent / activeBudget) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          {activeSpent > activeBudget && (
            <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-2 py-1 rounded-full uppercase">সীমা অতিক্রম!</span>
          )}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">বিবরণ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">নোট</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">তারিখ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">পরিমাণ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 bg-slate-100 text-sm">
                          {CATEGORY_ICONS[t.category]}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900">{t.category}</span>
                          {t.isRecurring && (
                            <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">পুনরাবৃত্ত</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700 italic font-medium">{t.note || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-800 font-medium">{new Date(t.date).toLocaleDateString('bn-BD')}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-bold ${t.type === 'INCOME' ? 'text-green-700' : 'text-slate-900'}`}>
                        {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onDelete(t.id)}
                        className="text-slate-400 hover:text-rose-600 p-2 transition-colors"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl">
              <i className="fas fa-filter opacity-30"></i>
            </div>
            <p className="text-sm font-bold text-slate-600">ফিল্টার অনুযায়ী কোনো লেনদেন পাওয়া যায়নি</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
