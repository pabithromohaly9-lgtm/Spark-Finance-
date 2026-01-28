
import React, { useState, useEffect } from 'react';
import { Transaction, FinancialSummary, Insight } from '../types';
import { getFinancialInsights } from '../services/geminiService';

interface InsightsPanelProps {
  transactions: Transaction[];
  summary: FinancialSummary;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ transactions, summary }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      if (transactions.length === 0) return;
      setLoading(true);
      try {
        const results = await getFinancialInsights(transactions, summary);
        setInsights(results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">এআই আর্থিক কোচ</h1>
        <p className="text-slate-500">আপনার খরচের অভ্যাসের ওপর ভিত্তি করে বুদ্ধিমত্তাসম্পন্ন পর্যবেক্ষণ।</p>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">আপনার ডেটা বিশ্লেষণ করা হচ্ছে...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights.length > 0 ? (
            insights.map((insight, idx) => (
              <div 
                key={idx} 
                className={`p-6 rounded-3xl border shadow-sm transition-all hover:shadow-md flex gap-4 ${
                  insight.type === 'success' ? 'bg-green-50/50 border-green-100' :
                  insight.type === 'warning' ? 'bg-amber-50/50 border-amber-100' :
                  'bg-blue-50/50 border-blue-100'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl ${
                  insight.type === 'success' ? 'bg-green-500 text-white' :
                  insight.type === 'warning' ? 'bg-amber-500 text-white' :
                  'bg-blue-500 text-white'
                }`}>
                  <i className={`fas ${
                    insight.type === 'success' ? 'fa-check-circle' :
                    insight.type === 'warning' ? 'fa-exclamation-triangle' :
                    'fa-info-circle'
                  }`}></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{insight.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">{insight.description}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <i className="fas fa-brain text-4xl text-slate-200 mb-4"></i>
              <p className="text-slate-400 font-medium">এআই পরামর্শ দেখতে কিছু লেনদেন যোগ করুন!</p>
            </div>
          )}

          {/* Tips Section */}
          <div className="col-span-full bg-slate-900 rounded-3xl p-8 text-white overflow-hidden relative">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-4 text-center md:text-left">
                <h3 className="text-2xl font-bold">স্মার্ট সেভিং টিপস</h3>
                <p className="text-slate-400 max-w-lg">
                  আপনি কি জানেন? প্রতিদিনের খরচের হিসাব রাখলে অপ্রয়োজনীয় ব্যয় ২০% পর্যন্ত কমিয়ে আনা সম্ভব। এভাবেই এগিয়ে যান!
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                  <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold border border-white/10 uppercase tracking-widest">দক্ষতা</div>
                  <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold border border-white/10 uppercase tracking-widest">বৃদ্ধি</div>
                </div>
              </div>
              <div className="w-48 h-48 bg-blue-600 rounded-full flex items-center justify-center text-7xl shadow-2xl shadow-blue-500/50 animate-bounce-slow">
                <i className="fas fa-rocket"></i>
              </div>
            </div>
            {/* Background elements */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;
