/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { LoginPage } from './pages/LoginPage';
import { POSPage } from './pages/POSPage';
import { InventoryPage } from './pages/InventoryPage';
import { DebtPage } from './pages/DebtPage';
import { PettyCashPage } from './pages/PettyCashPage';
import { ClosingPage } from './pages/ClosingPage';
import { FinancePage } from './pages/FinancePage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('pos');

  // Strict Login First Route Guard (Section 9.2)
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Admin access guard: If a cashier somehow sets an admin-only tab, revert to POS
  const currentTab = (activeTab === 'finance' || activeTab === 'users' || activeTab === 'settings') && !isAdmin
    ? 'pos'
    : activeTab;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Header with PANDIR STORE Logo and System Indicators */}
      <Header />

      {/* Responsive Content Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar for Desktop & Bottom Bar for Mobile */}
        <Navigation activeTab={currentTab} setActiveTab={setActiveTab} />

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'pos' && <POSPage />}
          {currentTab === 'inventory' && <InventoryPage />}
          {currentTab === 'debts' && <DebtPage />}
          {currentTab === 'pettyCash' && <PettyCashPage />}
          {currentTab === 'closing' && <ClosingPage />}
          {currentTab === 'finance' && <FinancePage />}
          {currentTab === 'users' && <UsersPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <MainLayout />
      </StoreProvider>
    </AuthProvider>
  );
}
