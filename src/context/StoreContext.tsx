import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  Product, 
  CartItem, 
  Transaction, 
  CustomerDebt, 
  PettyCashLog, 
  ShiftClosingReport, 
  CapitalLog, 
  StockFlowLog, 
  SystemSettings, 
  PaymentMethod 
} from '../types';
import { storage } from '../services/storage';
import { sendToGoogleSheetsWebhook, getActiveFirebaseConfig } from '../services/firebase';
import { sound } from '../services/audio';

interface CheckoutData {
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  customerName?: string;
  customerPhone?: string;
  dueDate?: string;
  debtNotes?: string;
  cashierId: string;
  cashierName: string;
}

interface StoreContextType {
  products: Product[];
  categories: string[];
  cart: CartItem[];
  transactions: Transaction[];
  debts: CustomerDebt[];
  pettyCash: PettyCashLog[];
  closingReports: ShiftClosingReport[];
  capitalLogs: CapitalLog[];
  stockLogs: StockFlowLog[];
  settings: SystemSettings;
  isFirebaseActive: boolean;
  isOnline: boolean;

  // Cart actions
  addToCart: (product: Product, selectedUnit?: string, quantity?: number, variantId?: string) => { success: boolean; message?: string };
  updateCartItemQuantity: (productId: string, selectedUnit: string, quantity: number, variantId?: string) => { success: boolean; message?: string };
  updateCartItemDiscount: (productId: string, selectedUnit: string, discount: number, variantId?: string) => void;
  removeFromCart: (productId: string, selectedUnit: string, variantId?: string) => void;
  clearCart: () => void;
  cartTotalAmount: number;
  cartTotalCost: number;
  cartTotalItemsCount: number;

  // POS Actions
  checkout: (data: CheckoutData) => Promise<{ success: boolean; transaction?: Transaction; error?: string }>;
  
  // Product & Inventory actions
  saveProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  restockProduct: (
    productId: string, 
    unit: string, 
    quantity: number, 
    notes?: string, 
    costPrice?: number
  ) => void;
  
  // Debt Actions
  payDebtInstallment: (debtId: string, amount: number, cashierName: string, notes?: string) => void;
  
  // Petty Cash
  addPettyCashEntry: (entry: Omit<PettyCashLog, 'id' | 'timestamp'>) => void;
  
  // Capital Management
  addCapitalEntry: (type: 'modal_laci' | 'modal_stok', amount: number, description: string, recordedBy: string) => void;
  
  // Closing Cashier
  calculateShiftDrawerSummary: (cashierName?: string) => {
    initialDrawerCapital: number;
    cashSalesTotal: number;
    cashSalesCount: number;
    debtPaymentsCollected: number;
    nonSalesCashIn: number;
    pettyCashOut: number;
    expectedDrawerTotal: number;
  };
  saveAndSendClosingShift: (
    physicalCash: number, 
    cashierId: string, 
    cashierName: string, 
    notes?: string
  ) => { report: ShiftClosingReport; whatsAppUrl: string };

  // Category Actions
  addCategory: (categoryName: string) => void;

  // Settings Actions
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  syncAllToGoogleSheets: () => Promise<{ success: boolean; message: string }>;
  reloadAllData: () => void;
  resetAllData: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => storage.getProducts());
  const [categories, setCategories] = useState<string[]>(() => storage.getCategories());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(() => storage.getTransactions());
  const [debts, setDebts] = useState<CustomerDebt[]>(() => storage.getDebts());
  const [pettyCash, setPettyCash] = useState<PettyCashLog[]>(() => storage.getPettyCash());
  const [closingReports, setClosingReports] = useState<ShiftClosingReport[]>(() => storage.getClosingReports());
  const [capitalLogs, setCapitalLogs] = useState<CapitalLog[]>(() => storage.getCapitalLogs());
  const [stockLogs, setStockLogs] = useState<StockFlowLog[]>(() => storage.getStockLogs());
  const [settings, setSettings] = useState<SystemSettings>(() => storage.getSettings());
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const firebaseConfig = getActiveFirebaseConfig();
  const isFirebaseActive = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

  const reloadAllData = useCallback(() => {
    setProducts(storage.getProducts());
    setCategories(storage.getCategories());
    setTransactions(storage.getTransactions());
    setDebts(storage.getDebts());
    setPettyCash(storage.getPettyCash());
    setClosingReports(storage.getClosingReports());
    setCapitalLogs(storage.getCapitalLogs());
    setStockLogs(storage.getStockLogs());
    setSettings(storage.getSettings());
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleDataUpdate = () => reloadAllData();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pandir_data_updated', handleDataUpdate);
    window.addEventListener('storage', handleDataUpdate);

    sound.setEnabled(settings.soundEnabled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pandir_data_updated', handleDataUpdate);
      window.removeEventListener('storage', handleDataUpdate);
    };
  }, [reloadAllData, settings.soundEnabled]);

  // --- CART CALCULATIONS ---
  const cartTotalAmount = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const cartTotalCost = cart.reduce((acc, item) => acc + item.totalCost, 0);
  const cartTotalItemsCount = cart.reduce((acc, item) => acc + (item.isWeighable ? 1 : item.quantity), 0);

  const addToCart = (
    product: Product, 
    selectedUnit?: string, 
    quantity: number = 1,
    variantId?: string
  ): { success: boolean; message?: string } => {
    const unitToUse = selectedUnit || product.baseUnit;
    const testItem = storage.buildCartItem(product, unitToUse, quantity, 0, variantId);

    // Calculate current cumulative baseQuantity in cart for this product
    const currentBaseInCart = cart
      .filter((i) => i.productId === product.id)
      .reduce((sum, i) => sum + i.baseQuantity, 0);

    const projectedBase = Math.round((currentBaseInCart + testItem.baseQuantity) * 10000) / 10000;

    // Check against Master Stock
    if (projectedBase > product.stock + 0.0001) {
      sound.playWarningSound();
      const sisaStok = Math.max(0, Math.round((product.stock - currentBaseInCart) * 1000) / 1000);
      return {
        success: false,
        message: `Stok Master tidak mencukupi! Sisa stok master: ${sisaStok} ${product.baseUnit}. Dibutuhkan: ${testItem.baseQuantity} ${product.baseUnit}.`,
      };
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => {
        if (variantId && i.variantId) {
          return i.productId === product.id && i.variantId === variantId;
        }
        return i.productId === product.id && i.selectedUnit.toLowerCase() === unitToUse.toLowerCase();
      });

      if (existingIndex >= 0) {
        // Increment quantity for existing item
        const updatedCart = [...prev];
        const existing = updatedCart[existingIndex];
        const newQty = existing.quantity + quantity;
        updatedCart[existingIndex] = storage.buildCartItem(product, unitToUse, newQty, existing.discount, variantId);
        return updatedCart;
      } else {
        const newItem = storage.buildCartItem(product, unitToUse, quantity, 0, variantId);
        return [...prev, newItem];
      }
    });

    sound.playVoiceChime();
    return { success: true };
  };

  const updateCartItemQuantity = (
    productId: string, 
    selectedUnit: string, 
    quantity: number,
    variantId?: string
  ): { success: boolean; message?: string } => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedUnit, variantId);
      return { success: true };
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return { success: false, message: 'Produk tidak ditemukan.' };

    const otherItemsBase = cart
      .filter((i) => {
        if (i.productId !== productId) return false;
        if (variantId && i.variantId) return i.variantId !== variantId;
        return i.selectedUnit !== selectedUnit;
      })
      .reduce((sum, i) => sum + i.baseQuantity, 0);

    const targetItem = storage.buildCartItem(product, selectedUnit, quantity, 0, variantId);
    const projectedTotalBase = Math.round((otherItemsBase + targetItem.baseQuantity) * 10000) / 10000;

    if (projectedTotalBase > product.stock + 0.0001) {
      sound.playWarningSound();
      const sisaStok = Math.max(0, Math.round((product.stock - otherItemsBase) * 1000) / 1000);
      return {
        success: false,
        message: `Stok Master tidak mencukupi! Sisa stok master tersedia: ${sisaStok} ${product.baseUnit}.`,
      };
    }

    setCart((prev) =>
      prev.map((item) => {
        const match = variantId && item.variantId
          ? (item.productId === productId && item.variantId === variantId)
          : (item.productId === productId && item.selectedUnit === selectedUnit);

        if (match) {
          return storage.buildCartItem(product, selectedUnit, quantity, item.discount, variantId);
        }
        return item;
      })
    );
    return { success: true };
  };

  const updateCartItemDiscount = (
    productId: string, 
    selectedUnit: string, 
    discount: number,
    variantId?: string
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prev) =>
      prev.map((item) => {
        const match = variantId && item.variantId
          ? (item.productId === productId && item.variantId === variantId)
          : (item.productId === productId && item.selectedUnit === selectedUnit);

        if (match) {
          return storage.buildCartItem(product, selectedUnit, item.quantity, Math.max(0, discount), variantId);
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string, selectedUnit: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter((item) => {
        if (item.productId !== productId) return true;
        if (variantId && item.variantId) return item.variantId !== variantId;
        return item.selectedUnit !== selectedUnit;
      })
    );
  };

  const clearCart = () => setCart([]);

  // --- CHECKOUT PROCESS ---
  const checkout = async (data: CheckoutData): Promise<{ success: boolean; transaction?: Transaction; error?: string }> => {
    if (cart.length === 0) {
      return { success: false, error: 'Keranjang belanja masih kosong.' };
    }

    const totalAmount = cartTotalAmount;
    const totalCost = cartTotalCost;
    const profit = totalAmount - totalCost;

    if (data.paymentMethod === 'tunai') {
      const received = data.cashReceived || 0;
      if (received < totalAmount) {
        return { success: false, error: 'Nominal uang tunai kurang dari total belanja.' };
      }
    }

    if (data.paymentMethod === 'utang') {
      if (!data.customerName || !data.customerName.trim()) {
        return { success: false, error: 'Nama pelanggan wajib diisi untuk pembayaran utang/bon.' };
      }
    }

    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Prepare Debt if needed
    let debtId: string | undefined;
    if (data.paymentMethod === 'utang') {
      debtId = `debt-${Date.now()}`;
      const newDebt: CustomerDebt = {
        id: debtId,
        transactionId,
        invoiceNumber,
        customerName: data.customerName!.trim(),
        customerPhone: data.customerPhone?.trim() || '-',
        totalDebt: totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        status: 'belum_lunas',
        dueDate: data.dueDate || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: data.debtNotes || 'Bon Belanja Kelontong',
        paymentHistory: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      storage.addDebt(newDebt);
    }

    // 1. Upfront Master Stock Availability Verification
    const neededByProduct: Record<string, number> = {};
    for (const item of cart) {
      neededByProduct[item.productId] = (neededByProduct[item.productId] || 0) + item.baseQuantity;
    }
    for (const [prodId, neededBase] of Object.entries(neededByProduct)) {
      const prod = products.find((p) => p.id === prodId);
      if (prod) {
        const roundedNeeded = Math.round(neededBase * 1000) / 1000;
        if (prod.stock < roundedNeeded - 0.0001) {
          sound.playWarningSound();
          return {
            success: false,
            error: `Stok Master tidak mencukupi untuk "${prod.name}". Sisa stok master: ${prod.stock} ${prod.baseUnit}, total dibutuhkan di keranjang: ${roundedNeeded} ${prod.baseUnit}.`,
          };
        }
      }
    }

    // 2. Deduct master stock for all items
    const updatedProducts = [...products];
    cart.forEach((cartItem) => {
      const pIdx = updatedProducts.findIndex((p) => p.id === cartItem.productId);
      if (pIdx >= 0) {
        const prod = updatedProducts[pIdx];
        const stockBefore = prod.stock;
        const stockAfter = Math.round((stockBefore - cartItem.baseQuantity) * 1000) / 1000;

        updatedProducts[pIdx] = {
          ...prod,
          stock: stockAfter,
          updatedAt: now.toISOString(),
        };

        const unitName = cartItem.variantName || cartItem.selectedUnit;

        // Record stock flow log
        storage.addStockLog({
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          productId: prod.id,
          productName: prod.name,
          productCode: prod.code,
          type: 'PENJUALAN_POS',
          originalUnit: unitName,
          originalQuantity: cartItem.quantity,
          baseQuantityChange: -cartItem.baseQuantity,
          baseUnit: prod.baseUnit,
          stockBefore,
          stockAfter,
          referenceId: invoiceNumber,
          notes: `Penjualan ${invoiceNumber} (${cartItem.quantity}x ${unitName})`,
          timestamp: now.toISOString(),
        });
      }
    });

    storage.saveProducts(updatedProducts);
    setProducts(updatedProducts);

    const transaction: Transaction = {
      id: transactionId,
      invoiceNumber,
      cashierId: data.cashierId,
      cashierName: data.cashierName,
      timestamp: now.toISOString(),
      items: [...cart],
      subtotal: totalAmount,
      discount: 0,
      totalAmount,
      totalCost,
      profit,
      paymentMethod: data.paymentMethod,
      cashReceived: data.paymentMethod === 'tunai' ? data.cashReceived : 0,
      change: data.paymentMethod === 'tunai' ? (data.cashReceived || 0) - totalAmount : 0,
      debtId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      dueDate: data.dueDate,
      syncedToFirestore: isFirebaseActive,
      syncedToGoogleSheets: false,
    };

    storage.addTransaction(transaction);

    // Optional Google Sheets automatic webhook sync
    if (settings.gasWebhookUrl && settings.autoSyncGoogleSheets) {
      sendToGoogleSheetsWebhook(settings.gasWebhookUrl, {
        id: transaction.invoiceNumber,
        cashierName: transaction.cashierName,
        paymentMethod: transaction.paymentMethod,
        totalAmount: transaction.totalAmount,
        totalCost: transaction.totalCost,
        profit: transaction.profit,
        customerName: transaction.customerName,
        items: transaction.items,
      }).catch((e) => console.warn('[GAS Sync Error]', e));
    }

    sound.playSuccessChime();
    clearCart();
    reloadAllData();

    return { success: true, transaction };
  };

  // --- PRODUCT MANAGEMENT ---
  const saveProduct = (product: Product) => {
    storage.updateProduct(product);
    reloadAllData();
  };

  const deleteProduct = (id: string) => {
    storage.deleteProduct(id);
    reloadAllData();
  };

  // --- RESTOCK MULTI-TIER UNITS ---
  const restockProduct = (
    productId: string, 
    unit: string, 
    quantity: number, 
    notes?: string,
    costPrice?: number
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product || quantity <= 0) return;

    const available = storage.getAvailableUnitsForProduct(product);
    const matched = available.find((u) => u.unit.toLowerCase() === unit.toLowerCase()) || available[0];

    const baseQuantityToAdd = quantity * matched.ratio;
    const stockBefore = product.stock;
    const stockAfter = Math.round((stockBefore + baseQuantityToAdd) * 1000) / 1000;

    const updatedProduct: Product = {
      ...product,
      stock: stockAfter,
      costBase: costPrice ? (matched.ratio === 1 ? costPrice : costPrice / matched.ratio) : product.costBase,
      updatedAt: new Date().toISOString(),
    };

    storage.updateProduct(updatedProduct);

    // Add stock flow log
    storage.addStockLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      type: 'RESTOK_MASUK',
      originalUnit: matched.unit,
      originalQuantity: quantity,
      baseQuantityChange: baseQuantityToAdd,
      baseUnit: product.baseUnit,
      stockBefore,
      stockAfter,
      notes: notes || `Restok ${quantity} ${matched.unit}`,
      timestamp: new Date().toISOString(),
    });

    // Also record petty cash out if supplier was paid
    if (costPrice && costPrice > 0) {
      const totalPurchase = costPrice * quantity;
      addPettyCashEntry({
        type: 'kas_keluar',
        category: 'Bayar Supplier',
        amount: totalPurchase,
        description: `Restok ${product.name} (${quantity} ${matched.unit})`,
        cashierName: 'Admin / Kasir',
      });
    }

    sound.playSuccessChime();
    reloadAllData();
  };

  // --- DEBT MANAGEMENT ---
  const payDebtInstallment = (debtId: string, amount: number, cashierName: string, notes?: string) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt || amount <= 0) return;

    const newPaid = debt.paidAmount + amount;
    const remaining = Math.max(0, debt.totalDebt - newPaid);
    const status = remaining === 0 ? 'lunas' : 'cicilan';

    const updated: CustomerDebt = {
      ...debt,
      paidAmount: newPaid,
      remainingAmount: remaining,
      status,
      updatedAt: new Date().toISOString(),
      paymentHistory: [
        ...debt.paymentHistory,
        {
          id: `pay-${Date.now()}`,
          date: new Date().toISOString(),
          amount,
          cashierName,
          notes: notes || 'Pembayaran Cicilan Utang',
        },
      ],
    };

    storage.updateDebt(updated);

    // Record cash inflow from debt collection (so drawer and closing reports account for it)
    addPettyCashEntry({
      type: 'kas_masuk',
      category: 'Pelunasan Bon',
      amount,
      description: `Pembayaran Utang ${debt.customerName} (Inv: ${debt.invoiceNumber})`,
      cashierName,
    });

    sound.playSuccessChime();
    reloadAllData();
  };

  // --- PETTY CASH ---
  const addPettyCashEntry = (entry: Omit<PettyCashLog, 'id' | 'timestamp'>) => {
    const newEntry: PettyCashLog = {
      ...entry,
      id: `cash-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };
    storage.addPettyCash(newEntry);
    reloadAllData();
  };

  // --- CAPITAL MANAGEMENT ---
  const addCapitalEntry = (type: 'modal_laci' | 'modal_stok', amount: number, description: string, recordedBy: string) => {
    const log: CapitalLog = {
      id: `cap-${Date.now()}`,
      type,
      amount,
      description,
      recordedBy,
      timestamp: new Date().toISOString(),
    };
    storage.addCapitalLog(log);

    // If modal laci, update drawer capital setting
    if (type === 'modal_laci') {
      updateSettings({ initialDrawerCapital: amount });
    }

    sound.playSuccessChime();
    reloadAllData();
  };

  // --- CLOSING DRAWER AUDIT & WHATSAPP SENDER ---
  const calculateShiftDrawerSummary = (cashierName?: string) => {
    // We calculate from transactions and petty cash today
    const today = new Date().toISOString().split('T')[0];

    const todayTxs = transactions.filter((t) => {
      const d = t.timestamp.split('T')[0];
      const matchDate = d === today;
      const matchCashier = cashierName ? t.cashierName === cashierName : true;
      return matchDate && matchCashier;
    });

    const cashSales = todayTxs.filter((t) => t.paymentMethod === 'tunai');
    const cashSalesTotal = cashSales.reduce((acc, t) => acc + t.totalAmount, 0);
    const cashSalesCount = cashSales.length;

    // Debt collections today
    const todayPetty = pettyCash.filter((p) => p.timestamp.split('T')[0] === today);
    const debtPaymentsCollected = todayPetty
      .filter((p) => p.type === 'kas_masuk' && p.category === 'Pelunasan Bon')
      .reduce((acc, p) => acc + p.amount, 0);

    const nonSalesCashIn = todayPetty
      .filter((p) => p.type === 'kas_masuk' && p.category !== 'Pelunasan Bon')
      .reduce((acc, p) => acc + p.amount, 0);

    const pettyCashOut = todayPetty
      .filter((p) => p.type === 'kas_keluar')
      .reduce((acc, p) => acc + p.amount, 0);

    const initialDrawerCapital = settings.initialDrawerCapital || 200000;
    const expectedDrawerTotal = (initialDrawerCapital + cashSalesTotal + debtPaymentsCollected + nonSalesCashIn) - pettyCashOut;

    return {
      initialDrawerCapital,
      cashSalesTotal,
      cashSalesCount,
      debtPaymentsCollected,
      nonSalesCashIn,
      pettyCashOut,
      expectedDrawerTotal,
    };
  };

  const saveAndSendClosingShift = (
    physicalCash: number, 
    cashierId: string, 
    cashierName: string, 
    notes?: string
  ) => {
    const summary = calculateShiftDrawerSummary(cashierName);
    const variance = physicalCash - summary.expectedDrawerTotal;
    
    let varianceStatus: 'pas' | 'kurang' | 'lebih' = 'pas';
    let statusText = 'Pas (Sesuai)';
    if (variance < 0) {
      varianceStatus = 'kurang';
      statusText = `Kurang Rp ${Math.abs(variance).toLocaleString('id-ID')}`;
    } else if (variance > 0) {
      varianceStatus = 'lebih';
      statusText = `Lebih Rp ${variance.toLocaleString('id-ID')}`;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const report: ShiftClosingReport = {
      id: `closing-${Date.now()}`,
      shiftDate: now.toISOString().split('T')[0],
      closedAt: now.toISOString(),
      cashierId,
      cashierName,
      initialDrawerCapital: summary.initialDrawerCapital,
      cashSalesTotal: summary.cashSalesTotal,
      cashSalesCount: summary.cashSalesCount,
      debtPaymentsCollected: summary.debtPaymentsCollected,
      nonSalesCashIn: summary.nonSalesCashIn,
      pettyCashOut: summary.pettyCashOut,
      expectedDrawerTotal: summary.expectedDrawerTotal,
      physicalDrawerCash: physicalCash,
      variance,
      varianceStatus,
      cashierNotes: notes,
      sentToWhatsApp: true,
      whatsAppPhone: settings.targetWhatsApp || '085717046895',
      createdAt: now.toISOString(),
    };

    storage.addClosingReport(report);

    // Format strictly matching Section 7 of specification
    const message = 
`*--- LAPORAN CLOSING KASIR - PANDIR STORE ---*
Tanggal & Waktu : ${dateStr} - ${timeStr}
Nama Kasir      : ${cashierName}
--------------------------------------------
1. Modal Awal Laci  : Rp ${summary.initialDrawerCapital.toLocaleString('id-ID')}
2. Penjualan Tunai  : Rp ${summary.cashSalesTotal.toLocaleString('id-ID')} (${summary.cashSalesCount} Transaksi)
3. Pengeluaran Kas  : Rp ${summary.pettyCashOut.toLocaleString('id-ID')}
--------------------------------------------
*TOTAL UANG LACI*   : Rp ${summary.expectedDrawerTotal.toLocaleString('id-ID')}
Uang Fisik Dihitung : Rp ${physicalCash.toLocaleString('id-ID')}
Status Selisih      : ${statusText}
--------------------------------------------
Catatan Kasir       : ${notes || '-'}
`;

    // Target WA number 085717046895 -> clean to 6285717046895
    const cleanPhone = (settings.targetWhatsApp || '085717046895')
      .replace(/\D/g, '')
      .replace(/^0/, '62');

    const whatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    sound.playSuccessChime();
    reloadAllData();

    return { report, whatsAppUrl };
  };

  // --- CATEGORIES ---
  const addCategory = (categoryName: string) => {
    const clean = categoryName.trim();
    if (!clean || categories.includes(clean)) return;
    const updated = [...categories, clean];
    storage.saveCategories(updated);
    reloadAllData();
  };

  // --- SETTINGS ---
  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    const updated = { ...settings, ...newSettings };
    storage.saveSettings(updated);
    setSettings(updated);
    sound.setEnabled(updated.soundEnabled);
  };

  const syncAllToGoogleSheets = async () => {
    if (!settings.gasWebhookUrl) {
      return { success: false, message: 'URL Webhook Google Apps Script belum dikonfigurasi di Pengaturan.' };
    }
    return sendToGoogleSheetsWebhook(settings.gasWebhookUrl, {
      type: 'FULL_SYNC',
      storeName: settings.storeName,
      timestamp: new Date().toISOString(),
      transactionsCount: transactions.length,
      debtsCount: debts.length,
      productsCount: products.length,
    });
  };

  const resetAllData = useCallback(() => {
    storage.resetToDefaults();
    reloadAllData();
  }, [reloadAllData]);

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        cart,
        transactions,
        debts,
        pettyCash,
        closingReports,
        capitalLogs,
        stockLogs,
        settings,
        isFirebaseActive,
        isOnline,
        addToCart,
        updateCartItemQuantity,
        updateCartItemDiscount,
        removeFromCart,
        clearCart,
        cartTotalAmount,
        cartTotalCost,
        cartTotalItemsCount,
        checkout,
        saveProduct,
        deleteProduct,
        restockProduct,
        payDebtInstallment,
        addPettyCashEntry,
        addCapitalEntry,
        calculateShiftDrawerSummary,
        saveAndSendClosingShift,
        addCategory,
        updateSettings,
        syncAllToGoogleSheets,
        reloadAllData,
        resetAllData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
