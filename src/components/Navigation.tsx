import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { 
  ShoppingCart, 
  Boxes, 
  BookOpen, 
  Wallet, 
  Send, 
  TrendingUp, 
  Users, 
  Settings,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

export type NavTab = 
  | 'pos' 
  | 'inventory' 
  | 'debts' 
  | 'pettyCash' 
  | 'closing' 
  | 'finance' 
  | 'users' 
  | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { isAdmin } = useAuth();
  const { debts, products, cartTotalItemsCount } = useStore();

  const unpaidDebtsCount = debts.filter((d) => d.status !== 'lunas').length;
  const lowStockCount = products.filter((p) => p.stock <= p.minStockAlert).length;

  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeColor?: string;
    adminOnly?: boolean;
  }[] = [
    { 
      id: 'pos', 
      label: 'Kasir (POS)', 
      icon: ShoppingCart,
      badge: cartTotalItemsCount > 0 ? cartTotalItemsCount : undefined,
      badgeColor: 'bg-emerald-600 text-white'
    },
    { 
      id: 'inventory', 
      label: 'Stok Sembako', 
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-amber-500 text-white'
    },
    { 
      id: 'debts', 
      label: 'Buku Utang / Bon', 
      icon: BookOpen,
      badge: unpaidDebtsCount > 0 ? unpaidDebtsCount : undefined,
      badgeColor: 'bg-red-500 text-white'
    },
    { 
      id: 'pettyCash', 
      label: 'Kas Operasional', 
      icon: Wallet 
    },
    { 
      id: 'closing', 
      label: 'Closing Kasir (WA)', 
      icon: Send 
    },
    { 
      id: 'finance', 
      label: 'Laba Rugi & Modal', 
      icon: TrendingUp,
      adminOnly: true 
    },
    { 
      id: 'users', 
      label: 'Kelola Pengguna', 
      icon: Users,
      adminOnly: true 
    },
    { 
      id: 'settings', 
      label: 'Pengaturan Toko', 
      icon: Settings,
      adminOnly: true 
    },
  ];

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {/* DESKTOP SIDEBAR (Width > 1024px) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 p-4 min-h-[calc(100vh-4rem)]">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
          Menu Navigasi
        </div>
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 text-xs font-extrabold rounded-full ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Low Stock Warning Pill if any */}
        {lowStockCount > 0 && (
          <div className="mt-auto pt-4 border-t border-slate-100">
            <div 
              onClick={() => setActiveTab('inventory')}
              className="bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer hover:bg-amber-100/70 transition"
            >
              <div className="flex items-center gap-2 text-amber-800 text-xs font-bold mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Peringatan Stok!</span>
              </div>
              <p className="text-[11px] text-amber-700">
                Ada {lowStockCount} produk sembako menipis atau habis.
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* MOBILE BOTTOM NAVIGATION BAR (Width < 1024px) */}
      {/* Adheres strictly to min 44px x 44px touch targets */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-1 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className={`grid ${isAdmin ? 'grid-cols-7 gap-0.5' : 'grid-cols-5 gap-1'} items-center max-w-lg mx-auto`}>
          {/* 1. Kasir */}
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex flex-col items-center justify-center min-h-[46px] rounded-lg relative py-1 transition ${
              activeTab === 'pos' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <div className="relative">
              <ShoppingCart className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'pos' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
              {cartTotalItemsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {cartTotalItemsCount}
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] mt-0.5 truncate max-w-[50px]">Kasir</span>
          </button>

          {/* 2. Stok */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center justify-center min-h-[46px] rounded-lg relative py-1 transition ${
              activeTab === 'inventory' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <div className="relative">
              <Boxes className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'inventory' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  !
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] mt-0.5 truncate max-w-[50px]">Stok</span>
          </button>

          {/* 3. Utang / Bon */}
          <button
            onClick={() => setActiveTab('debts')}
            className={`flex flex-col items-center justify-center min-h-[46px] rounded-lg relative py-1 transition ${
              activeTab === 'debts' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <div className="relative">
              <BookOpen className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'debts' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
              {unpaidDebtsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {unpaidDebtsCount}
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] mt-0.5 truncate max-w-[50px]">Bon</span>
          </button>

          {/* 4. Closing */}
          <button
            onClick={() => setActiveTab('closing')}
            className={`flex flex-col items-center justify-center min-h-[46px] rounded-lg relative py-1 transition ${
              activeTab === 'closing' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <Send className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'closing' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
            <span className="text-[9px] sm:text-[10px] mt-0.5 truncate max-w-[50px]">Closing</span>
          </button>

          {/* 5. Laba (if Admin) or Kas (if Kasir) */}
          <button
            onClick={() => setActiveTab(isAdmin ? 'finance' : 'pettyCash')}
            className={`flex flex-col items-center justify-center min-h-[46px] rounded-lg relative py-1 transition ${
              activeTab === 'finance' || (!isAdmin && activeTab === 'pettyCash')
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 font-medium'
            }`}
          >
            {isAdmin ? (
              <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'finance' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
            ) : (
              <Wallet className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'pettyCash' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
            )}
            <span className="text-[9px] sm:text-[10px] mt-0.5 truncate max-w-[50px]">
              {isAdmin ? 'Laba' : 'Kas'}
            </span>
          </button>

          {/* 6 & 7: Admin options right beside Laba */}
          {isAdmin && (
            <>
              {/* 6. Akun / Kelola Pengguna */}
              <button
                onClick={() => setActiveTab('users')}
                className={`flex flex-col items-center justify-center min-h-[46px] rounded-lg relative py-1 transition ${
                  activeTab === 'users' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
                }`}
              >
                <Users className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'users' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
                <span className="text-[9px] sm:text-[10px] mt-0.5 truncate max-w-[50px]">Akun</span>
              </button>

              {/* 7. Setelan / Pengaturan */}
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center justify-center min-h-[46px] rounded-lg relative py-1 transition ${
                  activeTab === 'settings' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
                }`}
              >
                <Settings className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'settings' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
                <span className="text-[9px] sm:text-[10px] mt-0.5 truncate max-w-[50px]">Setelan</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </>
  );
};
