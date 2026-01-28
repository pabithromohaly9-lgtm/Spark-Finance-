
import React from 'react';
import { FinancialSummary, Transaction } from '../types';
import { formatCurrency, CATEGORY_ICONS, DEFAULT_CATEGORY_COLORS } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface DashboardProps {
  summary: FinancialSummary;
  transactions: Transaction[];
  categoryColors: Record<string, string>;
  budgets: Record<string, number>;
  onAddIncome: () => void;
  onAddExpense: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ summary, transactions, categoryColors, budgets, onAddIncome, onAddExpense }) => {
  const colors = categoryColors || DEFAULT_CATEGORY_COLORS;

  const pieData = Object.entries(summary.categoryBreakdown || {}).map(([name, value]) => ({
    name,
    value: Number(value)
  })).sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 5);

  const savingsPerformance = Number(summary.previousMonthSavings) === 0 
    ? 0 
    : ((Number(summary.savings) - Number(summary.previousMonthSavings)) / Math.abs(Number(summary.previousMonthSavings))) * 100;

  // Filter only categories that have a budget set
  // Fix: Explicitly cast to [string, number][] to avoid 'unknown' type errors in operations below
  const budgetData = (Object.entries(budgets) as [string, number][]).filter(([_, budget]) => budget > 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">আর্থিক সারাংশ</h1>
          <p className="text-slate-500">স্বাগতম! আপনার বর্তমান অবস্থা দেখে নিন।</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onAddIncome}
            className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-plus text-green-500"></i> আয় যোগ করুন
          </button>
          <button 
            onClick={onAddExpense}
            className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-200"
          >
            <i className="fas fa-plus"></i> খরচ যোগ করুন
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-xl">
              <i className="fas fa-arrow-trend-up"></i>
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-green-50 text-green-700 rounded-full">মাসিক</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">মোট আয়</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(summary.totalIncome)}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-xl">
              <i className="fas fa-arrow-trend-down"></i>
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-rose-50 text-rose-700 rounded-full">মাসিক</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">মোট ব্যয়</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(summary.totalExpenses)}</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl">
              <i className="fas fa-piggy-bank"></i>
            </div>
            <div className={`text-xs font-bold px-2 py-1 rounded-full ${savingsPerformance >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {savingsPerformance > 0 ? '+' : ''}{savingsPerformance.toFixed(1)}% (গত মাসের তুলনায়)
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium">নিট সঞ্চয়</p>
          <p className="text-2xl font-bold text-white mt-1">{formatCurrency(summary.savings)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-96 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">আয় বনাম ব্যয় (গত কয়েক মাস)</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar name="আয়" dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar name="ব্যয়" dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-96 flex flex-col overflow-y-auto custom-scrollbar">
          <h3 className="text-lg font-bold text-slate-800 mb-6">বাজেট ট্র্যাকার</h3>
          {budgetData.length > 0 ? (
            <div className="space-y-6">
              {budgetData.map(([category, budget]) => {
                const spent = summary.categoryBreakdown[category] || 0;
                const percentage = Math.min((spent / budget) * 100, 100);
                const isOverBudget = spent > budget;
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <div className="flex items-center gap-2">
                        <span style={{ color: colors[category] }}>{CATEGORY_ICONS[category]}</span>
                        <span className="text-slate-700">{category}</span>
                      </div>
                      <span className={isOverBudget ? 'text-rose-600' : 'text-slate-500'}>
                        {formatCurrency(spent)} / {formatCurrency(budget)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${isOverBudget ? 'bg-rose-500' : percentage > 85 ? 'bg-amber-500' : 'bg-blue-500'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
              <i className="fas fa-bullseye text-4xl opacity-20"></i>
              <p>কোনো বাজেট সেট করা নেই</p>
              <p className="text-xs">সেটিংস থেকে আপনার মাসিক বাজেট সেট করুন।</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
