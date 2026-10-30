import { 
  Product, 
  UserAccount, 
  Transaction, 
  CustomerDebt, 
  PettyCashLog, 
  ShiftClosingReport, 
  CapitalLog, 
  StockFlowLog, 
  SystemSettings,
  CartItem
} from '../types';
import { 
  DEFAULT_CATEGORIES, 
  INITIAL_USERS, 
  INITIAL_SETTINGS 
} from './seedData';
import { syncDocToFirestore, deleteDocFromFirestore } from './firebase';
import { formatVariantDisplayName } from '../utils/variantFormat';
import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  PRODUCTS: 'pandir_products',
  CATEGORIES: 'pandir_categories',
  TRANSACTIONS: 'pandir_transactions',
  DEBTS: 'pandir_debts',
  PETTY_CASH: 'pandir_petty_cash',
  CLOSING_REPORTS: 'pandir_closing_reports',
  CAPITAL_LOGS: 'pandir_capital_logs',
  STOCK_LOGS: 'pandir_stock_logs',
  USERS: 'pandir_users',
  SETTINGS: 'pandir_settings',
  OFFLINE_QUEUE: 'pandir_offline_queue',
};

class StorageService {
  constructor() {
    this.ensureInitialized();
  }

  public ensureInitialized() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    } else {
      try {
        const parsedUsers: UserAccount[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        let usersUpdated = false;
        const pandirIdx = parsedUsers.findIndex((u) => u.email.toLowerCase() === 'pandir@pandirstore.com');
        if (pandirIdx >= 0) {
          if (parsedUsers[pandirIdx].role !== 'admin' || parsedUsers[pandirIdx].status !== 'active') {
            parsedUsers[pandirIdx].role = 'admin';
            parsedUsers[pandirIdx].status = 'active';
            usersUpdated = true;
          }
        } else {
          parsedUsers.unshift({
            id: '7warlUHrREdfMvbLpccdrYgGBP83',
            email: 'pandir@pandirstore.com',
            username: 'pandir',
            name: 'Pemilik Toko (Admin Super)',
            role: 'admin',
            password: 'admin123',
            status: 'active',
            createdAt: new Date().toISOString(),
          });
          usersUpdated = true;
        }

        if (usersUpdated) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsedUsers));
        }
      } catch {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DEBTS)) {
      localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PETTY_CASH)) {
      localStorage.setItem(STORAGE_KEYS.PETTY_CASH, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLOSING_REPORTS)) {
      localStorage.setItem(STORAGE_KEYS.CLOSING_REPORTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CAPITAL_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.CAPITAL_LOGS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.STOCK_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)) {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
    }
  }

  // --- PRODUCTS ---
  public getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const parsed = data ? JSON.parse(data) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public saveProducts(products: Product[]) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent('pandir_data_updated', { detail: { key: 'products' } }));
  }

  public updateProduct(updated: Product) {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === updated.id);
    if (index >= 0) {
      products[index] = { ...updated, updatedAt: new Date().toISOString() };
    } else {
      products.unshift({ ...updated, updatedAt: new Date().toISOString() });
    }
    this.saveProducts(products);
    syncDocToFirestore('products', updated.id, updated as unknown as Record<string, unknown>);
  }

  public deleteProduct(id: string) {
    const products = this.getProducts().filter((p) => p.id !== id);
    this.saveProducts(products);
    deleteDocFromFirestore('products', id);
  }

  public async resetToDefaults() {
    if (typeof window === 'undefined') return;

    // 1. Clear LocalStorage & SessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }

    // 2. Set reset done flag to prevent re-seeding demo data
    localStorage.setItem('pandir_is_reset_done', 'true');

    // 3. Clear IndexedDB caches if supported
    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        const dbs = await window.indexedDB.databases?.();
        if (dbs) {
          for (const dbInfo of dbs) {
            if (dbInfo.name) {
              window.indexedDB.deleteDatabase(dbInfo.name);
            }
          }
        }
      } catch {
        // Ignore IndexedDB deletion errors
      }
    }

    // 4. Initialize clean empty storage structures
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PETTY_CASH, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CLOSING_REPORTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CAPITAL_LOGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));

    window.dispatchEvent(new CustomEvent('pandir_data_updated', { detail: { key: 'reset' } }));
  }

  // --- CATEGORIES ---
  public getCategories(): string[] {
    try {
      const isResetDone = localStorage.getItem('pandir_is_reset_done') === 'true';
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      const parsed = data ? JSON.parse(data) : null;
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 || isResetDone) {
          return parsed;
        }
      }
      return isResetDone ? [] : DEFAULT_CATEGORIES;
    } catch {
      return [];
    }
  }

  public saveCategories(categories: string[]) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent('pandir_data_updated', { detail: { key: 'categories' } }));
  }

  // --- TRANSACTIONS ---
  public getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const parsed = data ? JSON.parse(data) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public saveTransactions(txs: Transaction[]) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    window.dispatchEvent(new CustomEvent('pandir_data_updated', { detail: { key: 'transactions' } }));
  }

  public addTransaction(tx: Transaction) {
    const list = this.getTransactions();
    list.unshift(tx);
    this.saveTransactions(list);

    // If online, sync to Firestore
    syncDocToFirestore('transactions', tx.id, tx as unknown as Record<string, unknown>);

    // If offline, enqueue
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.enqueueOffline({ type: 'transaction', payload: tx });
    }
  }

  // --- DEBTS ---
  public getDebts(): CustomerDebt[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEBTS);
      const parsed = data ? JSON.parse(data) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public saveDebts(debts: CustomerDebt[]) {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
    window.dispatchEvent(new CustomEvent('pandir_data_updated', { detail: { key: 'debts' } }));
  }

  public addDebt(debt: CustomerDebt) {
    const debts = this.getDebts();
    debts.unshift(debt);
    this.saveDebts(debts);
    syncDocToFirestore('customer_debts', debt.id, debt as unknown as Record<string, unknown>);
  }

  public updateDebt(debt: CustomerDebt) {
    const debts = this.getDebts();
    const index = debts.findIndex((d) => d.id === debt.id);
    if (index >= 0) {
      debts[index] = debt;
    }
    this.saveDebts(debts);
    syncDocToFirestore('customer_debts', debt.id, debt as unknown as Record<string, unknown>);
  }

  // --- PETTY CASH ---
  public getPettyCash(): PettyCashLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PETTY_CASH);
      const parsed = data ? JSON.parse(data) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public addPettyCash(entry: PettyCashLog) {
    const list = this.getPettyCash();
    list.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.PETTY_CASH, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('pandir_data_updated', { detail: { key: 'petty_cash' } }));
    syncDocToFirestore('petty_cash_logs', entry.id, entry as unknown as Record<string, unknown>);
  }

  // --- CLOSING REPORTS ---
  public getClosingReports(): ShiftClosingReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLOSING_REPORTS);
      const parsed = data ? JSON.parse(data) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public addClosingReport(report: ShiftClosingReport) {
    const list = this.getClosingReports();
    list.unshift(report);
    localStorage.setItem(STORAGE_KEYS.CLOSING_REPORTS, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('pandir_data_updated', { detail: { key: 'closing_reports' } }));
    syncDocToFirestore('closing_reports', report.id, report as unknown as Record<string, unknown>);
  }

  // --- CAPITAL LOGS ---
  public getCapitalLogs(): CapitalLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CAPITAL_LOGS);
      const parsed = data ? JSON.parse(data) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public addCapitalLog(log: CapitalLog) {
    const list = this.getCapitalLogs();
    list.unshift(log);
    localStorage.setItem(STORAGE_KEYS.CAPITAL_LOGS, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('pandir_data_updated', { detail: { key: 'capital_logs' } }));
    syncDocToFirestore('capital_logs', log.id, log as unknown as Record<string, unknown>);
  }

  // --- STOCK FLOW LOGS ---
  public getStockLogs(): StockFlowLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
      const parsed = data ? JSON.parse(data) : null;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public addStockLog(log: StockFlowLog) {
    const list = this.getStockLogs();
    list.unshift(log);
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('pandir_data_updated', { detail: { key: 'stock_logs' } }));
    syncDocToFirestore('stock_flow_logs', log.id, log as unknown as Record<string, unknown>);
  }

  // --- USERS ---
  public getUsers(): UserAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      const parsed = data ? JSON.parse(data) : null;
      return Array.isArray(parsed) ? parsed : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  public saveUsers(users: UserAccount[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('pandir_data_updated', { detail: { key: 'users' } }));
  }

  public updateUser(user: UserAccount) {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = { ...user, updatedAt: new Date().toISOString() };
    } else {
      users.push({ ...user, updatedAt: new Date().toISOString() });
    }
    this.saveUsers(users);
    syncDocToFirestore('users', user.id, user as unknown as Record<string, unknown>);
  }

  public deleteUser(userId: string) {
    const users = this.getUsers().filter((u) => u.id !== userId);
    this.saveUsers(users);
    deleteDocFromFirestore('users', userId);
  }

  // --- SETTINGS ---
  public getSettings(): SystemSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const parsed = data ? JSON.parse(data) : null;
      return parsed && typeof parsed === 'object' ? { ...INITIAL_SETTINGS, ...parsed } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  public saveSettings(settings: SystemSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('pandir_data_updated', { detail: { key: 'settings' } }));
    syncDocToFirestore('settings', 'store_config', settings as unknown as Record<string, unknown>);
  }

  // --- OFFLINE QUEUE ---
  public enqueueOffline(item: { type: string; payload: unknown }) {
    try {
      const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE) || '[]');
      queue.push({ ...item, queuedAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch {
      // ignore
    }
  }

  public getOfflineQueue(): Array<{ type: string; payload: unknown; queuedAt: string }> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE) || '[]');
    } catch {
      return [];
    }
  }

  public clearOfflineQueue() {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
  }

  // --- MULTI-TIER UNIT CONVERSION MATH ---

  /**
   * Returns available selectable units for a product in POS / Restock
   */
  public getAvailableUnitsForProduct(product: Product): { 
    unit: string; 
    ratio: number; 
    price: number; 
    cost: number; 
    label: string;
    variantId?: string;
    variantName?: string;
    isVariant?: boolean;
  }[] {
    const options: { 
      unit: string; 
      ratio: number; 
      price: number; 
      cost: number; 
      label: string;
      variantId?: string;
      variantName?: string;
      isVariant?: boolean;
    }[] = [];

    // 0. If sub-variants/fractions are explicitly disabled by user toggle, return ONLY the primary base unit
    if (product.enableSubVariants === false) {
      const price = product.hargaJualKg || product.hargaJualDus || product.hargaJualPcs || product.priceBase || 0;
      const cost = product.costBase || 0;
      const unitLabel = product.baseUnit === 'kg' ? '1 KG' : product.baseUnit === 'liter' ? '1 Liter' : product.baseUnit.toUpperCase();
      return [{
        unit: unitLabel,
        ratio: 1,
        price,
        cost,
        label: `${unitLabel} (Rp ${price.toLocaleString('id-ID')})`,
      }];
    }

    // 1. Centralized Retail Packaging Variants (e.g. Dus, Renceng, Pcs or 100g, 250g, 500g, 1kg)
    if (product.packagingVariants && product.packagingVariants.length > 0) {
      product.packagingVariants.forEach((v) => {
        const ratio = v.ratioToBase > 0 ? v.ratioToBase : 1;
        const cost = v.costPrice || Math.round((product.costBase || 0) * ratio);
        const displayName = formatVariantDisplayName(product, { name: v.name, ratioToBase: ratio }, { style: 'short' });
        options.push({
          unit: displayName,
          ratio: ratio,
          price: v.sellingPrice || 0,
          cost: cost,
          label: `${displayName} (Rp ${(v.sellingPrice || 0).toLocaleString('id-ID')})`,
          variantId: v.id,
          variantName: displayName,
          isVariant: true,
        });
      });

      // If master base unit is not represented in variants and has a valid priceBase, add it as well
      const hasBase = options.some(
        (o) => Math.abs(o.ratio - 1) < 0.0001 || o.unit.toLowerCase() === product.baseUnit.toLowerCase()
      );
      if (!hasBase && (product.priceBase || 0) > 0) {
        options.push({
          unit: product.baseUnit,
          ratio: 1,
          price: product.priceBase || 0,
          cost: product.costBase || 0,
          label: `${product.baseUnit.toUpperCase()} (Rp ${(product.priceBase || 0).toLocaleString('id-ID')})`,
        });
      }

      return options;
    }

    // 2. 3-Tier Multi-Unit Conversion (Dus -> Renceng -> Pcs) - Legacy Support
    if (product.rasioRencengPerDus && product.rasioPcsPerRenceng) {
      const rencengRatio = product.rasioPcsPerRenceng;
      const totalPcsPerDus = product.rasioRencengPerDus * product.rasioPcsPerRenceng;
      
      const pricePcs = product.hargaJualPcs || product.priceBase || 0;
      const priceRenceng = product.hargaJualRenceng || Math.round(pricePcs * rencengRatio);
      const priceDus = product.hargaJualDus || Math.round(pricePcs * totalPcsPerDus);

      if (priceDus > 0) {
        options.push({
          unit: 'dus',
          ratio: totalPcsPerDus,
          price: priceDus,
          cost: (product.costBase || 0) * totalPcsPerDus,
          label: `Dus (${totalPcsPerDus} Pcs: Rp ${priceDus.toLocaleString('id-ID')})`,
        });
      }
      if (priceRenceng > 0) {
        options.push({
          unit: 'renceng',
          ratio: rencengRatio,
          price: priceRenceng,
          cost: (product.costBase || 0) * rencengRatio,
          label: `Renceng (${rencengRatio} Pcs: Rp ${priceRenceng.toLocaleString('id-ID')})`,
        });
      }
      if (pricePcs > 0 || options.length === 0) {
        options.push({
          unit: 'pcs',
          ratio: 1,
          price: pricePcs,
          cost: product.costBase || 0,
          label: `Pcs (Rp ${pricePcs.toLocaleString('id-ID')})`,
        });
      }
      if (options.length > 0) {
        return options;
      }
    }

    // 3. Multi-Price Variants & Conversion for Weighted Items (KG / Grams)
    if (product.baseUnit === 'kg' || product.isWeighable || product.hargaJualKg) {
      let priceKg = product.hargaJualKg ?? product.priceBase ?? 0;
      const costKg = product.costBase || 0;

      // If priceKg is 0 or empty, but packagingVariants exist, derive priceKg from variants
      if (priceKg <= 0 && product.packagingVariants && product.packagingVariants.length > 0) {
        const oneKgVar = product.packagingVariants.find(v => Math.abs(v.ratioToBase - 1) < 0.0001 || v.name.toLowerCase().includes('1 kg'));
        if (oneKgVar && oneKgVar.sellingPrice > 0) {
          priceKg = oneKgVar.sellingPrice;
        } else {
          const first = product.packagingVariants[0];
          if (first && first.ratioToBase > 0 && first.sellingPrice > 0) {
            priceKg = Math.round(first.sellingPrice / first.ratioToBase);
          }
        }
      }

      const price500 = product.hargaJualGram500 ?? Math.round((priceKg * 0.5) / 100) * 100;
      const price250 = product.hargaJualGram250 ?? Math.round((priceKg * 0.25) / 100) * 100;
      const price100 = product.hargaJualGram100 ?? Math.round((priceKg * 0.1) / 100) * 100;

      const kgOptions: { 
        unit: string; 
        ratio: number; 
        price: number; 
        cost: number; 
        label: string;
        variantId?: string;
        variantName?: string;
        isVariant?: boolean;
      }[] = [];

      // First add custom/packaging variants if any
      if (product.packagingVariants && product.packagingVariants.length > 0) {
        product.packagingVariants.forEach((v) => {
          const ratio = v.ratioToBase > 0 ? v.ratioToBase : 1;
          const cost = v.costPrice || Math.round(costKg * ratio);
          kgOptions.push({
            unit: v.name,
            ratio: ratio,
            price: v.sellingPrice || 0,
            cost: cost,
            label: `${v.name} (Rp ${(v.sellingPrice || 0).toLocaleString('id-ID')})`,
            variantId: v.id,
            variantName: v.name,
            isVariant: true,
          });
        });
      }

      // Also add standard weighing options (1 KG, 500g, 250g, 100g, Custom KG)
      kgOptions.push(
        {
          unit: '1 KG',
          ratio: 1.0,
          price: priceKg,
          cost: costKg,
          label: `1 KG (Rp ${priceKg.toLocaleString('id-ID')})`,
        },
        {
          unit: '500g',
          ratio: 0.5,
          price: price500,
          cost: Math.round(costKg * 0.5),
          label: `500g (Rp ${price500.toLocaleString('id-ID')})`,
        },
        {
          unit: '250g',
          ratio: 0.25,
          price: price250,
          cost: Math.round(costKg * 0.25),
          label: `250g (Rp ${price250.toLocaleString('id-ID')})`,
        },
        {
          unit: '100g',
          ratio: 0.1,
          price: price100,
          cost: Math.round(costKg * 0.1),
          label: `100g (Rp ${price100.toLocaleString('id-ID')})`,
        },
        {
          unit: 'kg',
          ratio: 1.0,
          price: priceKg,
          cost: costKg,
          label: `Custom KG (Rp ${priceKg.toLocaleString('id-ID')}/kg)`,
        }
      );

      // Wholesale Karung / Sack tier option if present
      if (product.tierConfig?.tier3Name && product.tierConfig?.tier3Ratio) {
        const ratio = product.tierConfig.tier3Ratio;
        const price = product.tierConfig.priceTier3 || priceKg * ratio;
        const cost = product.tierConfig.costTier3 || costKg * ratio;
        kgOptions.push({
          unit: product.tierConfig.tier3Name,
          ratio: ratio,
          price: price,
          cost: cost,
          label: `${product.tierConfig.tier3Name.toUpperCase()} (Isi ${ratio} kg: Rp ${price.toLocaleString('id-ID')})`,
        });
      }

      return kgOptions;
    }

    // 4. Multi-Price Variants & Conversion for Liquid / Liter Items
    if (product.baseUnit === 'liter') {
      const priceL = product.priceBase || 0;
      const costL = product.costBase || 0;
      const price500 = Math.round((priceL * 0.5) / 100) * 100;
      const price250 = Math.round((priceL * 0.25) / 100) * 100;

      const literOptions = [
        {
          unit: '1 Liter',
          ratio: 1.0,
          price: priceL,
          cost: costL,
          label: `1 Liter (Rp ${priceL.toLocaleString('id-ID')})`,
        },
        {
          unit: '500 ml',
          ratio: 0.5,
          price: price500,
          cost: Math.round(costL * 0.5),
          label: `500 ml (Rp ${price500.toLocaleString('id-ID')})`,
        },
        {
          unit: '250 ml',
          ratio: 0.25,
          price: price250,
          cost: Math.round(costL * 0.25),
          label: `250 ml (Rp ${price250.toLocaleString('id-ID')})`,
        },
        {
          unit: 'liter',
          ratio: 1.0,
          price: priceL,
          cost: costL,
          label: `Custom Liter (Rp ${priceL.toLocaleString('id-ID')}/L)`,
        },
      ];

      return literOptions;
    }

    // 5. Default Base Unit (Master Unit: PCS / Bungkus / Saset / etc.)
    options.push({
      unit: product.baseUnit,
      ratio: 1,
      price: product.priceBase || 0,
      cost: product.costBase || 0,
      label: `${product.baseUnit.toUpperCase()} (Rp ${(product.priceBase || 0).toLocaleString('id-ID')})`,
    });

    // Tier 2 (Renteng / Grosir Kecil)
    if (product.tierConfig?.tier2Name && product.tierConfig?.tier2Ratio) {
      const ratio = product.tierConfig.tier2Ratio;
      const price = product.tierConfig.priceTier2 || (product.priceBase || 0) * ratio;
      const cost = product.tierConfig.costTier2 || (product.costBase || 0) * ratio;
      options.push({
        unit: product.tierConfig.tier2Name,
        ratio: ratio,
        price: price,
        cost: cost,
        label: `${product.tierConfig.tier2Name.toUpperCase()} (Isi ${ratio} ${product.baseUnit}: Rp ${price.toLocaleString('id-ID')})`,
      });
    }

    // Tier 3 (Dus / Karung / Peti)
    if (product.tierConfig?.tier3Name && product.tierConfig?.tier3Ratio) {
      const ratio = product.tierConfig.tier3Ratio;
      const price = product.tierConfig.priceTier3 || (product.priceBase || 0) * ratio;
      const cost = product.tierConfig.costTier3 || (product.costBase || 0) * ratio;
      options.push({
        unit: product.tierConfig.tier3Name,
        ratio: ratio,
        price: price,
        cost: cost,
        label: `${product.tierConfig.tier3Name.toUpperCase()} (Isi ${ratio} ${product.baseUnit}: Rp ${price.toLocaleString('id-ID')})`,
      });
    }

    // Deduplicate options by unit name (case-insensitive) or variantId
    const seen = new Set<string>();
    return options.filter((opt) => {
      const key = (opt.variantId || opt.unit).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Helper to build a cart item with accurate conversion and subtotal
   */
  public buildCartItem(
    product: Product, 
    selectedUnit: string, 
    quantity: number, 
    discount: number = 0,
    variantId?: string
  ): CartItem {
    const available = this.getAvailableUnitsForProduct(product);
    const matched = available.find((u) => {
      if (variantId && u.variantId === variantId) return true;
      const selNorm = selectedUnit.toLowerCase().replace(/\s+/g, '');
      const unitNorm = u.unit.toLowerCase().replace(/\s+/g, '');
      if (selNorm === unitNorm) return true;
      if (unitNorm.startsWith(selNorm) || selNorm.startsWith(unitNorm)) return true;
      if ((selNorm === '1kg' || selNorm === 'kg') && (unitNorm === '1kg' || unitNorm === 'kg')) return true;
      if ((selNorm === '1liter' || selNorm === 'liter') && (unitNorm === '1liter' || unitNorm === 'liter')) return true;
      return false;
    }) || available[0] || {
      unit: product.baseUnit,
      ratio: 1,
      price: product.priceBase || 0,
      cost: product.costBase || 0,
      label: product.baseUnit,
    };

    const safeQty = isNaN(quantity) || quantity <= 0 ? 1 : quantity;
    const safeDiscount = isNaN(discount) || discount < 0 ? 0 : discount;
    const unitMultiplier = matched.ratio > 0 ? matched.ratio : 1;
    const unitPrice = isNaN(matched.price) ? 0 : matched.price;
    const costPrice = isNaN(matched.cost) ? 0 : matched.cost;
    const baseQuantity = Math.round((safeQty * unitMultiplier) * 10000) / 10000;
    const subtotal = Math.max(0, Math.round(unitPrice * safeQty - safeDiscount));
    const totalCost = Math.round(costPrice * safeQty);

    return {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      category: product.category,
      isWeighable: product.isWeighable,
      variantId: matched.variantId,
      variantName: matched.variantName,
      selectedUnit: matched.unit,
      unitMultiplier,
      quantity,
      baseQuantity,
      unitPrice,
      costPrice,
      discount,
      subtotal,
      totalCost,
    };
  }

  // --- EXCEL EXPORT WITH CUSTOM DATE RANGE ---
  public exportTransactionsToExcel(
    startDateStr: string, 
    endDateStr: string, 
    options?: { paymentFilter?: string; categoryFilter?: string }
  ) {
    const all = this.getTransactions();

    const start = new Date(`${startDateStr}T00:00:00`);
    const end = new Date(`${endDateStr}T23:59:59.999`);

    const filtered = all.filter((tx) => {
      const txDate = new Date(tx.timestamp);
      if (txDate < start || txDate > end) return false;
      if (options?.paymentFilter && options.paymentFilter !== 'all') {
        if (tx.paymentMethod !== options.paymentFilter) return false;
      }
      if (options?.categoryFilter && options.categoryFilter !== 'all') {
        const hasCat = tx.items.some((i) => i.category === options.categoryFilter);
        if (!hasCat) return false;
      }
      return true;
    });

    const rows = filtered.map((tx, idx) => {
      const dt = new Date(tx.timestamp);
      const datePart = dt.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timePart = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const itemsDetail = tx.items
        .map((i) => `${i.productName} (${i.quantity} ${i.selectedUnit} @ Rp ${i.unitPrice.toLocaleString('id-ID')})`)
        .join('; ');

      return {
        No: idx + 1,
        'Nomor Invoice': tx.invoiceNumber,
        Tanggal: datePart,
        Waktu: timePart,
        'Nama Kasir': tx.cashierName,
        'Metode Bayar': tx.paymentMethod.toUpperCase(),
        'Nama Pelanggan': tx.customerName || '-',
        'No WhatsApp': tx.customerPhone || '-',
        'Jatuh Tempo': tx.dueDate ? new Date(tx.dueDate).toLocaleDateString('id-ID') : '-',
        'Rincian Barang': itemsDetail,
        'Total Belanja (Omset)': tx.totalAmount,
        'Total HPP (Modal)': tx.totalCost,
        'Laba Bersih': tx.profit,
      };
    });

    // Summary row
    const totalOmset = filtered.reduce((acc, t) => acc + t.totalAmount, 0);
    const totalModal = filtered.reduce((acc, t) => acc + t.totalCost, 0);
    const totalLaba = filtered.reduce((acc, t) => acc + t.profit, 0);

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Append summary at the bottom
    XLSX.utils.sheet_add_aoa(worksheet, [
      [],
      ['TOTAL REKAPITULASI PERIODE:', `${startDateStr} s/d ${endDateStr}`],
      ['Total Transaksi:', filtered.length],
      ['Total Omset (Pendapatan Kotor):', `Rp ${totalOmset.toLocaleString('id-ID')}`],
      ['Total HPP (Modal):', `Rp ${totalModal.toLocaleString('id-ID')}`],
      ['Total Keuntungan (Laba Bersih):', `Rp ${totalLaba.toLocaleString('id-ID')}`],
    ], { origin: -1 });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');

    const fileName = `Laporan_PANDIR_STORE_${startDateStr}_sd_${endDateStr}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    return { count: filtered.length, fileName, totalOmset, totalLaba };
  }
}

export const storage = new StorageService();
