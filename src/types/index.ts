/**
 * PANDIR STORE - Domain Types & Interfaces
 */

export type UserRole = 'admin' | 'kasir';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  username?: string;
  password?: string; // used for internal credential matching fallback
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt?: string;
}

export type UnitType = 'pcs' | 'saset' | 'bungkus' | 'pouch' | 'kg' | 'gram' | 'renteng' | 'dus' | 'karung' | 'peti' | 'liter' | 'botol';

export interface MultiTierUnitConfig {
  // Base unit is the smallest inventory tracking unit (e.g. 'pcs', 'saset', 'kg')
  baseUnit: UnitType;
  
  // Tier 2: Grosir Kecil / Renteng / Pack (optional)
  tier2Name?: string; // e.g. "renteng"
  tier2Ratio?: number; // e.g. 10 baseUnits per 1 tier2
  priceTier2?: number; // Selling price per tier2
  costTier2?: number;  // Cost price per tier2

  // Tier 3: Grosir Besar / Dus / Karung / Peti (optional)
  tier3Name?: string; // e.g. "dus", "karung", "peti"
  tier3Ratio?: number; // e.g. 40 pcs per dus, or 120 saset per dus
  priceTier3?: number; // Selling price per tier3
  costTier3?: number;  // Cost price per tier3
}

export interface RetailPackagingVariant {
  id: string; // e.g. "pack-250g", "pack-500g"
  name: string; // e.g. "Kemasan 1/4 kg (250g)"
  ratioToBase: number; // Factor to convert to baseUnit (e.g. 0.25 for 1/4 kg, 0.5 for 1/2 kg, 1.0 for 1 kg, 0.1 for 100g)
  unitLabel: string; // e.g. "Pcs", "Bungkus", "Pack"
  sellingPrice: number; // Selling price for this variant
  costPrice?: number; // Optional HPP for this variant
}

export interface Product {
  id: string;
  code: string; // SKU / Barcode, e.g. "BRG-001" or "899999123456"
  name: string;
  category: string;
  baseUnit: UnitType; // Master stock unit: 'kg', 'pcs', 'saset', etc.
  isWeighable?: boolean; // True for bulk goods (Beras, Gula, Telur, Bawang) sold in decimal kg/gram
  
  // Master Stock tracking in base units (e.g. 100 kg)
  stock: number;
  minStockAlert: number;

  // Prices for base unit
  priceBase: number;
  costBase: number; // HPP / Modal per base unit
  totalPurchaseCost?: number; // Total harga beli modal untuk seluruh stok masuk (faktur belanja grosir)

  // 3-Tier Multi-Unit Conversion (Box/Dus -> Strip/Renceng -> Pcs)
  rasioRencengPerDus?: number; // e.g. 48 Renceng per Dus
  rasioPcsPerRenceng?: number; // e.g. 12 Pcs per Renceng
  hargaJualDus?: number;       // Selling price per Dus
  hargaJualRenceng?: number;   // Selling price per Strip / Renceng
  hargaJualPcs?: number;       // Selling price per Eceran Pcs

  // Multi-Price Variants & Conversion for Weighted Items (KG / Grams)
  hargaJualKg?: number;        // Selling price per 1 KG (e.g. Rp 15.000)
  hargaJualGram100?: number;   // Selling price per 100g (e.g. Rp 2.000)
  hargaJualGram250?: number;   // Selling price per 250g / 1/4 kg (e.g. Rp 4.000)
  hargaJualGram500?: number;   // Selling price per 500g / 1/2 kg (e.g. Rp 7.500)

  // Multi-tier configuration (traditional Dus -> Renteng)
  tierConfig?: MultiTierUnitConfig;

  // Centralized Retail Packaging Variants (e.g. 100g, 1/4 kg, 1/2 kg, 1 kg)
  packagingVariants?: RetailPackagingVariant[];

  imageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  isWeighable?: boolean;
  
  // Packaging variant reference (if item is a retail variant)
  variantId?: string;
  variantName?: string;

  // Selected transaction unit
  selectedUnit: string; // e.g. 'Kemasan 1/4 kg', 'pcs', 'renteng', 'dus', 'kg', 'gram'
  unitMultiplier: number; // Factor to convert selected unit to base units (e.g. 0.25 for 1/4 kg, 40 for dus)
  
  quantity: number; // Input quantity in selectedUnit (e.g. 4 pcs, or 2 pcs, or 0.25 kg)
  baseQuantity: number; // quantity * unitMultiplier (deducted from master inventory)
  
  unitPrice: number; // Price per selectedUnit
  costPrice: number; // Cost per selectedUnit
  
  discount: number; // Discount in Rupiah
  subtotal: number; // (unitPrice * quantity) - discount
  totalCost: number; // costPrice * quantity
}

export type PaymentMethod = 'tunai' | 'utang';

export interface Transaction {
  id: string;
  invoiceNumber: string;
  cashierId: string;
  cashierName: string;
  timestamp: string; // ISO date string
  
  items: CartItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  totalCost: number; // Total HPP
  profit: number; // totalAmount - totalCost

  paymentMethod: PaymentMethod;
  cashReceived?: number;
  change?: number;

  // Debt information if paymentMethod === 'utang'
  debtId?: string;
  customerName?: string;
  customerPhone?: string;
  dueDate?: string;

  syncedToFirestore?: boolean;
  syncedToGoogleSheets?: boolean;
}

export interface CustomerDebt {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  totalDebt: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'belum_lunas' | 'cicilan' | 'lunas';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  paymentHistory: {
    id: string;
    date: string;
    amount: number;
    cashierName: string;
    notes?: string;
  }[];
}

export type PettyCashType = 'kas_masuk' | 'kas_keluar';

export interface PettyCashLog {
  id: string;
  type: PettyCashType;
  category: string; // e.g. "Operasional Toko", "Listrik & Air", "Bayar Supplier", "Modal Kasir", "Prive"
  amount: number;
  description: string;
  cashierName: string;
  timestamp: string;
}

export interface ShiftClosingReport {
  id: string;
  shiftDate: string; // YYYY-MM-DD
  closedAt: string; // ISO date string
  cashierId: string;
  cashierName: string;
  
  initialDrawerCapital: number; // Modal Awal Laci
  cashSalesTotal: number; // Total Penjualan Tunai
  cashSalesCount: number; // Jumlah Transaksi Tunai
  debtPaymentsCollected: number; // Pelunasan Piutang yang diterima tunai di shift ini
  nonSalesCashIn: number; // Kas Masuk Lainnya
  pettyCashOut: number; // Pengeluaran Kas Operasional
  
  expectedDrawerTotal: number; // (Modal Awal + Penjualan Tunai + Kas Masuk) - Pengeluaran Kas
  physicalDrawerCash: number; // Uang Fisik yang Dihitung Kasir
  variance: number; // physicalDrawerCash - expectedDrawerTotal (0 = Pas, <0 = Kurang, >0 = Lebih)
  varianceStatus: 'pas' | 'kurang' | 'lebih';

  cashierNotes?: string;
  sentToWhatsApp: boolean;
  whatsAppPhone: string; // '085717046895'
  createdAt: string;
}

export interface CapitalLog {
  id: string;
  type: 'modal_laci' | 'modal_stok';
  amount: number;
  description: string;
  recordedBy: string;
  timestamp: string;
}

export interface StockFlowLog {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  type: 'RESTOK_MASUK' | 'PENJUALAN_POS' | 'PENYESUAIAN_MANUAL';
  originalUnit: string; // e.g. "dus", "renteng", "pcs", "kg", "gram"
  originalQuantity: number;
  baseQuantityChange: number; // e.g. +80 pcs or -5 pcs
  baseUnit: string;
  stockBefore: number;
  stockAfter: number;
  referenceId?: string; // invoice or restock batch
  notes?: string;
  timestamp: string;
}

export interface SystemSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  receiptFooterMessage: string;
  targetWhatsApp: string; // '085717046895'
  initialDrawerCapital: number;
  firebaseApiKey?: string;
  firebaseProjectId?: string;
  gasWebhookUrl?: string;
  autoSyncGoogleSheets: boolean;
  soundEnabled: boolean;
  appVersion: string;
}
