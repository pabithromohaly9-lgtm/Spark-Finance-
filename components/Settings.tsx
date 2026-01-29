
import React from 'react';
import { IncomeCategory, ExpenseCategory, UserSettings } from '../types';
import { DEFAULT_CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';

interface SettingsProps {
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {
  // Fix: Explicitly cast enum values to string arrays to resolve 'unknown' index type errors
  const expenseCategories = Object.values(ExpenseCategory) as string[];
  const incomeCategories = Object.values(IncomeCategory) as string[];
  const allCategories = [...incomeCategories, ...expenseCategories];

  const handleColorChange = (cat: string, color: string) => {
    onUpdateSettings({
      ...settings,
      categoryColors: {
        ...settings.categoryColors,
        [cat]: color
      }
    });
  };

  const handleBudgetChange = (cat: string, amount: string) => {
    const val = parseFloat(amount) || 0;
    onUpdateSettings({
      ...settings,
      budgets: {
        ...settings.budgets,
        [cat]: val
      }
    });
  };

  const resetColors = () => {
    onUpdateSettings({
      ...settings,
      categoryColors: DEFAULT_CATEGORY_COLORS
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">অ্যাপ সেটিংস</h1>
        <p className="text-slate-500">আপনার পছন্দমতো অ্যাপটি কাস্টমাইজ করুন।</p>
      </header>

      {/* Budget Settings Section */}
      <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6">মাসিক বাজেট সেট করুন</h3>
        <p className="text-sm text-slate-500 mb-6">আপনার ব্যয়ের লক্ষ্যমাত্রা ঠিক করতে প্রতিটি ক্যাটাগরির জন্য বাজেট নির্ধারণ করুন।</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {expenseCategories.map(cat => (
            <div key={cat} className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                {/* Use correct FontAwesome class application */}
                <i className={`fas ${CATEGORY_ICONS[cat] || 'fa-tag'}`}></i>
                {cat}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">৳</span>
                <input 
                  type="number"
                  placeholder="বাজেট নেই"
                  value={settings.budgets[cat] || ''}
                  onChange={(e) => handleBudgetChange(cat, e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category Color Customization */}
      <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800">ক্যাটাগরি কালার কাস্টমাইজেশন</h3>
          <button 
            onClick={resetColors}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            রিসেট করুন
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {allCategories.map(cat => (
            <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full shadow-inner" 
                  style={{ backgroundColor: settings.categoryColors[cat] || DEFAULT_CATEGORY_COLORS[cat] }}
                ></div>
                <span className="text-sm font-bold text-slate-700">{cat}</span>
              </div>
              <input 
                type="color" 
                value={settings.categoryColors[cat] || DEFAULT_CATEGORY_COLORS[cat]}
                onChange={(e) => handleColorChange(cat, e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">ডেটা ব্যাকআপ</h3>
          <p className="text-slate-400 text-sm mb-6">আপনার সব লেনদেন এবং সেটিংস ব্রাউজারের লোকাল স্টোরেজে সংরক্ষিত থাকে।</p>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all border border-white/10">
              <i className="fas fa-download mr-2"></i> এক্সপোর্ট (JSON)
            </button>
            <button className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-sm font-bold transition-all border border-rose-500/20">
              <i className="fas fa-trash-alt mr-2"></i> সব ডেটা মুছুন
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
      </section>
    </div>
  );
};

export default Settings;
