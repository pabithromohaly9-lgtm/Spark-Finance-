
import React, { useState } from 'react';
import { Transaction, TransactionType, IncomeCategory, ExpenseCategory, Frequency } from '../types';

interface AddTransactionModalProps {
  type: TransactionType;
  onClose: () => void;
  onAdd: (t: Omit<Transaction, 'id'>) => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ type, onClose, onAdd }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(
    type === TransactionType.INCOME ? IncomeCategory.SALARY : ExpenseCategory.FOOD
  );
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>(Frequency.MONTHLY);

  const categories = type === TransactionType.INCOME 
    ? Object.values(IncomeCategory) 
    : Object.values(ExpenseCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    onAdd({
      type,
      amount: parseFloat(amount),
      category,
      note,
      date: new Date(date).toISOString(),
      isRecurring,
      frequency: isRecurring ? frequency : Frequency.NONE
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
        <div className={`p-6 ${type === TransactionType.INCOME ? 'bg-green-600' : 'bg-rose-600'} text-white`}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">নতুন {type === TransactionType.INCOME ? 'আয়' : 'ব্যয়'} যোগ করুন</h2>
            <button onClick={onClose} className="hover:opacity-70 transition-opacity">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">পরিমাণ</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
              <input 
                type="number" 
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-bold text-lg text-slate-900 placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">বিভাগ</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-semibold text-slate-900"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">তারিখ</label>
              <input 
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-semibold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">নোট (ঐচ্ছিক)</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="এটি কিসের জন্য ছিল?"
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 resize-none"
            />
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-700">পুনরাবৃত্ত লেনদেন?</label>
              <button 
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`w-12 h-6 rounded-full transition-all relative ${isRecurring ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isRecurring ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
            {isRecurring && (
              <div className="animate-fadeIn">
                <p className="text-[10px] text-slate-500 font-bold mb-2 uppercase">পুনরাবৃত্তির ধরণ</p>
                <select 
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500"
                >
                  <option value={Frequency.MONTHLY}>প্রতি মাসে</option>
                </select>
                <p className="text-[10px] text-blue-600 mt-2">এটি প্রতি মাসের একই তারিখে অটোমেটিক যোগ হবে।</p>
              </div>
            )}
          </div>

          <button 
            type="submit"
            className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 ${
              type === TransactionType.INCOME ? 'bg-green-600 hover:bg-green-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            সংরক্ষণ করুন
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
