
import React from 'react';

interface NavbarProps {
  activeTab: 'dashboard' | 'income' | 'expense' | 'insights' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'income' | 'expense' | 'insights' | 'settings') => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: 'fas fa-th-large' },
    { id: 'income', label: 'আয়', icon: 'fas fa-arrow-up' },
    { id: 'expense', label: 'ব্যয়', icon: 'fas fa-arrow-down' },
    { id: 'insights', label: 'পরামর্শ', icon: 'fas fa-lightbulb' },
    { id: 'settings', label: 'সেটিংস', icon: 'fas fa-cog' },
  ] as const;

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex-col p-6 space-y-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl">
            <i className="fas fa-leaf"></i>
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">জেন-ফাইন্যান্স</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-600 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <i className={`${item.icon} text-lg w-6`}></i>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">প্রো প্ল্যান</p>
            <p className="text-sm text-slate-700 font-semibold">সব এআই ফিচার ব্যবহার করুন</p>
            <button className="mt-3 w-full bg-slate-900 text-white py-2 px-4 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors">
              এখনই আপগ্রেড করুন
            </button>
          </div>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-around items-center py-3 md:hidden z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 ${
              activeTab === item.id ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <i className={`${item.icon} text-xl`}></i>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Navbar;
