import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Product, UnitType, RetailPackagingVariant, HppCalculationMethod, ProductPriceUpdatePayload } from '../types';
import { storage } from '../services/storage';
import { 
  Boxes, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  ArrowDownLeft, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  PackagePlus, 
  Layers,
  Scale,
  Calculator,
  Package,
  Droplets,
  Lock,
  Sparkles,
  Coins,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  DollarSign,
  FileText
} from 'lucide-react';
import { FormattedNumberInput } from '../components/FormattedNumberInput';
import { StockConversionCalculator } from '../components/StockConversionCalculator';
import { formatNumberWithDots } from '../utils/numberFormat';

export const InventoryPage: React.FC = () => {
  const { products, categories, stockLogs, saveProduct, deleteProduct, restockProduct } = useStore();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'inventory' | 'stock_logs'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Restock Modal State
  const [restockProductTarget, setRestockProductTarget] = useState<Product | null>(null);
  const [restockUnit, setRestockUnit] = useState<string>('');
  const [restockQty, setRestockQty] = useState<number>(1);
  const [restockCost, setRestockCost] = useState<number>(0);
  const [restockHppMethod, setRestockHppMethod] = useState<HppCalculationMethod>('weighted_average');
  const [restockRecordPettyCash, setRestockRecordPettyCash] = useState<boolean>(true);
  const [restockNotes, setRestockNotes] = useState<string>('');

  // Restock Selling Price Adjustment States
  const [restockPriceBase, setRestockPriceBase] = useState<number>(0);
  const [restockHargaJualKg, setRestockHargaJualKg] = useState<number>(0);
  const [restockHargaJualGram500, setRestockHargaJualGram500] = useState<number>(0);
  const [restockHargaJualGram250, setRestockHargaJualGram250] = useState<number>(0);
  const [restockHargaJualGram100, setRestockHargaJualGram100] = useState<number>(0);
  const [restockHargaJualDus, setRestockHargaJualDus] = useState<number>(0);
  const [restockHargaJualRenceng, setRestockHargaJualRenceng] = useState<number>(0);
  const [restockHargaJualPcs, setRestockHargaJualPcs] = useState<number>(0);
  const [restockPackagingVariants, setRestockPackagingVariants] = useState<RetailPackagingVariant[]>([]);
  const [restockEnableSubVariants, setRestockEnableSubVariants] = useState<boolean>(true);
  const [restockShowPriceAdjust, setRestockShowPriceAdjust] = useState<boolean>(true);

  // Add / Edit / Delete Product Modal State
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productType, setProductType] = useState<'kg' | 'box' | 'pcs' | 'liter'>('kg');
  const [deletingProductTarget, setDeletingProductTarget] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);

    let matchStatus = true;
    if (statusFilter === 'low') matchStatus = p.stock <= p.minStockAlert && p.stock > 0;
    if (statusFilter === 'out') matchStatus = p.stock <= 0;

    return matchCategory && matchSearch && matchStatus;
  });

  // Open Restock Modal
  const handleOpenRestock = (product: Product) => {
    setRestockProductTarget(product);
    const available = storage.getAvailableUnitsForProduct(product);
    const defaultUnit = product.tierConfig?.tier3Name || available[0]?.unit || product.baseUnit;
    setRestockUnit(defaultUnit);
    setRestockQty(1);
    const matched = available.find((u) => u.unit === defaultUnit) || available[0];
    setRestockCost(matched?.cost || product.costBase || 0);
    setRestockHppMethod('weighted_average');
    setRestockRecordPettyCash(true);
    setRestockNotes('Restok dari supplier');

    const pBase = product.priceBase || 0;
    const pKg = product.hargaJualKg ?? pBase;
    setRestockPriceBase(pBase);
    setRestockHargaJualKg(pKg);
    setRestockHargaJualGram500(product.hargaJualGram500 ?? (pKg > 0 ? Math.round((pKg * 0.5) / 100) * 100 : 0));
    setRestockHargaJualGram250(product.hargaJualGram250 ?? (pKg > 0 ? Math.round((pKg * 0.25) / 100) * 100 : 0));
    setRestockHargaJualGram100(product.hargaJualGram100 ?? (pKg > 0 ? Math.round((pKg * 0.1) / 100) * 100 : 0));
    setRestockHargaJualDus(product.hargaJualDus ?? 0);
    setRestockHargaJualRenceng(product.hargaJualRenceng ?? 0);
    setRestockHargaJualPcs(product.hargaJualPcs ?? pBase);
    setRestockPackagingVariants(
      product.packagingVariants ? product.packagingVariants.map((v) => ({ ...v })) : []
    );
    setRestockEnableSubVariants(product.enableSubVariants !== false);
    setRestockShowPriceAdjust(true);
  };

  const handleExecuteRestock = () => {
    if (!restockProductTarget || restockQty <= 0) return;

    const priceUpdates: ProductPriceUpdatePayload = {
      priceBase: restockPriceBase,
      hargaJualKg: restockHargaJualKg,
      hargaJualGram500: restockHargaJualGram500,
      hargaJualGram250: restockHargaJualGram250,
      hargaJualGram100: restockHargaJualGram100,
      hargaJualDus: restockHargaJualDus,
      hargaJualRenceng: restockHargaJualRenceng,
      hargaJualPcs: restockHargaJualPcs,
      packagingVariants: restockPackagingVariants,
      enableSubVariants: restockEnableSubVariants,
    };

    restockProduct(
      restockProductTarget.id, 
      restockUnit, 
      restockQty, 
      restockNotes, 
      restockCost,
      restockHppMethod,
      restockRecordPettyCash,
      priceUpdates
    );
    showToast(`Restok ${restockQty} ${restockUnit} "${restockProductTarget.name}" berhasil diproses & harga jual disinkronkan ke kasir!`);
    setRestockProductTarget(null);
  };

  // Open New Product Form
  const handleOpenAddProduct = () => {
    setFormError(null);
    setProductType('kg');
    setEditingProduct({
      id: `prod-${Date.now()}`,
      code: `BRG-${(products.length + 1).toString().padStart(3, '0')}`,
      name: '',
      category: categories[0] || 'Beras & Tepung',
      baseUnit: 'kg',
      isWeighable: true,
      stock: 0,
      minStockAlert: 10,
      costBase: 0,
      priceBase: 0,
      totalPurchaseCost: 0,
      hargaJualKg: 0,
      packagingVariants: [],
      enableSubVariants: true,
      tierConfig: {
        baseUnit: 'kg',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsEditModalOpen(true);
  };

  // Open Edit Product Form
  const handleOpenEditProduct = (p: Product) => {
    setFormError(null);
    let initialType: 'kg' | 'box' | 'pcs' | 'liter' = 'pcs';
    if (p.isWeighable || p.baseUnit === 'kg' || Boolean(p.hargaJualKg)) {
      initialType = 'kg';
    } else if (
      (p.rasioRencengPerDus && p.rasioPcsPerRenceng) ||
      p.tierConfig?.tier3Name === 'dus' ||
      p.baseUnit === 'dus'
    ) {
      initialType = 'box';
    } else if (p.baseUnit === 'liter') {
      initialType = 'liter';
    } else {
      initialType = 'pcs';
    }

    const renceng = p.rasioRencengPerDus || 48;
    const pcs = p.rasioPcsPerRenceng || 12;
    const totalPerDus = renceng * pcs;
    const boxQty = totalPerDus > 0 ? Math.floor((p.stock || 0) / totalPerDus) : 0;
    const boxHpp = p.tierConfig?.costTier3 || (p.costBase || 0) * totalPerDus;
    const defaultTotalPurchaseCost = p.totalPurchaseCost !== undefined
      ? p.totalPurchaseCost
      : (initialType === 'box'
          ? (boxQty > 0 ? boxQty * boxHpp : boxHpp)
          : Math.round((p.stock || 0) * (p.costBase || 0)));

    setProductType(initialType);
    setEditingProduct({
      ...p,
      enableSubVariants: p.enableSubVariants !== false,
      totalPurchaseCost: defaultTotalPurchaseCost,
    });
    setIsEditModalOpen(true);
  };

  // Switch Product Type Tabs (Step 1)
  const handleSelectProductType = (type: 'kg' | 'box' | 'pcs' | 'liter') => {
    setProductType(type);
    if (!editingProduct) return;

    // Reset base unit and flags
    let baseUnit: UnitType = 'pcs';
    let isWeighable = false;
    let rasioRencengPerDus = editingProduct.rasioRencengPerDus;
    let rasioPcsPerRenceng = editingProduct.rasioPcsPerRenceng;

    if (type === 'kg') { 
      baseUnit = 'kg'; 
      isWeighable = true; 
    } else if (type === 'liter') { 
      baseUnit = 'liter'; 
    } else if (type === 'box') {
      baseUnit = 'pcs';
      rasioRencengPerDus = rasioRencengPerDus || 48;
      rasioPcsPerRenceng = rasioPcsPerRenceng || 12;
    }

    setEditingProduct({
      ...editingProduct,
      baseUnit,
      isWeighable,
      rasioRencengPerDus,
      rasioPcsPerRenceng,
      tierConfig: { ...editingProduct.tierConfig, baseUnit },
    });
  };

  // Generate SKU Code Automatically
  const handleGenerateAutoSku = () => {
    if (!editingProduct) return;
    const nextNum = products.length + 1;
    const newSku = `BRG-${nextNum.toString().padStart(3, '0')}`;
    setEditingProduct({
      ...editingProduct,
      code: newSku,
    });
  };

  const handleSaveProductForm = () => {
    if (!editingProduct?.name || !editingProduct?.name.trim() || !editingProduct?.code || !editingProduct?.code.trim()) {
      setFormError('Nama produk dan Kode Barang (SKU) wajib diisi.');
      return;
    }
    setFormError(null);

    const variants = editingProduct.packagingVariants || [];

    // Backward-compatibility and fallback mapping for Dus, Renceng, Pcs
    let hargaJualDus = editingProduct.hargaJualDus;
    let hargaJualRenceng = editingProduct.hargaJualRenceng;
    let hargaJualPcs = editingProduct.hargaJualPcs;
    let priceBase = Number(editingProduct.priceBase || 0);

    if (productType === 'box' && variants.length > 0) {
      const dusVar = variants.find((v) => v.name.toLowerCase().trim() === 'dus' || v.name.toLowerCase().includes('dus') || v.name.toLowerCase().includes('box'));
      const rencengVar = variants.find((v) => v.name.toLowerCase().trim() === 'renceng' || v.name.toLowerCase().includes('renceng') || v.name.toLowerCase().includes('renteng'));
      const pcsVar = variants.find((v) => v.name.toLowerCase().trim() === 'pcs' || v.ratioToBase === 1);
      
      if (dusVar && dusVar.sellingPrice > 0) hargaJualDus = dusVar.sellingPrice;
      if (rencengVar && rencengVar.sellingPrice > 0) hargaJualRenceng = rencengVar.sellingPrice;
      if (pcsVar && pcsVar.sellingPrice > 0) {
        hargaJualPcs = pcsVar.sellingPrice;
        priceBase = pcsVar.sellingPrice;
      } else if (!priceBase && variants[0]?.sellingPrice) {
        priceBase = variants[0].sellingPrice;
      }
    }

    const prodToSave = {
      ...editingProduct,
      name: editingProduct.name.trim(),
      code: editingProduct.code.trim(),
      stock: Number(editingProduct.stock || 0),
      minStockAlert: Number(editingProduct.minStockAlert || 5),
      costBase: Number(editingProduct.costBase || 0),
      totalPurchaseCost: Number(editingProduct.totalPurchaseCost || 0),
      priceBase: priceBase,
      hargaJualDus,
      hargaJualRenceng,
      hargaJualPcs,
      enableSubVariants: editingProduct.enableSubVariants !== false,
      // Ensure unit specific fields are kept based on type. Allow undefined for optional tiers.
      hargaJualKg: productType === 'kg' ? (editingProduct.hargaJualKg ? Number(editingProduct.hargaJualKg) : priceBase) : undefined,
      packagingVariants: editingProduct.packagingVariants || [],
    } as Product;

    saveProduct(prodToSave);
    setIsEditModalOpen(false);
    setEditingProduct(null);
    showToast(`Data produk "${prodToSave.name}" berhasil disimpan!`);
  };

  const addPackagingVariantPreset = (type: string, ratio: number, defaultName: string) => {
    if (!editingProduct) return;
    const existing = editingProduct.packagingVariants || [];
    const basePrice = editingProduct.priceBase || 15000;
    let suggestedPrice = Math.round((basePrice * ratio) / 100) * 100;
    if (suggestedPrice < 500) suggestedPrice = 1000;
    
    const newVariant: RetailPackagingVariant = {
      id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: defaultName,
      ratioToBase: ratio,
      unitLabel: editingProduct.baseUnit || 'Pcs',
      sellingPrice: suggestedPrice,
      costPrice: Math.round(((editingProduct.costBase || 0) * ratio) / 100) * 100,
    };
    setEditingProduct({
      ...editingProduct,
      packagingVariants: [...existing, newVariant],
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-4 pb-24 lg:pb-6">
      
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-3 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      
      {/* Top Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Manajemen Stok Sembako &amp; Multi-Satuan
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sinkronisasi otomatis stok Dus ↔ Renteng ↔ Pcs ↔ Kg &amp; Gram
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle between inventory table and stock flow logs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Katalog Stok
            </button>
            <button
              onClick={() => setActiveTab('stock_logs')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'stock_logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Log Stok</span>
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenAddProduct}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Search & Category Filter Controls */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama barang atau kode SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="all">Semua Status Stok</option>
              <option value="low">Stok Menipis</option>
              <option value="out">Stok Habis</option>
            </select>
          </div>

          {/* Product Inventory Table (Responsive) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Barang &amp; SKU</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Satuan &amp; Rasio Bertingkat</th>
                    <th className="py-3 px-3">Sisa Stok Utama</th>
                    <th className="py-3 px-3">Harga Beli (Modal)</th>
                    <th className="py-3 px-3">Harga Jual</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const isLow = p.stock <= p.minStockAlert && p.stock > 0;
                    const isOut = p.stock <= 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        {/* Name & SKU with Product Type Badge */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.isWeighable && (
                              <span title="Barang Timbangan">
                                <Scale className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-[10px] text-slate-400 font-semibold">{p.code}</span>
                            {/* Product Type Badge */}
                            {(p.baseUnit === 'kg' || p.isWeighable) ? (
                              <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                                KG / TIMBANG
                              </span>
                            ) : (p.rasioRencengPerDus || p.packagingVariants?.some(v => v.name.toLowerCase().includes('dus') || v.name.toLowerCase().includes('box'))) ? (
                              <span className="text-[9px] font-black bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                                BOX / GROSIR
                              </span>
                            ) : p.baseUnit === 'liter' ? (
                              <span className="text-[9px] font-black bg-cyan-50 text-cyan-800 px-1.5 py-0.2 rounded border border-cyan-200">
                                LITER / CAIR
                              </span>
                            ) : (
                              <span className="text-[9px] font-black bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200">
                                PCS / RETAIL
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {p.category}
                          </span>
                        </td>

                        {/* Multi-Tier Units & Packaging Variants Info */}
                        <td className="py-3.5 px-3">
                          {p.packagingVariants && p.packagingVariants.length > 0 ? (
                            <div className="space-y-1 text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                  Base: <strong className="uppercase">{p.baseUnit}</strong>
                                </span>
                                <span className="text-[10px] text-slate-400">&bull; {p.packagingVariants.length} Varian</span>
                              </div>
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {p.packagingVariants.map((v, vIdx) => (
                                  <span
                                    key={v.id || vIdx}
                                    className="bg-amber-50/90 text-amber-900 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded font-bold"
                                    title={`1 ${v.name} = ${v.ratioToBase} ${p.baseUnit}`}
                                  >
                                    {v.name} {v.ratioToBase > 1 ? `(${v.ratioToBase} ${p.baseUnit})` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : p.rasioRencengPerDus && p.rasioPcsPerRenceng ? (
                            <div className="space-y-1">
                              <div className="font-extrabold text-amber-950 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300 text-[10px] inline-block shadow-2xs">
                                1 Dus = {p.rasioRencengPerDus} Renceng = {p.rasioRencengPerDus * p.rasioPcsPerRenceng} Pcs
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Dus</span>
                                <span>➔</span>
                                <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">Renceng</span>
                                <span>➔</span>
                                <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">Pcs</span>
                              </div>
                            </div>
                          ) : (p.baseUnit === 'kg' || p.isWeighable || p.hargaJualKg) ? (
                            <div className="space-y-1">
                              <div className="font-extrabold text-emerald-950 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300 text-[10px] inline-block shadow-2xs">
                                1 KG = 1.000 Gram (Timbangan)
                              </div>
                              <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-600 font-bold">
                                <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">1 KG</span>
                                <span>•</span>
                                <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">500g</span>
                                <span>•</span>
                                <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">250g</span>
                                <span>•</span>
                                <span className="bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200">100g</span>
                              </div>
                            </div>
                          ) : p.baseUnit === 'liter' ? (
                            <div className="space-y-1">
                              <div className="font-extrabold text-cyan-950 bg-cyan-100/90 px-2 py-0.5 rounded-md border border-cyan-300 text-[10px] inline-block shadow-2xs">
                                1 Liter = 1.000 ml
                              </div>
                              <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-600 font-bold">
                                <span className="bg-cyan-50 text-cyan-800 px-1.5 py-0.5 rounded border border-cyan-200">1 Liter</span>
                                <span>•</span>
                                <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">500 ml</span>
                                <span>•</span>
                                <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">250 ml</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5 text-[11px]">
                              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                1 {p.baseUnit}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Master Stock Status Badge & Converted Projections */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black shadow-2xs ${
                                isOut
                                  ? 'bg-red-100 text-red-700 border border-red-300'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              Stok Master: {p.stock.toLocaleString('id-ID')} {p.baseUnit}
                            </span>

                            {/* Real-time Sub-unit Projections */}
                            {p.packagingVariants && p.packagingVariants.length > 0 && p.stock > 0 ? (
                              <div className="text-[10px] text-slate-600 font-medium">
                                {p.packagingVariants.slice(0, 2).map((v, i) => (
                                  <span key={v.id || i}>
                                    {i > 0 && ' • '}
                                    ≈ {v.ratioToBase > 0 ? (p.stock / v.ratioToBase).toFixed(v.ratioToBase < 1 ? 0 : 1) : 0} {v.name}
                                  </span>
                                ))}
                              </div>
                            ) : p.rasioRencengPerDus && p.rasioPcsPerRenceng && p.stock > 0 ? (
                              <div className="text-[10px] text-slate-600 font-semibold">
                                ≈ {(p.stock / (p.rasioRencengPerDus * p.rasioPcsPerRenceng)).toFixed(1)} Dus ({Math.floor(p.stock / p.rasioPcsPerRenceng).toLocaleString('id-ID')} Renceng)
                              </div>
                            ) : (p.baseUnit === 'kg' || p.isWeighable) && p.stock > 0 ? (
                              <div className="text-[10px] text-slate-600 font-semibold">
                                ≈ {(p.stock / 0.5).toFixed(0)} bks (500g) &bull; {(p.stock / 0.25).toFixed(0)} bks (250g)
                              </div>
                            ) : p.baseUnit === 'liter' && p.stock > 0 ? (
                              <div className="text-[10px] text-slate-600 font-semibold">
                                ≈ {(p.stock / 0.5).toFixed(0)} btl (500ml) &bull; {(p.stock / 0.25).toFixed(0)} btl (250ml)
                              </div>
                            ) : null}
                          </div>
                        </td>

                        {/* Cost (HPP / Modal) */}
                        <td className="py-3.5 px-3 font-semibold text-slate-600">
                          {p.packagingVariants && p.packagingVariants.length > 0 ? (
                            <div className="space-y-1 text-xs">
                              {p.packagingVariants.slice(0, 3).map((v, vIdx) => {
                                const cost = v.costPrice || Math.round((p.costBase || 0) * (v.ratioToBase || 1));
                                return (
                                  <div key={v.id || vIdx} className="flex items-center justify-between gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[90px]">{v.name}:</span>
                                    <span className="font-black text-slate-800 text-[11px]">
                                      Rp {cost.toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                );
                              })}
                              {p.totalPurchaseCost ? (
                                <div className="text-[10px] text-emerald-800 font-bold pt-0.5">
                                  Faktur: Rp {p.totalPurchaseCost.toLocaleString('id-ID')}
                                </div>
                              ) : null}
                            </div>
                          ) : p.rasioRencengPerDus && p.rasioPcsPerRenceng ? (
                            <div className="space-y-0.5 text-xs">
                              <div className="text-slate-800 font-bold">
                                Rp {p.costBase.toLocaleString('id-ID')} <span className="text-[10px] text-slate-500">/ Pcs</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                Renceng: Rp {(p.costBase * p.rasioPcsPerRenceng).toLocaleString('id-ID')}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Dus: Rp {(p.costBase * p.rasioRencengPerDus * p.rasioPcsPerRenceng).toLocaleString('id-ID')}
                              </div>
                            </div>
                          ) : (p.baseUnit === 'kg' || p.isWeighable || p.hargaJualKg) ? (
                            <div className="space-y-0.5 text-xs">
                              <div className="text-slate-800 font-bold">
                                Rp {p.costBase.toLocaleString('id-ID')} <span className="text-[10px] text-slate-500">/ 1 kg</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                500g: Rp {Math.round(p.costBase * 0.5).toLocaleString('id-ID')}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                250g: Rp {Math.round(p.costBase * 0.25).toLocaleString('id-ID')} &bull; 100g: Rp {Math.round(p.costBase * 0.1).toLocaleString('id-ID')}
                              </div>
                            </div>
                          ) : p.baseUnit === 'liter' ? (
                            <div className="space-y-0.5 text-xs">
                              <div className="text-slate-800 font-bold">
                                Rp {p.costBase.toLocaleString('id-ID')} <span className="text-[10px] text-slate-500">/ 1 L</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                500 ml: Rp {Math.round(p.costBase * 0.5).toLocaleString('id-ID')}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-slate-800">Rp {p.costBase.toLocaleString('id-ID')}</span>
                              <span className="text-[10px] text-slate-400 block">/ {p.baseUnit}</span>
                            </div>
                          )}
                        </td>

                        {/* Selling Price (Stacked Clean Pills) */}
                        <td className="py-3.5 px-3 font-bold text-slate-900">
                          {p.packagingVariants && p.packagingVariants.length > 0 ? (
                            <div className="space-y-1 text-xs">
                              {p.packagingVariants.slice(0, 3).map((v, vIdx) => {
                                const cost = v.costPrice || Math.round((p.costBase || 0) * (v.ratioToBase || 1));
                                const marginPct = cost > 0 ? Math.round(((v.sellingPrice - cost) / cost) * 100) : 0;
                                const pillBg = vIdx === 0 
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                                  : vIdx === 1 
                                  ? 'bg-amber-50 text-amber-900 border-amber-200' 
                                  : 'bg-blue-50 text-blue-900 border-blue-200';

                                return (
                                  <div key={v.id || vIdx} className={`flex items-center justify-between gap-1.5 px-2 py-0.5 rounded border ${pillBg}`}>
                                    <span className="text-[10px] font-bold truncate max-w-[80px]">{v.name}:</span>
                                    <div className="text-right">
                                      <span className="font-black text-[11px]">
                                        Rp {v.sellingPrice.toLocaleString('id-ID')}
                                      </span>
                                      {marginPct > 0 && (
                                        <span className="text-[8px] font-extrabold ml-1 opacity-75">
                                          (+{marginPct}%)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : p.rasioRencengPerDus && p.rasioPcsPerRenceng ? (
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <span className="text-[10px] font-bold text-slate-600">Dus:</span>
                                <span className="font-black text-emerald-800">
                                  Rp {(p.hargaJualDus || (p.priceBase * p.rasioRencengPerDus * p.rasioPcsPerRenceng)).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <span className="text-[10px] font-bold text-slate-600">Renceng:</span>
                                <span className="font-black text-amber-900">
                                  Rp {(p.hargaJualRenceng || (p.priceBase * p.rasioPcsPerRenceng)).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                <span className="text-[10px] font-bold text-slate-600">Pcs:</span>
                                <span className="font-black text-blue-900">
                                  Rp {(p.hargaJualPcs || p.priceBase).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          ) : (p.baseUnit === 'kg' || p.isWeighable || p.hargaJualKg) ? (
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <span className="text-[10px] font-bold text-slate-600">1 KG:</span>
                                <span className="font-black text-emerald-800">
                                  Rp {(p.hargaJualKg || p.priceBase).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <span className="text-[10px] font-bold text-slate-600">500g:</span>
                                <span className="font-black text-amber-900">
                                  Rp {(p.hargaJualGram500 || Math.round(((p.hargaJualKg || p.priceBase) * 0.5) / 100) * 100).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                <span className="text-[10px] font-bold text-slate-600">250g:</span>
                                <span className="font-black text-blue-900">
                                  Rp {(p.hargaJualGram250 || Math.round(((p.hargaJualKg || p.priceBase) * 0.25) / 100) * 100).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                <span className="text-[10px] font-bold text-slate-600">100g:</span>
                                <span className="font-black text-purple-900">
                                  Rp {(p.hargaJualGram100 || Math.round(((p.hargaJualKg || p.priceBase) * 0.1) / 100) * 100).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          ) : p.baseUnit === 'liter' ? (
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between gap-1.5 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                                <span className="text-[10px] font-bold text-slate-600">1 Liter:</span>
                                <span className="font-black text-cyan-900">
                                  Rp {(p.priceBase || 0).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <span className="text-[10px] font-bold text-slate-600">500 ml:</span>
                                <span className="font-black text-amber-900">
                                  Rp {Math.round(((p.priceBase || 0) * 0.5) / 100 * 100).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="font-black text-slate-900">Rp {p.priceBase.toLocaleString('id-ID')}</span>
                              <span className="text-[10px] text-slate-400 block">/ {p.baseUnit}</span>
                            </div>
                          )}
                        </td>

                        {/* Actions: Restock, Edit, Delete */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Restock Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRestock(p);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 border border-emerald-200 transition"
                              title="Restok Barang Masuk"
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              <span>Restok</span>
                            </button>

                            {/* Edit Product Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditProduct(p);
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-slate-50 border border-slate-200 rounded-lg transition"
                              title="Edit Data Produk"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Product Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingProductTarget(p);
                              }}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 bg-red-50/50 border border-red-200 rounded-lg transition"
                              title="Hapus Produk dari Database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* AUDIT STOCK LOGS TAB */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Riwayat Perubahan Stok (Audit Logs)</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Total {stockLogs.length} Entri Catatan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-3">Kode &amp; Nama Barang</th>
                  <th className="py-2.5 px-3">Jenis Transaksi</th>
                  <th className="py-2.5 px-3">Jumlah Masuk/Keluar</th>
                  <th className="py-2.5 px-3">Perubahan Stok</th>
                  <th className="py-2.5 px-3">Harga Beli &amp; HPP (Audit Keuangan)</th>
                  <th className="py-2.5 px-4">Catatan Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {stockLogs.map((log) => {
                  const isAdd = log.baseQuantityChange > 0;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800">{log.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{log.productCode}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.type === 'RESTOK_MASUK'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.type === 'PENJUALAN_POS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {log.type === 'RESTOK_MASUK' ? 'Restok Masuk' : log.type === 'PENJUALAN_POS' ? 'Penjualan Kasir' : 'Penyesuaian'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap">
                        {log.originalQuantity} {log.originalUnit}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`font-black px-2 py-0.5 rounded ${
                            isAdd ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {isAdd ? `+${log.baseQuantityChange}` : log.baseQuantityChange} {log.baseUnit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {log.type === 'RESTOK_MASUK' && (log.unitCost !== undefined || log.totalCost !== undefined) ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800">
                              Rp {(log.unitCost || 0).toLocaleString('id-ID')} <span className="text-[10px] text-slate-500 font-normal">/ {log.originalUnit}</span>
                            </div>
                            <div className="text-[10px] text-emerald-800 font-bold">
                              Faktur: Rp {(log.totalCost || 0).toLocaleString('id-ID')}
                            </div>
                            {log.newHppBase !== undefined && (
                              <div className="text-[9px] text-slate-500 flex items-center gap-1 font-mono pt-0.5">
                                <span>HPP: Rp {(log.oldHppBase || 0).toLocaleString('id-ID')} ➔ <strong>Rp {log.newHppBase.toLocaleString('id-ID')}</strong></span>
                                <span className={`px-1 rounded text-[8px] font-bold ${
                                  log.hppMethod === 'last_price' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {log.hppMethod === 'last_price' ? 'Terakhir' : 'Rata2'}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : log.type === 'PENJUALAN_POS' ? (
                          <span className="text-[10px] text-slate-400 font-medium">Transaksi Kasir</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 italic">
                        {log.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RESTOCK MODAL WITH WEIGHTED AVERAGE & LAST PRICE HPP ENGINE */}
      {restockProductTarget && (() => {
        const product = restockProductTarget;
        const availableUnits = storage.getAvailableUnitsForProduct(product);
        const matchedUnit = availableUnits.find((u) => u.unit.toLowerCase() === restockUnit.toLowerCase()) || availableUnits[0] || {
          unit: product.baseUnit,
          ratio: 1,
          price: product.priceBase || 0,
          cost: product.costBase || 0,
          label: product.baseUnit,
        };

        const unitRatio = matchedUnit.ratio > 0 ? matchedUnit.ratio : 1;
        const safeQty = Math.max(0, Number(restockQty) || 0);
        const baseAdded = Math.round((safeQty * unitRatio) * 10000) / 10000;
        const currentStock = Math.max(0, Number(product.stock) || 0);
        const newStock = Math.round((product.stock + baseAdded) * 10000) / 10000;
        
        const currentHppBase = Math.max(0, Number(product.costBase) || 0);
        const supplierCost = Math.max(0, Number(restockCost) || 0);
        const supplierBaseCost = unitRatio > 0 ? supplierCost / unitRatio : supplierCost;
        const totalInvoice = Math.round(safeQty * supplierCost);

        // Calculate simulated HPP
        let simulatedHppBase = currentHppBase;
        if (supplierCost > 0) {
          if (restockHppMethod === 'last_price' || currentStock <= 0) {
            simulatedHppBase = Math.round(supplierBaseCost);
          } else {
            const oldAssetValue = currentStock * currentHppBase;
            const newBatchValue = baseAdded * supplierBaseCost;
            const totalBaseUnits = currentStock + baseAdded;
            simulatedHppBase = totalBaseUnits > 0 
              ? Math.round((oldAssetValue + newBatchValue) / totalBaseUnits) 
              : Math.round(supplierBaseCost);
          }
        }

        const hppDiff = simulatedHppBase - currentHppBase;
        const hppDiffPct = currentHppBase > 0 ? ((hppDiff / currentHppBase) * 100).toFixed(1) : '0';

        // Detect product unit family for breakdowns
        const isBoxType = Boolean(product.rasioRencengPerDus && product.rasioPcsPerRenceng) || 
          product.tierConfig?.tier3Name === 'dus' || 
          product.baseUnit === 'dus' || 
          (product.packagingVariants?.some(v => v.name.toLowerCase().includes('dus')));

        const rencengPerDus = product.rasioRencengPerDus || 48;
        const pcsPerRenceng = product.rasioPcsPerRenceng || 10;
        const totalPerDus = rencengPerDus * pcsPerRenceng;

        const isKgType = product.isWeighable || product.baseUnit === 'kg' || Boolean(product.hargaJualKg);
        const isLiterType = product.baseUnit === 'liter';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95">
              
              {/* MODAL HEADER */}
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                    <PackagePlus className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-white">Restok Barang Masuk &amp; Update HPP</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {isBoxType ? 'DUS / BOX' : isKgType ? 'KG / WEIGH' : isLiterType ? 'LITER / CAIR' : 'PCS / RETAIL'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-semibold mt-0.5">
                      {product.name} &bull; <span className="font-mono text-emerald-400">{product.code}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRestockProductTarget(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              {/* MODAL BODY (SCROLLABLE) */}
              <div className="p-5 space-y-4 overflow-y-auto text-xs">
                
                {/* Product Snapshot Info Card */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Stok Master Saat Ini</span>
                    <span className="font-black text-sm text-slate-900">
                      {formatNumberWithDots(product.stock, isKgType || isLiterType)} {product.baseUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">HPP Modal Master</span>
                    <span className="font-black text-sm text-emerald-800">
                      Rp {currentHppBase.toLocaleString('id-ID')} <span className="text-[10px] text-slate-500 font-normal">/ {product.baseUnit}</span>
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Nilai Aset Lama</span>
                    <span className="font-black text-xs text-slate-700">
                      Rp {Math.round(currentStock * currentHppBase).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Restock Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Unit Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Pilih Satuan Barang Masuk:
                    </label>
                    <select
                      value={restockUnit}
                      onChange={(e) => {
                        const selected = e.target.value;
                        setRestockUnit(selected);
                        const matched = availableUnits.find((u) => u.unit === selected);
                        if (matched) setRestockCost(matched.cost);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      {availableUnits.map((u, uIdx) => {
                        let cleanLabel = u.unit;
                        if (u.isVariant) {
                          cleanLabel = `${u.unit} (${u.ratio} ${product.baseUnit})`;
                        } else if (u.unit.toLowerCase() === product.baseUnit.toLowerCase() || Math.abs(u.ratio - 1) < 0.0001) {
                          cleanLabel = `${u.unit.toUpperCase()} (Satuan Utama)`;
                        } else if (u.ratio && u.ratio !== 1) {
                          cleanLabel = `${u.unit} (Isi ${u.ratio} ${product.baseUnit})`;
                        }

                        return (
                          <option key={`${u.variantId || u.unit}-${uIdx}`} value={u.unit}>
                            {cleanLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Restock Quantity */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Jumlah Masuk ({restockUnit}):
                    </label>
                    <FormattedNumberInput
                      value={restockQty}
                      onChange={(val) => setRestockQty(Math.max(0, val))}
                      allowDecimal={isKgType || isLiterType || restockUnit === 'kg'}
                      suffix={restockUnit}
                      className="bg-white font-bold"
                      placeholder="1"
                    />
                  </div>
                </div>

                {/* Supplier Purchase Cost */}
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-emerald-950">
                      Harga Beli Baru dari Supplier (per {restockUnit}):
                    </label>
                    {unitRatio > 1 && supplierCost > 0 && (
                      <span className="text-[11px] font-bold text-emerald-800">
                        = Rp {Math.round(supplierBaseCost).toLocaleString('id-ID')} / {product.baseUnit}
                      </span>
                    )}
                  </div>
                  <FormattedNumberInput
                    value={restockCost}
                    onChange={(val) => setRestockCost(Math.max(0, val))}
                    prefix="Rp"
                    className="bg-white font-black text-slate-900 text-sm"
                    placeholder="0"
                  />
                  <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-900 pt-0.5">
                    <span>Total Faktur Pembelian:</span>
                    <span className="font-black text-xs text-emerald-800">
                      Rp {totalInvoice.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* HPP Calculation Method Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Pilih Metode Pembaruan HPP (Harga Pokok Penjualan):
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Method 1: Weighted Average */}
                    <div
                      onClick={() => setRestockHppMethod('weighted_average')}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        restockHppMethod === 'weighted_average'
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                            <input
                              type="radio"
                              name="hppMethod"
                              checked={restockHppMethod === 'weighted_average'}
                              onChange={() => setRestockHppMethod('weighted_average')}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Rata-Rata Tertimbang</span>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                            Rekomendasi
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-tight">
                          ((Stok Lama &times; HPP Lama) + (Stok Masuk &times; Harga Baru)) &divide; Total Stok. Menjaga HPP seimbang &amp; presisi.
                        </p>
                      </div>
                    </div>

                    {/* Method 2: Last Purchase Price */}
                    <div
                      onClick={() => setRestockHppMethod('last_price')}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        restockHppMethod === 'last_price'
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                            <input
                              type="radio"
                              name="hppMethod"
                              checked={restockHppMethod === 'last_price'}
                              onChange={() => setRestockHppMethod('last_price')}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Harga Terakhir</span>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                            Replacement
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 leading-tight">
                          HPP langsung diganti 100% mengikuti harga beli masuk dari faktur terbaru supplier ini.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LIVE CALCULATION SIMULATION BREAKDOWN */}
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-emerald-400">
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      <span>Simulasi Live Perhitungan Stok &amp; HPP:</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {restockHppMethod === 'weighted_average' ? 'Weighted Average' : 'Last Purchase Price'}
                    </span>
                  </div>

                  {/* Stock projection */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Penambahan Stok Dasar:</span>
                      <span className="font-bold text-emerald-400">
                        +{safeQty} {restockUnit} = +{formatNumberWithDots(baseAdded, isKgType || isLiterType)} {product.baseUnit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Proyeksi Total Stok Master:</span>
                      <span className="font-bold text-white">
                        {formatNumberWithDots(currentStock, isKgType || isLiterType)} ➔ <strong className="text-emerald-300 text-xs">{formatNumberWithDots(newStock, isKgType || isLiterType)} {product.baseUnit}</strong>
                      </span>
                    </div>
                  </div>

                  {/* HPP Result Banner */}
                  <div className="bg-emerald-950/70 border border-emerald-500/40 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-300 block tracking-wider">
                        HPP Master Baru ({product.baseUnit}):
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-base font-black text-emerald-400">
                          Rp {simulatedHppBase.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-slate-400 line-through">
                          Rp {currentHppBase.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {hppDiff > 0 ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          <TrendingUp className="w-3 h-3 text-amber-400" />
                          <span>+Rp {hppDiff.toLocaleString('id-ID')} (+{hppDiffPct}%)</span>
                        </div>
                      ) : hppDiff < 0 ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          <TrendingDown className="w-3 h-3 text-emerald-400" />
                          <span>-Rp {Math.abs(hppDiff).toLocaleString('id-ID')} ({hppDiffPct}%)</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          Harga Tetap
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sub-unit HPP Breakdown according to 4 product types */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider">
                      Jabaran HPP Baru per Satuan &amp; Kemasan Turunan:
                    </span>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                      {product.packagingVariants && product.packagingVariants.length > 0 ? (
                        product.packagingVariants.map((v, vIdx) => {
                          const newCost = Math.round(simulatedHppBase * (v.ratioToBase > 0 ? v.ratioToBase : 1));
                          return (
                            <div key={v.id || vIdx} className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg">
                              <span className="text-[10px] text-slate-400 block truncate">{v.name}:</span>
                              <span className="font-bold text-white text-xs">Rp {newCost.toLocaleString('id-ID')}</span>
                            </div>
                          );
                        })
                      ) : isBoxType ? (
                        <>
                          <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg">
                            <span className="text-[10px] text-slate-400 block">Pcs (Satuan Dasar):</span>
                            <span className="font-bold text-white text-xs">Rp {simulatedHppBase.toLocaleString('id-ID')}</span>
                          </div>
                          {product.rasioPcsPerRenceng && (
                            <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg">
                              <span className="text-[10px] text-slate-400 block">Renceng ({product.rasioPcsPerRenceng} pcs):</span>
                              <span className="font-bold text-white text-xs">Rp {(simulatedHppBase * product.rasioPcsPerRenceng).toLocaleString('id-ID')}</span>
                            </div>
                          )}
                          {product.rasioRencengPerDus && product.rasioPcsPerRenceng && (
                            <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg col-span-2 sm:col-span-1">
                              <span className="text-[10px] text-slate-400 block">Dus ({product.rasioRencengPerDus * product.rasioPcsPerRenceng} pcs):</span>
                              <span className="font-bold text-white text-xs">Rp {(simulatedHppBase * product.rasioRencengPerDus * product.rasioPcsPerRenceng).toLocaleString('id-ID')}</span>
                            </div>
                          )}
                        </>
                      ) : isKgType ? (
                        <>
                          <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg">
                            <span className="text-[10px] text-slate-400 block">1 KG:</span>
                            <span className="font-bold text-white text-xs">Rp {simulatedHppBase.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg">
                            <span className="text-[10px] text-slate-400 block">500 gram (1/2 kg):</span>
                            <span className="font-bold text-white text-xs">Rp {Math.round(simulatedHppBase * 0.5).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg">
                            <span className="text-[10px] text-slate-400 block">250 gram (1/4 kg):</span>
                            <span className="font-bold text-white text-xs">Rp {Math.round(simulatedHppBase * 0.25).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg">
                            <span className="text-[10px] text-slate-400 block">100 gram (1 ons):</span>
                            <span className="font-bold text-white text-xs">Rp {Math.round(simulatedHppBase * 0.1).toLocaleString('id-ID')}</span>
                          </div>
                          {product.tierConfig?.tier3Ratio && (
                            <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg col-span-2">
                              <span className="text-[10px] text-slate-400 block">{product.tierConfig.tier3Name || 'Karung'} ({product.tierConfig.tier3Ratio} kg):</span>
                              <span className="font-bold text-white text-xs">Rp {Math.round(simulatedHppBase * product.tierConfig.tier3Ratio).toLocaleString('id-ID')}</span>
                            </div>
                          )}
                        </>
                      ) : isLiterType ? (
                        <>
                          <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg">
                            <span className="text-[10px] text-slate-400 block">1 Liter:</span>
                            <span className="font-bold text-white text-xs">Rp {simulatedHppBase.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg">
                            <span className="text-[10px] text-slate-400 block">500 ml:</span>
                            <span className="font-bold text-white text-xs">Rp {Math.round(simulatedHppBase * 0.5).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg">
                            <span className="text-[10px] text-slate-400 block">250 ml:</span>
                            <span className="font-bold text-white text-xs">Rp {Math.round(simulatedHppBase * 0.25).toLocaleString('id-ID')}</span>
                          </div>
                        </>
                      ) : (
                        <div className="bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded-lg">
                          <span className="text-[10px] text-slate-400 block">{product.baseUnit.toUpperCase()}:</span>
                          <span className="font-bold text-white text-xs">Rp {simulatedHppBase.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 4: PENYESUAIAN HARGA JUAL OTOMATIS BERDASARKAN HPP BARU */}
                <div className="bg-white border-2 border-emerald-400/80 rounded-2xl p-4 space-y-3.5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2 font-black text-slate-900 text-xs">
                        <Coins className="w-4 h-4 text-emerald-600" />
                        <span>Penyesuaian Harga Jual Satuan (Sinkron Real-time ke Kasir):</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Otomatis hitung harga jual dengan margin untung dari HPP baru atau ketik nominal manual per level satuan.
                      </p>
                    </div>

                    {/* Quick Preset Margin Buttons */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-slate-500 font-bold">Preset Margin:</span>
                      {[10, 15, 20, 25, 30].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            // Update packagingVariants if present
                            if (restockPackagingVariants.length > 0) {
                              setRestockPackagingVariants((prev) =>
                                prev.map((v) => {
                                  const vCost = Math.round(simulatedHppBase * (v.ratioToBase > 0 ? v.ratioToBase : 1));
                                  const vPrice = Math.round((vCost * (1 + pct / 100)) / (vCost < 2000 ? 50 : 100)) * (vCost < 2000 ? 50 : 100);
                                  return { ...v, sellingPrice: vPrice, costPrice: vCost };
                                })
                              );
                            }

                            // Update KG
                            if (isKgType) {
                              const pKg = Math.round((simulatedHppBase * (1 + pct / 100)) / 100) * 100;
                              const p500 = Math.round((simulatedHppBase * 0.5 * (1 + pct / 100)) / 100) * 100;
                              const p250 = Math.round((simulatedHppBase * 0.25 * (1 + pct / 100)) / 100) * 100;
                              const p100 = Math.round((simulatedHppBase * 0.1 * (1 + pct / 100)) / 50) * 50;
                              setRestockHargaJualKg(pKg);
                              setRestockHargaJualGram500(p500);
                              setRestockHargaJualGram250(p250);
                              setRestockHargaJualGram100(p100);
                              setRestockPriceBase(pKg);
                            }

                            // Update Box / Wholesale
                            if (isBoxType) {
                              const pPcs = Math.round((simulatedHppBase * (1 + (pct + 10) / 100)) / 50) * 50;
                              const pRenceng = pcsPerRenceng > 0 ? Math.round((simulatedHppBase * pcsPerRenceng * (1 + (pct + 5) / 100)) / 100) * 100 : 0;
                              const pDus = totalPerDus > 0 ? Math.round((simulatedHppBase * totalPerDus * (1 + pct / 100)) / 500) * 500 : 0;
                              setRestockHargaJualPcs(pPcs);
                              setRestockHargaJualRenceng(pRenceng);
                              setRestockHargaJualDus(pDus);
                              setRestockPriceBase(pPcs);
                            }

                            // Update Liter
                            if (isLiterType) {
                              const pL = Math.round((simulatedHppBase * (1 + pct / 100)) / 100) * 100;
                              setRestockPriceBase(pL);
                            }

                            // Standard Pcs
                            if (!isKgType && !isBoxType && !isLiterType && restockPackagingVariants.length === 0) {
                              const p = Math.round((simulatedHppBase * (1 + pct / 100)) / 50) * 50;
                              setRestockPriceBase(p);
                              setRestockHargaJualPcs(p);
                            }
                          }}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white font-bold border border-emerald-300 transition shadow-2xs"
                          title={`Terapkan margin +${pct}% ke semua harga jual`}
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detail Price Inputs based on Product Type */}
                  <div className="space-y-2.5">
                    {/* A. If product has Packaging Variants (Custom Variants or Box/Liter Packagings) */}
                    {restockPackagingVariants.length > 0 ? (
                      <div className="space-y-2">
                        {restockPackagingVariants.map((v, vIdx) => {
                          const vCost = Math.round(simulatedHppBase * (v.ratioToBase > 0 ? v.ratioToBase : 1));
                          const vSelling = v.sellingPrice || 0;
                          const profit = vSelling - vCost;
                          const marginPct = vSelling > 0 ? Math.round((profit / vSelling) * 100) : 0;

                          return (
                            <div
                              key={v.id || vIdx}
                              className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                            >
                              <div className="sm:col-span-4">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Varian / Satuan</span>
                                <span className="font-bold text-xs text-slate-900 block truncate">{v.name}</span>
                                <span className="text-[9px] text-slate-400 block mt-0.5">
                                  HPP Baru: <strong>Rp {vCost.toLocaleString('id-ID')}</strong>
                                </span>
                              </div>

                              <div className="sm:col-span-4">
                                <label className="text-[10px] font-bold text-emerald-900 block mb-0.5">Harga Jual Kasir (Rp):</label>
                                <FormattedNumberInput
                                  value={vSelling}
                                  onChange={(val) => {
                                    const updated = [...restockPackagingVariants];
                                    updated[vIdx] = { ...updated[vIdx], sellingPrice: val };
                                    setRestockPackagingVariants(updated);
                                  }}
                                  prefix="Rp"
                                  className="bg-white font-black text-emerald-950 text-xs"
                                />
                              </div>

                              <div className="sm:col-span-4">
                                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Laba Bersih &amp; Margin:</label>
                                <div className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-between ${
                                  profit >= 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                  <span>{profit >= 0 ? 'Untung:' : 'Rugi:'}</span>
                                  <span className="font-mono">
                                    {profit >= 0 ? `+Rp ${profit.toLocaleString('id-ID')} (${marginPct}%)` : `-Rp ${Math.abs(profit).toLocaleString('id-ID')}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : isKgType ? (
                      /* B. KG Type (1 KG, 500g, 250g, 100g) */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* 1 KG */}
                        {(() => {
                          const costKg = simulatedHppBase;
                          const profitKg = restockHargaJualKg - costKg;
                          const marginKg = restockHargaJualKg > 0 ? Math.round((profitKg / restockHargaJualKg) * 100) : 0;
                          return (
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">1 KG (Pokok)</span>
                                <span className="text-[10px] text-slate-500">HPP: Rp {costKg.toLocaleString('id-ID')}</span>
                              </div>
                              <FormattedNumberInput
                                value={restockHargaJualKg}
                                onChange={(val) => {
                                  setRestockHargaJualKg(val);
                                  setRestockPriceBase(val);
                                }}
                                prefix="Rp"
                                className="bg-white font-black text-emerald-900 text-xs"
                              />
                              <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center justify-between ${
                                profitKg >= 0 ? 'bg-emerald-100/70 text-emerald-900' : 'bg-red-100 text-red-700'
                              }`}>
                                <span>Laba per kg:</span>
                                <span>{profitKg >= 0 ? `+Rp ${profitKg.toLocaleString('id-ID')} (${marginKg}%)` : `-Rp ${Math.abs(profitKg).toLocaleString('id-ID')}`}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* 500 Gram */}
                        {(() => {
                          const cost500 = Math.round(simulatedHppBase * 0.5);
                          const profit500 = restockHargaJualGram500 - cost500;
                          const margin500 = restockHargaJualGram500 > 0 ? Math.round((profit500 / restockHargaJualGram500) * 100) : 0;
                          return (
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">500 Gram (1/2 kg)</span>
                                <span className="text-[10px] text-slate-500">HPP: Rp {cost500.toLocaleString('id-ID')}</span>
                              </div>
                              <FormattedNumberInput
                                value={restockHargaJualGram500}
                                onChange={(val) => setRestockHargaJualGram500(val)}
                                prefix="Rp"
                                className="bg-white font-black text-emerald-900 text-xs"
                              />
                              <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center justify-between ${
                                profit500 >= 0 ? 'bg-emerald-100/70 text-emerald-900' : 'bg-red-100 text-red-700'
                              }`}>
                                <span>Laba 500g:</span>
                                <span>{profit500 >= 0 ? `+Rp ${profit500.toLocaleString('id-ID')} (${margin500}%)` : `-Rp ${Math.abs(profit500).toLocaleString('id-ID')}`}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* 250 Gram */}
                        {(() => {
                          const cost250 = Math.round(simulatedHppBase * 0.25);
                          const profit250 = restockHargaJualGram250 - cost250;
                          const margin250 = restockHargaJualGram250 > 0 ? Math.round((profit250 / restockHargaJualGram250) * 100) : 0;
                          return (
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">250 Gram (1/4 kg)</span>
                                <span className="text-[10px] text-slate-500">HPP: Rp {cost250.toLocaleString('id-ID')}</span>
                              </div>
                              <FormattedNumberInput
                                value={restockHargaJualGram250}
                                onChange={(val) => setRestockHargaJualGram250(val)}
                                prefix="Rp"
                                className="bg-white font-black text-emerald-900 text-xs"
                              />
                              <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center justify-between ${
                                profit250 >= 0 ? 'bg-emerald-100/70 text-emerald-900' : 'bg-red-100 text-red-700'
                              }`}>
                                <span>Laba 250g:</span>
                                <span>{profit250 >= 0 ? `+Rp ${profit250.toLocaleString('id-ID')} (${margin250}%)` : `-Rp ${Math.abs(profit250).toLocaleString('id-ID')}`}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* 100 Gram */}
                        {(() => {
                          const cost100 = Math.round(simulatedHppBase * 0.1);
                          const profit100 = restockHargaJualGram100 - cost100;
                          const margin100 = restockHargaJualGram100 > 0 ? Math.round((profit100 / restockHargaJualGram100) * 100) : 0;
                          return (
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">100 Gram (1 Ons)</span>
                                <span className="text-[10px] text-slate-500">HPP: Rp {cost100.toLocaleString('id-ID')}</span>
                              </div>
                              <FormattedNumberInput
                                value={restockHargaJualGram100}
                                onChange={(val) => setRestockHargaJualGram100(val)}
                                prefix="Rp"
                                className="bg-white font-black text-emerald-900 text-xs"
                              />
                              <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center justify-between ${
                                profit100 >= 0 ? 'bg-emerald-100/70 text-emerald-900' : 'bg-red-100 text-red-700'
                              }`}>
                                <span>Laba 100g:</span>
                                <span>{profit100 >= 0 ? `+Rp ${profit100.toLocaleString('id-ID')} (${margin100}%)` : `-Rp ${Math.abs(profit100).toLocaleString('id-ID')}`}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : isBoxType ? (
                      /* C. Box / Wholesale without packagingVariants (Dus, Renceng, Pcs) */
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Dus */}
                        {(() => {
                          const costDus = Math.round(simulatedHppBase * totalPerDus);
                          const profitDus = restockHargaJualDus - costDus;
                          const marginDus = restockHargaJualDus > 0 ? Math.round((profitDus / restockHargaJualDus) * 100) : 0;
                          return (
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">Dus ({totalPerDus} pcs)</span>
                                <span className="text-[10px] text-slate-500">HPP: Rp {costDus.toLocaleString('id-ID')}</span>
                              </div>
                              <FormattedNumberInput
                                value={restockHargaJualDus}
                                onChange={(val) => setRestockHargaJualDus(val)}
                                prefix="Rp"
                                className="bg-white font-black text-emerald-900 text-xs"
                              />
                              <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center justify-between ${
                                profitDus >= 0 ? 'bg-emerald-100/70 text-emerald-900' : 'bg-red-100 text-red-700'
                              }`}>
                                <span>Laba Dus:</span>
                                <span>{profitDus >= 0 ? `+Rp ${profitDus.toLocaleString('id-ID')} (${marginDus}%)` : `-Rp ${Math.abs(profitDus).toLocaleString('id-ID')}`}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Renceng */}
                        {(() => {
                          const costRenceng = Math.round(simulatedHppBase * pcsPerRenceng);
                          const profitRenceng = restockHargaJualRenceng - costRenceng;
                          const marginRenceng = restockHargaJualRenceng > 0 ? Math.round((profitRenceng / restockHargaJualRenceng) * 100) : 0;
                          return (
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">Renceng ({pcsPerRenceng} pcs)</span>
                                <span className="text-[10px] text-slate-500">HPP: Rp {costRenceng.toLocaleString('id-ID')}</span>
                              </div>
                              <FormattedNumberInput
                                value={restockHargaJualRenceng}
                                onChange={(val) => setRestockHargaJualRenceng(val)}
                                prefix="Rp"
                                className="bg-white font-black text-emerald-900 text-xs"
                              />
                              <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center justify-between ${
                                profitRenceng >= 0 ? 'bg-emerald-100/70 text-emerald-900' : 'bg-red-100 text-red-700'
                              }`}>
                                <span>Laba Renceng:</span>
                                <span>{profitRenceng >= 0 ? `+Rp ${profitRenceng.toLocaleString('id-ID')} (${marginRenceng}%)` : `-Rp ${Math.abs(profitRenceng).toLocaleString('id-ID')}`}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Pcs */}
                        {(() => {
                          const costPcs = simulatedHppBase;
                          const profitPcs = restockHargaJualPcs - costPcs;
                          const marginPcs = restockHargaJualPcs > 0 ? Math.round((profitPcs / restockHargaJualPcs) * 100) : 0;
                          return (
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">Pcs (Eceran)</span>
                                <span className="text-[10px] text-slate-500">HPP: Rp {costPcs.toLocaleString('id-ID')}</span>
                              </div>
                              <FormattedNumberInput
                                value={restockHargaJualPcs}
                                onChange={(val) => {
                                  setRestockHargaJualPcs(val);
                                  setRestockPriceBase(val);
                                }}
                                prefix="Rp"
                                className="bg-white font-black text-emerald-900 text-xs"
                              />
                              <div className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center justify-between ${
                                profitPcs >= 0 ? 'bg-emerald-100/70 text-emerald-900' : 'bg-red-100 text-red-700'
                              }`}>
                                <span>Laba Pcs:</span>
                                <span>{profitPcs >= 0 ? `+Rp ${profitPcs.toLocaleString('id-ID')} (${marginPcs}%)` : `-Rp ${Math.abs(profitPcs).toLocaleString('id-ID')}`}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* D. Liter or Standard Pcs without packaging variants */
                      (() => {
                        const unitName = isLiterType ? '1 Liter' : `1 ${product.baseUnit.toUpperCase()}`;
                        const cost = simulatedHppBase;
                        const profit = restockPriceBase - cost;
                        const margin = restockPriceBase > 0 ? Math.round((profit / restockPriceBase) * 100) : 0;
                        return (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs text-slate-900">{unitName}</span>
                                <span className="text-[10px] text-slate-500">HPP Baru: Rp {cost.toLocaleString('id-ID')}</span>
                              </div>
                              <FormattedNumberInput
                                value={restockPriceBase}
                                onChange={(val) => {
                                  setRestockPriceBase(val);
                                  if (isKgType) setRestockHargaJualKg(val);
                                  if (isBoxType) setRestockHargaJualPcs(val);
                                }}
                                prefix="Rp"
                                className="bg-white font-black text-emerald-900 text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 block mb-1">Analisis Margin Untung:</span>
                              <div className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-between ${
                                profit >= 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                <span>{profit >= 0 ? 'Potensi Untung:' : 'Rugi:'}</span>
                                <span className="font-mono">
                                  {profit >= 0 ? `+Rp ${profit.toLocaleString('id-ID')} (${margin}%)` : `-Rp ${Math.abs(profit).toLocaleString('id-ID')}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>

                {/* Petty Cash Out Checkbox Option */}
                <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="recordPettyCash"
                    checked={restockRecordPettyCash}
                    onChange={(e) => setRestockRecordPettyCash(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0"
                  />
                  <label htmlFor="recordPettyCash" className="cursor-pointer">
                    <span className="font-bold text-amber-950 block text-xs">
                      Catat Otomatis ke Kas Toko (Pengeluaran Kas: Bayar Supplier)
                    </span>
                    <span className="text-[11px] text-amber-900 block mt-0.5">
                      {restockRecordPettyCash 
                        ? `Buku kas kasir akan mencatat pengeluaran sebesar Rp ${totalInvoice.toLocaleString('id-ID')} untuk pelunasan faktur supplier ini.`
                        : 'Biaya pembelian ini tidak akan dicatat ke buku kas harian kasir (misal faktur dibayar via rekening bank terpisah).'}
                    </span>
                  </label>
                </div>

                {/* Restock Notes / DO / Supplier */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Catatan Restok &amp; Dokumen / DO Supplier:
                  </label>
                  <input
                    type="text"
                    value={restockNotes}
                    onChange={(e) => setRestockNotes(e.target.value)}
                    placeholder="Contoh: No. DO #88921 - Toko Agen Sembako Makmur"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setRestockProductTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestock}
                  disabled={safeQty <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Restok (+{formatNumberWithDots(baseAdded, isKgType || isLiterType)} {product.baseUnit})</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* REVAMPED INPUT / EDIT PRODUCT DATA MODAL FORM */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            {/* MODAL HEADER */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-black text-sm text-white flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-emerald-400" />
                  <span>{editingProduct.id?.includes('prod-') ? 'Input Data Produk Baru' : 'Edit Data Produk'}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Formulir terpadu input produk sembako &amp; konversi rasio satuan terpusat
                </p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs transition"
              >
                ✕
              </button>
            </div>

            {/* STEP 1: PRIMARY UNIT / VARIANT TYPE SELECTION */}
            <div className="bg-slate-100 p-3.5 border-b border-slate-200">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>1. Pilih Tipe &amp; Satuan Utama Produk:</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                
                {/* [KG / Weight] Tab */}
                <button
                  type="button"
                  onClick={() => handleSelectProductType('kg')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    productType === 'kg'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400/50'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Scale className={`w-4 h-4 ${productType === 'kg' ? 'text-white' : 'text-emerald-600'}`} />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      productType === 'kg' ? 'bg-emerald-700/80 text-white' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      KG / Gram
                    </span>
                  </div>
                  <div className="font-black text-xs">KG / Weight</div>
                  <div className={`text-[10px] mt-0.5 ${productType === 'kg' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    Barang Timbangan
                  </div>
                </button>

                {/* [BOX / Wholesale (Dus)] Tab */}
                <button
                  type="button"
                  onClick={() => handleSelectProductType('box')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    productType === 'box'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-400/50'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Boxes className={`w-4 h-4 ${productType === 'box' ? 'text-white' : 'text-amber-600'}`} />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      productType === 'box' ? 'bg-amber-700/80 text-white' : 'bg-amber-50 text-amber-700'
                    }`}>
                      Grosir Dus
                    </span>
                  </div>
                  <div className="font-black text-xs">BOX / Wholesale</div>
                  <div className={`text-[10px] mt-0.5 ${productType === 'box' ? 'text-amber-100' : 'text-slate-500'}`}>
                    Dus &amp; Renteng
                  </div>
                </button>

                {/* [PCS / Retail] Tab */}
                <button
                  type="button"
                  onClick={() => handleSelectProductType('pcs')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    productType === 'pcs'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-400/50'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Package className={`w-4 h-4 ${productType === 'pcs' ? 'text-white' : 'text-blue-600'}`} />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      productType === 'pcs' ? 'bg-blue-700/80 text-white' : 'bg-blue-50 text-blue-700'
                    }`}>
                      Eceran Unit
                    </span>
                  </div>
                  <div className="font-black text-xs">PCS / Retail</div>
                  <div className={`text-[10px] mt-0.5 ${productType === 'pcs' ? 'text-blue-100' : 'text-slate-500'}`}>
                    Pcs / Bungkus
                  </div>
                </button>

                {/* [LITER / Liquid] Tab */}
                <button
                  type="button"
                  onClick={() => handleSelectProductType('liter')}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    productType === 'liter'
                      ? 'bg-cyan-600 text-white border-cyan-700 shadow-sm ring-2 ring-cyan-400/50'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Droplets className={`w-4 h-4 ${productType === 'liter' ? 'text-white' : 'text-cyan-600'}`} />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      productType === 'liter' ? 'bg-cyan-700/80 text-white' : 'bg-cyan-50 text-cyan-700'
                    }`}>
                      Barang Cair
                    </span>
                  </div>
                  <div className="font-black text-xs">LITER / Liquid</div>
                  <div className={`text-[10px] mt-0.5 ${productType === 'liter' ? 'text-cyan-100' : 'text-slate-500'}`}>
                    Liter &amp; Botol
                  </div>
                </button>
              </div>
            </div>

            {/* STEP 2: DYNAMIC INPUT FLOW BASED ON SELECTED TYPE */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs max-h-[65vh]">

              {/* Form Error Banner */}
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* COMMON PRIMARY INPUTS: SKU & CATEGORY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Kode Barang / SKU:</label>
                    <button
                      type="button"
                      onClick={handleGenerateAutoSku}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition"
                      title="Generasi Kode SKU Otomatis"
                    >
                      + Auto SKU
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editingProduct.code || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="BRG-009"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori Sembako:</label>
                  <select
                    value={editingProduct.category || categories[0]}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* PRODUCT NAME */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Produk / Barang:</label>
                <input
                  type="text"
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder={
                    productType === 'kg'
                      ? 'Contoh: Beras Rojo Lele Super / Minyak Goreng Curah'
                      : productType === 'box'
                      ? 'Contoh: Indomie Goreng (1 Dus = 40 pcs)'
                      : productType === 'liter'
                      ? 'Contoh: Minyak Goreng Bimoli 1 Liter'
                      : 'Contoh: Kopi Kapal Api Mix 25g'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                  required
                />
              </div>

              {/* UNIVERSAL OPTIONAL SUB-VARIANTS TOGGLE */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    editingProduct.enableSubVariants !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <label htmlFor="enableSubVariantsToggle" className="font-extrabold text-slate-900 text-xs block cursor-pointer">
                      [ ] Aktifkan Varian / Pecahan Turunan (Opsional)
                    </label>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {editingProduct.enableSubVariants !== false 
                        ? 'Aktif: Menampilkan tombol pilihan harga pecahan (gram, renceng, 500ml, varian kemasan) di menu kasir.'
                        : 'Non-aktif: Produk hanya dijual dalam 1 satuan utama (tanpa tombol pecahan di kasir).'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    id="enableSubVariantsToggle"
                    checked={editingProduct.enableSubVariants !== false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, enableSubVariants: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* FLOW A: KG / WEIGHT FORM (BARANG TIMBANGAN) */}
              {productType === 'kg' && (() => {
                const stockKg = Number(editingProduct.stock || 0);
                const totalCost = Number(editingProduct.totalPurchaseCost || 0);
                const costPerKg = Number(editingProduct.costBase || 0);
                const cost500g = Math.round(costPerKg * 0.5);
                const cost250g = Math.round(costPerKg * 0.25);
                const cost100g = Math.round(costPerKg * 0.1);
                const cost1g = costPerKg > 0 ? (costPerKg / 1000) : 0;
                const sellingPriceKg = Number(editingProduct.priceBase || editingProduct.hargaJualKg || 0);
                const profitPerKg = sellingPriceKg - costPerKg;
                const marginPctKg = sellingPriceKg > 0 ? Math.round((profitPerKg / sellingPriceKg) * 100) : 0;

                const applyMarginKg = (pct: number) => {
                  const targetPrice = Math.round((costPerKg * (1 + pct / 100)) / 100) * 100;
                  const target500 = Math.round((cost500g * (1 + pct / 100)) / 100) * 100;
                  const target250 = Math.round((cost250g * (1 + pct / 100)) / 100) * 100;
                  const target100 = Math.round((cost100g * (1 + (pct + 5) / 100)) / 50) * 50;
                  setEditingProduct({
                    ...editingProduct,
                    priceBase: targetPrice,
                    hargaJualKg: targetPrice,
                    hargaJualGram500: target500,
                    hargaJualGram250: target250,
                    hargaJualGram100: target100,
                  });
                };

                return (
                  <div className="space-y-4">
                    {/* INPUT SECTION: TOTAL STOK (KG) & TOTAL HARGA BELI (RP) */}
                    <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                          <Scale className="w-4 h-4 text-emerald-600" />
                          <span>1. Input Stok Masuk &amp; Total Belanja Modal (Faktur Beli):</span>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                          Base Unit: KG (Desimal Otomatis)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                        {/* 1. Total Stok Masuk (kg) */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Total Stok Masuk (kg):
                          </label>
                          <FormattedNumberInput
                            value={stockKg}
                            onChange={(val) => {
                              const newStock = Math.max(0, val);
                              const newCost = totalCost > 0 && newStock > 0
                                ? Math.round(totalCost / newStock)
                                : costPerKg;
                              setEditingProduct({
                                ...editingProduct,
                                stock: newStock,
                                costBase: newCost,
                              });
                            }}
                            allowDecimal={true}
                            suffix="kg"
                            placeholder="50"
                            className="bg-white font-black text-slate-900"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            Contoh: 50 kg untuk 1 karung beras.
                          </span>
                        </div>

                        {/* 2. Total Harga Beli (Rp) */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Total Harga Beli Semua Stok:
                          </label>
                          <FormattedNumberInput
                            value={totalCost}
                            onChange={(val) => {
                              const newTotal = Math.max(0, val);
                              const newCost = stockKg > 0
                                ? Math.round(newTotal / stockKg)
                                : costPerKg;
                              setEditingProduct({
                                ...editingProduct,
                                totalPurchaseCost: newTotal,
                                costBase: newCost,
                              });
                            }}
                            prefix="Rp"
                            placeholder="650000"
                            className="bg-white font-black text-slate-900"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            Total nilai faktur kulakan grosir.
                          </span>
                        </div>

                        {/* 3. Harga Beli Modal per 1 kg (HPP / 1 kg) */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            HPP Modal per 1 kg (Auto):
                          </label>
                          <FormattedNumberInput
                            value={costPerKg}
                            onChange={(val) => {
                              const newCost = Math.max(0, val);
                              const newTotal = stockKg > 0 ? Math.round(stockKg * newCost) : totalCost;
                              setEditingProduct({
                                ...editingProduct,
                                costBase: newCost,
                                totalPurchaseCost: newTotal,
                              });
                            }}
                            prefix="Rp"
                            placeholder="13000"
                            className="bg-emerald-50 border-emerald-300 font-black text-emerald-950"
                          />
                          <span className="text-[10px] text-emerald-700 mt-1 block font-medium">
                            {stockKg > 0 && totalCost > 0 
                              ? `Rumus: Rp ${totalCost.toLocaleString('id-ID')} ÷ ${stockKg} kg` 
                              : 'Otomatis dihitung dari Total Beli ÷ Total kg'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* LIVE AUTOMATIC CONVERSION DOWNWARD BREAKDOWN (PER 500G, 250G, 100G, PER GRAM) */}
                    <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                        <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                          <Calculator className="w-4 h-4 text-emerald-600" />
                          <span>2. Konversi Otomatis Rincian Modal ke Bawah (Per Gram):</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Presisi Real-time
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {/* 1 kg */}
                        <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 text-center">
                          <span className="text-[10px] font-bold text-emerald-800 block uppercase">Per 1 KG</span>
                          <span className="text-xs sm:text-sm font-black text-emerald-950 mt-0.5 block">
                            Rp {costPerKg.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] text-emerald-600 block mt-0.5">Modal Pokok (1.000g)</span>
                        </div>

                        {/* 500g */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-600 block uppercase">Per 500g (1/2 kg)</span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block">
                            Rp {cost500g.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">Rumus: HPP &times; 0.5</span>
                        </div>

                        {/* 250g */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-600 block uppercase">Per 250g (1/4 kg)</span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block">
                            Rp {cost250g.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">Rumus: HPP &times; 0.25</span>
                        </div>

                        {/* 100g */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-600 block uppercase">Per 100g (1 Ons)</span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block">
                            Rp {cost100g.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">Rumus: HPP &times; 0.1</span>
                        </div>

                        {/* 1 Gram */}
                        <div className="col-span-2 sm:col-span-1 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 text-center">
                          <span className="text-[10px] font-bold text-amber-800 block uppercase">Per 1 Gram</span>
                          <span className="text-xs sm:text-sm font-black text-amber-950 mt-0.5 block">
                            Rp {cost1g > 0 ? cost1g.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '0'}
                          </span>
                          <span className="text-[9px] text-amber-600 block mt-0.5">Rumus: HPP &divide; 1.000</span>
                        </div>
                      </div>
                    </div>

                    {/* SELLING PRICE PER 1 KG & REAL-TIME PROFIT */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                          <Coins className="w-4 h-4 text-emerald-600" />
                          <span>3. Harga Jual Eceran Pokok per 1 kg:</span>
                        </div>
                        {costPerKg > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-slate-500 font-semibold">Preset Margin:</span>
                            <button
                              type="button"
                              onClick={() => applyMarginKg(10)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold border border-slate-200 transition"
                            >
                              +10%
                            </button>
                            <button
                              type="button"
                              onClick={() => applyMarginKg(15)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold border border-slate-200 transition"
                            >
                              +15%
                            </button>
                            <button
                              type="button"
                              onClick={() => applyMarginKg(20)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold border border-slate-200 transition"
                            >
                              +20%
                            </button>
                            <button
                              type="button"
                              onClick={() => applyMarginKg(25)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold border border-slate-200 transition"
                            >
                              +25%
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="font-bold text-slate-800 block mb-1">
                            Harga Jual per 1 kg (Rp):
                          </label>
                          <FormattedNumberInput
                            value={sellingPriceKg}
                            onChange={(val) => {
                              setEditingProduct({
                                ...editingProduct,
                                priceBase: val,
                                hargaJualKg: val,
                              });
                            }}
                            prefix="Rp"
                            placeholder="15000"
                            className="bg-white font-black text-emerald-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Analisis Laba Penjualan per 1 kg:
                          </label>
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                            profitPerKg >= 0 
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                              : 'bg-red-50 border-red-200 text-red-700'
                          }`}>
                            <span>{profitPerKg >= 0 ? 'Potensi Keuntungan:' : 'Perhatian Rugi:'}</span>
                            <span className="font-mono">
                              {profitPerKg >= 0 
                                ? `+Rp ${profitPerKg.toLocaleString('id-ID')} (${marginPctKg}%)` 
                                : `-Rp ${Math.abs(profitPerKg).toLocaleString('id-ID')}`}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* DYNAMIC PACKAGING VARIANTS & PRESETS FOR KG */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div>
                          <div className="font-black text-slate-900 flex items-center gap-1.5 text-xs">
                            <Package className="w-4 h-4 text-amber-600" />
                            <span>4. Varian Kemasan Eceran Timbangan (Siap Pakai di Kasir)</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Satuan eceran kemasan plastik/bungkus. Stok master kg berkurang otomatis saat terjual.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const newVariant: RetailPackagingVariant = {
                              id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                              name: 'Kemasan Custom',
                              ratioToBase: 0.25,
                              unitLabel: 'Bungkus',
                              sellingPrice: Math.round((costPerKg * 0.25 * 1.2) / 100) * 100 || 4000,
                              costPrice: Math.round(costPerKg * 0.25),
                            };
                            setEditingProduct({
                              ...editingProduct,
                              packagingVariants: [...(editingProduct.packagingVariants || []), newVariant],
                            });
                          }}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Tambah Varian Custom</span>
                        </button>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500">Preset Cepat:</span>
                        <button
                          type="button"
                          onClick={() => addPackagingVariantPreset('100g', 0.1, 'Kemasan 100g (1 Ons)')}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                        >
                          + 100g (1 Ons)
                        </button>
                        <button
                          type="button"
                          onClick={() => addPackagingVariantPreset('250g', 0.25, 'Kemasan 1/4 kg (250g)')}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                        >
                          + 1/4 kg (250g)
                        </button>
                        <button
                          type="button"
                          onClick={() => addPackagingVariantPreset('500g', 0.5, 'Kemasan 1/2 kg (500g)')}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                        >
                          + 1/2 kg (500g)
                        </button>
                        <button
                          type="button"
                          onClick={() => addPackagingVariantPreset('1kg', 1.0, 'Kemasan 1 kg Pack')}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                        >
                          + 1 kg Pack
                        </button>
                      </div>

                      {/* Variant list table */}
                      {editingProduct.packagingVariants && editingProduct.packagingVariants.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {editingProduct.packagingVariants.map((variant, vIdx) => {
                            const variantHpp = costPerKg * (variant.ratioToBase || 0);
                            const profit = variant.sellingPrice - variantHpp;
                            const margin = variant.sellingPrice > 0 ? Math.round((profit / variant.sellingPrice) * 100) : 0;
                            const maxPacks = stockKg > 0 && variant.ratioToBase > 0 ? Math.floor(stockKg / variant.ratioToBase) : 0;

                            return (
                              <div
                                key={variant.id || vIdx}
                                className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center hover:border-amber-400 transition"
                              >
                                <div className="sm:col-span-4">
                                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Nama Kemasan:</label>
                                  <input
                                    type="text"
                                    value={variant.name}
                                    onChange={(e) => {
                                      const updated = [...(editingProduct.packagingVariants || [])];
                                      updated[vIdx] = { ...updated[vIdx], name: e.target.value };
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900"
                                  />
                                </div>

                                <div className="sm:col-span-3">
                                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Berat (Gram):</label>
                                  <FormattedNumberInput
                                    value={Math.round((variant.ratioToBase || 0) * 1000)}
                                    onChange={(val) => {
                                      const updated = [...(editingProduct.packagingVariants || [])];
                                      const ratio = Math.max(0.001, val / 1000);
                                      updated[vIdx] = { 
                                        ...updated[vIdx], 
                                        ratioToBase: ratio,
                                        costPrice: Math.round(costPerKg * ratio)
                                      };
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    suffix="g"
                                    className="bg-slate-50 font-bold"
                                  />
                                  <span className="text-[9px] text-slate-400 block mt-0.5">
                                    HPP: Rp {Math.round(variantHpp).toLocaleString('id-ID')} &bull; Stok: {maxPacks} bks
                                  </span>
                                </div>

                                <div className="sm:col-span-4">
                                  <label className="text-[10px] font-bold text-emerald-800 block mb-0.5">Harga Jual (Rp):</label>
                                  <FormattedNumberInput
                                    value={variant.sellingPrice}
                                    onChange={(val) => {
                                      const updated = [...(editingProduct.packagingVariants || [])];
                                      updated[vIdx] = { ...updated[vIdx], sellingPrice: val };
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    prefix="Rp"
                                    className="bg-white font-black text-emerald-900"
                                  />
                                  {variant.sellingPrice > 0 && costPerKg > 0 && (
                                    <span className={`text-[9px] font-bold block mt-0.5 ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                      {profit >= 0 ? `+Rp ${Math.round(profit).toLocaleString('id-ID')} (${margin}%)` : `-Rp ${Math.round(Math.abs(profit)).toLocaleString('id-ID')}`}
                                    </span>
                                  )}
                                </div>

                                <div className="sm:col-span-1 flex justify-end sm:justify-center pt-2 sm:pt-4">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = editingProduct.packagingVariants?.filter((_, i) => i !== vIdx);
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition"
                                    title="Hapus varian"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-white p-4 rounded-xl border border-dashed border-amber-300 text-center text-slate-500 text-[11px]">
                          Belum ada varian kemasan eceran. Klik salah satu tombol preset di atas atau tambah custom.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* FLOW B: BOX / WHOLESALE FORM (DUS & RENCENG GROSIR) */}
              {productType === 'box' && (() => {
                const rencengPerDus = Math.max(1, editingProduct.rasioRencengPerDus || 48);
                const pcsPerRenceng = Math.max(1, editingProduct.rasioPcsPerRenceng || 10);
                const totalPerDus = rencengPerDus * pcsPerRenceng;
                const totalBoxes = totalPerDus > 0 ? Math.floor((editingProduct.stock || 0) / totalPerDus) : 0;
                const totalCost = Number(editingProduct.totalPurchaseCost || 0);

                // Auto conversion calculations
                const totalPcs = editingProduct.stock || (totalBoxes * totalPerDus);
                const costPerPcs = totalPcs > 0 && totalCost > 0
                  ? Math.round(totalCost / totalPcs)
                  : (editingProduct.costBase || 0);
                const boxCost = totalBoxes > 0 && totalCost > 0
                  ? Math.round(totalCost / totalBoxes)
                  : (editingProduct.tierConfig?.costTier3 || (costPerPcs * totalPerDus));
                const costPerRenceng = pcsPerRenceng > 0 ? (costPerPcs * pcsPerRenceng) : Math.round(boxCost / rencengPerDus);

                // Benchmark margin guidelines
                const suggestedBoxPrice = Math.round((boxCost * 1.1) / 500) * 500;
                const suggestedRencengPrice = Math.round((costPerRenceng * 1.15) / 100) * 100;
                const suggestedPcsPrice = Math.round((costPerPcs * 1.25) / 50) * 50;

                const addCustomVariantRow = (name: string, ratio: number, price: number) => {
                  const newVariant: RetailPackagingVariant = {
                    id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                    name: name,
                    ratioToBase: ratio,
                    unitLabel: name,
                    sellingPrice: price,
                    costPrice: costPerPcs * ratio,
                  };
                  setEditingProduct({
                    ...editingProduct,
                    packagingVariants: [...(editingProduct.packagingVariants || []), newVariant],
                  });
                };

                return (
                  <div className="space-y-4">
                    {/* STEP 1: MULTI-TIER RATIOS & TOTAL PURCHASE COST */}
                    <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-3">
                      <div className="font-bold text-amber-950 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-black">
                          <Boxes className="w-4 h-4 text-amber-700" />
                          <span>1. Parameter Pembelian Grosir &amp; Rasio Kemasan Bertingkat:</span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                          Stok Master Tercatat dalam Pcs
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                        {/* 1. Total Dus */}
                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1">
                            Total Dus Masuk:
                          </label>
                          <FormattedNumberInput
                            value={totalBoxes}
                            onChange={(boxQty) => {
                              const validBoxes = Math.max(0, boxQty);
                              const newPcs = validBoxes * totalPerDus;
                              const newCostPcs = totalCost > 0 && newPcs > 0 ? Math.round(totalCost / newPcs) : costPerPcs;
                              const newBoxCost = validBoxes > 0 && totalCost > 0 ? Math.round(totalCost / validBoxes) : (newCostPcs * totalPerDus);
                              
                              setEditingProduct({
                                ...editingProduct,
                                stock: newPcs,
                                costBase: newCostPcs,
                                tierConfig: {
                                  ...editingProduct.tierConfig,
                                  baseUnit: 'pcs',
                                  costTier3: newBoxCost,
                                  costTier2: newCostPcs * pcsPerRenceng,
                                  tier2Name: 'renceng',
                                  tier2Ratio: pcsPerRenceng,
                                  tier3Name: 'dus',
                                  tier3Ratio: totalPerDus,
                                },
                              });
                            }}
                            suffix="Dus"
                            placeholder="10"
                            className="bg-white font-black text-amber-950"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Jumlah dus yang dibeli.</p>
                        </div>

                        {/* 2. Isi per Dus */}
                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1">
                            Isi per Dus (Renceng):
                          </label>
                          <FormattedNumberInput
                            value={rencengPerDus}
                            onChange={(rRenceng) => {
                              const validRenceng = Math.max(1, rRenceng);
                              const newPerDus = validRenceng * pcsPerRenceng;
                              const newPcs = totalBoxes * newPerDus;
                              const newCostPcs = totalCost > 0 && newPcs > 0 ? Math.round(totalCost / newPcs) : costPerPcs;
                              const newBoxCost = totalBoxes > 0 && totalCost > 0 ? Math.round(totalCost / totalBoxes) : (newCostPcs * newPerDus);

                              setEditingProduct({
                                ...editingProduct,
                                rasioRencengPerDus: validRenceng,
                                stock: newPcs,
                                costBase: newCostPcs,
                                tierConfig: {
                                  ...editingProduct.tierConfig,
                                  baseUnit: 'pcs',
                                  costTier3: newBoxCost,
                                  costTier2: newCostPcs * pcsPerRenceng,
                                  tier2Name: 'renceng',
                                  tier2Ratio: pcsPerRenceng,
                                  tier3Name: 'dus',
                                  tier3Ratio: newPerDus,
                                },
                              });
                            }}
                            suffix="Renceng"
                            placeholder="48"
                            className="bg-white font-bold"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Contoh: 1 Dus = 48 Renceng.</p>
                        </div>

                        {/* 3. Isi per Renceng */}
                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1">
                            Isi per Renceng (Pcs):
                          </label>
                          <FormattedNumberInput
                            value={pcsPerRenceng}
                            onChange={(rPcs) => {
                              const validPcs = Math.max(1, rPcs);
                              const newPerDus = rencengPerDus * validPcs;
                              const newPcs = totalBoxes * newPerDus;
                              const newCostPcs = totalCost > 0 && newPcs > 0 ? Math.round(totalCost / newPcs) : costPerPcs;
                              const newBoxCost = totalBoxes > 0 && totalCost > 0 ? Math.round(totalCost / totalBoxes) : (newCostPcs * newPerDus);

                              setEditingProduct({
                                ...editingProduct,
                                rasioPcsPerRenceng: validPcs,
                                stock: newPcs,
                                costBase: newCostPcs,
                                tierConfig: {
                                  ...editingProduct.tierConfig,
                                  baseUnit: 'pcs',
                                  costTier3: newBoxCost,
                                  costTier2: newCostPcs * validPcs,
                                  tier2Name: 'renceng',
                                  tier2Ratio: validPcs,
                                  tier3Name: 'dus',
                                  tier3Ratio: newPerDus,
                                },
                              });
                            }}
                            suffix="Pcs/Strip"
                            placeholder="10"
                            className="bg-white font-bold"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Contoh: 1 Renceng = 10 Pcs.</p>
                        </div>

                        {/* 4. Total Harga Beli Semua Dus (Rp) */}
                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1">
                            Total Beli Semua Dus:
                          </label>
                          <FormattedNumberInput
                            value={totalCost}
                            onChange={(val) => {
                              const newTotal = Math.max(0, val);
                              const newCostPcs = totalPcs > 0 ? Math.round(newTotal / totalPcs) : 0;
                              const newBoxCost = totalBoxes > 0 ? Math.round(newTotal / totalBoxes) : (newCostPcs * totalPerDus);

                              setEditingProduct({
                                ...editingProduct,
                                totalPurchaseCost: newTotal,
                                costBase: newCostPcs,
                                tierConfig: {
                                  ...editingProduct.tierConfig,
                                  baseUnit: 'pcs',
                                  costTier3: newBoxCost,
                                  costTier2: newCostPcs * pcsPerRenceng,
                                  tier2Name: 'renceng',
                                  tier2Ratio: pcsPerRenceng,
                                  tier3Name: 'dus',
                                  tier3Ratio: totalPerDus,
                                },
                              });
                            }}
                            prefix="Rp"
                            placeholder="1200000"
                            className="bg-white font-black text-slate-900"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Total faktur semua dus dibeli.</p>
                        </div>
                      </div>

                      {/* Live Calculation Ratio Banner */}
                      <div className="bg-gradient-to-r from-amber-100/90 to-amber-50 border border-amber-300 p-3 rounded-xl text-xs space-y-1">
                        <div className="font-extrabold text-amber-950 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Konversi Rasio Satuan Otomatis:</span>
                          </span>
                          <span className="bg-amber-200/90 text-amber-900 font-mono text-[11px] px-2 py-0.5 rounded font-black">
                            1 Dus = {rencengPerDus} Renceng = {totalPerDus} Pcs
                          </span>
                        </div>
                        <div className="text-amber-900 font-medium">
                          Total Stok Master: <strong className="text-emerald-800 text-sm font-black">{totalPcs.toLocaleString('id-ID')} Pcs</strong> ({totalBoxes} Dus = {(totalBoxes * rencengPerDus).toLocaleString('id-ID')} Renceng)
                        </div>
                      </div>
                    </div>

                    {/* STEP 2: PRECISE AUTO-CONVERSION HPP BREAKDOWN (PER DUS, PER RENCENG, PER PCS) */}
                    <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                        <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                          <Calculator className="w-4 h-4 text-emerald-600" />
                          <span>2. Hasil Konversi Presisi Harga Beli Modal (HPP Dus ➔ Renceng ➔ Pcs):</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Presisi Otomatis
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. HPP Dus */}
                        <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-1">
                          <span className="text-[10px] font-bold text-amber-800 block uppercase">
                            HPP per 1 Dus (Grosir Besar)
                          </span>
                          <div className="text-base font-black text-amber-950">
                            Rp {boxCost.toLocaleString('id-ID')}
                          </div>
                          <span className="text-[9px] text-amber-700 block">
                            {totalCost > 0 && totalBoxes > 0 
                              ? `Rumus: Rp ${totalCost.toLocaleString('id-ID')} ÷ ${totalBoxes} Dus` 
                              : `Rumus: HPP Pcs &times; ${totalPerDus} Pcs`}
                          </span>
                        </div>

                        {/* 2. HPP Renceng */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-slate-600 block uppercase">
                            HPP per 1 Renceng (Strip)
                          </span>
                          <div className="text-base font-black text-slate-900">
                            Rp {costPerRenceng.toLocaleString('id-ID')}
                          </div>
                          <span className="text-[9px] text-slate-500 block">
                            Rumus: HPP Dus (Rp {boxCost.toLocaleString('id-ID')}) ÷ {rencengPerDus} Renceng
                          </span>
                        </div>

                        {/* 3. HPP Pcs */}
                        <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-800 block uppercase">
                            HPP per 1 Pcs (Eceran Satuan)
                          </span>
                          <div className="text-base font-black text-emerald-950">
                            Rp {costPerPcs.toLocaleString('id-ID')}
                          </div>
                          <span className="text-[9px] text-emerald-700 block">
                            {totalCost > 0 && totalPcs > 0 
                              ? `Rumus: Rp ${totalCost.toLocaleString('id-ID')} ÷ ${totalPcs.toLocaleString('id-ID')} Pcs` 
                              : `Rumus: HPP Dus ÷ ${totalPerDus} Pcs`}
                          </span>
                        </div>
                      </div>

                      {/* Benchmark Margin Guidelines */}
                      <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Rekomendasi Margin Acuan Sembako:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                          <span className="bg-white px-2 py-0.5 rounded border border-amber-200">
                            Dus (+10%): <strong>Rp {suggestedBoxPrice.toLocaleString('id-ID')}</strong>
                          </span>
                          <span className="bg-white px-2 py-0.5 rounded border border-amber-200">
                            Renceng (+15%): <strong>Rp {suggestedRencengPrice.toLocaleString('id-ID')}</strong>
                          </span>
                          <span className="bg-white px-2 py-0.5 rounded border border-amber-200">
                            Pcs (+25%): <strong>Rp {suggestedPcsPrice.toLocaleString('id-ID')}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* STEP 3: DYNAMIC CUSTOM VARIANT MANAGEMENT */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                        <div>
                          <div className="font-black text-slate-900 flex items-center gap-1.5 text-xs">
                            <Boxes className="w-4 h-4 text-amber-600" />
                            <span>3. Varian Harga Jual Custom (Kemasan / Eceran)</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Tentukan satuan penjualan bebas (Dus, Pack, Renceng, Pcs, dll) dengan harga jual manual sesuai kebijakan toko.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => addCustomVariantRow('', 1, 0)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Tambah Varian Custom</span>
                        </button>
                      </div>

                      {/* Quick Preset Helper Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] font-bold text-slate-500">Preset Cepat:</span>
                        <button
                          type="button"
                          onClick={() => addCustomVariantRow('Dus', totalPerDus, suggestedBoxPrice || 120000)}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                          title={`Tambah varian Dus (isi ${totalPerDus} Pcs)`}
                        >
                          + Preset Dus ({totalPerDus} Pcs)
                        </button>
                        <button
                          type="button"
                          onClick={() => addCustomVariantRow('Renceng', pcsPerRenceng, suggestedRencengPrice || 2800)}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                          title={`Tambah varian Renceng (isi ${pcsPerRenceng} Pcs)`}
                        >
                          + Preset Renceng ({pcsPerRenceng} Pcs)
                        </button>
                        <button
                          type="button"
                          onClick={() => addCustomVariantRow('Pcs', 1, suggestedPcsPrice || 300)}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                          title="Tambah varian Eceran Pcs (isi 1 Pcs)"
                        >
                          + Preset Pcs (1 Pcs)
                        </button>
                      </div>

                      {/* Dynamic Custom Variant Rows List */}
                      {editingProduct.packagingVariants && editingProduct.packagingVariants.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {editingProduct.packagingVariants.map((variant, vIdx) => {
                            const variantHpp = costPerPcs * (variant.ratioToBase || 1);
                            const profit = variant.sellingPrice - variantHpp;
                            const marginPct = variant.sellingPrice > 0 ? Math.round((profit / variant.sellingPrice) * 100) : 0;
                            const suggestedVariantPrice = Math.round((variantHpp * 1.15) / 50) * 50;

                            return (
                              <div
                                key={variant.id || vIdx}
                                className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center hover:border-amber-400 transition"
                              >
                                {/* 1. Nama Varian */}
                                <div className="sm:col-span-4">
                                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                                    Nama Satuan / Varian:
                                  </label>
                                  <input
                                    type="text"
                                    value={variant.name}
                                    placeholder="Contoh: Dus, Renceng, Pcs, Pack 6"
                                    onChange={(e) => {
                                      const updated = [...(editingProduct.packagingVariants || [])];
                                      updated[vIdx] = { ...updated[vIdx], name: e.target.value, unitLabel: e.target.value };
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  />
                                </div>

                                {/* 2. Rasio ke Pcs */}
                                <div className="sm:col-span-3">
                                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                                    Isi / Rasio ke Pcs:
                                  </label>
                                  <FormattedNumberInput
                                    value={variant.ratioToBase}
                                    onChange={(val) => {
                                      const updated = [...(editingProduct.packagingVariants || [])];
                                      const safeRatio = Math.max(1, val);
                                      updated[vIdx] = { 
                                        ...updated[vIdx], 
                                        ratioToBase: safeRatio,
                                        costPrice: costPerPcs * safeRatio
                                      };
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    suffix="Pcs"
                                    className="bg-slate-50 font-bold"
                                  />
                                  {costPerPcs > 0 && (
                                    <span className="text-[9px] text-slate-400 mt-0.5 block truncate">
                                      HPP: Rp {Math.round(variantHpp).toLocaleString('id-ID')}
                                    </span>
                                  )}
                                </div>

                                {/* 3. Harga Jual */}
                                <div className="sm:col-span-4">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <label className="text-[10px] font-bold text-emerald-800">
                                      Harga Jual (Rp):
                                    </label>
                                    {costPerPcs > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...(editingProduct.packagingVariants || [])];
                                          updated[vIdx] = { ...updated[vIdx], sellingPrice: suggestedVariantPrice };
                                          setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                        }}
                                        className="text-[9px] text-amber-700 hover:text-amber-900 underline font-semibold"
                                        title="Gunakan harga rekomendasi margin 15%"
                                      >
                                        Saran: Rp {suggestedVariantPrice.toLocaleString('id-ID')}
                                      </button>
                                    )}
                                  </div>
                                  <FormattedNumberInput
                                    value={variant.sellingPrice}
                                    onChange={(val) => {
                                      const updated = [...(editingProduct.packagingVariants || [])];
                                      updated[vIdx] = { ...updated[vIdx], sellingPrice: val };
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    prefix="Rp"
                                    placeholder="0"
                                    className="bg-white font-black text-emerald-900"
                                  />
                                  {variant.sellingPrice > 0 && costPerPcs > 0 && (
                                    <span className={`text-[9px] font-bold mt-0.5 block truncate ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                      {profit >= 0 ? `+Rp ${Math.round(profit).toLocaleString('id-ID')} (${marginPct}%)` : `-Rp ${Math.round(Math.abs(profit)).toLocaleString('id-ID')}`}
                                    </span>
                                  )}
                                </div>

                                {/* 4. Delete Action */}
                                <div className="sm:col-span-1 flex justify-end sm:justify-center pt-2 sm:pt-4">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = editingProduct.packagingVariants?.filter((_, i) => i !== vIdx);
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    className="p-1.5 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg border border-red-200 transition"
                                    title="Hapus varian ini"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-white p-6 rounded-xl border border-dashed border-amber-300 text-center space-y-2">
                          <Boxes className="w-8 h-8 text-amber-400 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">Belum Ada Varian Harga Jual Custom</p>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            Klik tombol <strong>+ Tambah Varian Custom</strong> atau pilih salah satu <strong>Preset Cepat (Dus, Renceng, Pcs)</strong> di atas untuk mengatur satuan dan harga jual produk ini.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}


              {/* FLOW C: PCS / RETAIL FORM (PCS & BUNGKUS) */}
              {productType === 'pcs' && (() => {
                const stockPcs = Number(editingProduct.stock || 0);
                const totalCost = Number(editingProduct.totalPurchaseCost || 0);
                const costPerPcs = Number(editingProduct.costBase || 0);
                const sellingPrice = Number(editingProduct.priceBase || 0);
                const profitPerPcs = sellingPrice - costPerPcs;
                const marginPct = sellingPrice > 0 ? Math.round((profitPerPcs / sellingPrice) * 100) : 0;
                const baseUnitLabel = (editingProduct.baseUnit || 'pcs').toUpperCase();

                const applyMarginPcs = (pct: number) => {
                  const targetPrice = Math.round((costPerPcs * (1 + pct / 100)) / 100) * 100;
                  setEditingProduct({
                    ...editingProduct,
                    priceBase: targetPrice,
                  });
                };

                return (
                  <div className="space-y-4">
                    {/* INPUT SECTION: SATUAN, STOK & TOTAL HARGA BELI */}
                    <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                          <Package className="w-4 h-4 text-blue-600" />
                          <span>1. Parameter Stok Masuk &amp; Total Belanja Modal:</span>
                        </div>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                          Barang Eceran / Retail
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
                        {/* 1. Satuan Dasar */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Pilih Satuan:
                          </label>
                          <select
                            value={editingProduct.baseUnit || 'pcs'}
                            onChange={(e) => setEditingProduct({ ...editingProduct, baseUnit: e.target.value as UnitType })}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold uppercase text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                          >
                            <option value="pcs">Pcs</option>
                            <option value="bungkus">Bungkus</option>
                            <option value="saset">Saset</option>
                            <option value="botol">Botol</option>
                            <option value="pouch">Pouch</option>
                            <option value="kaleng">Kaleng</option>
                          </select>
                          <span className="text-[10px] text-slate-400 mt-1 block">Satuan eceran kasir.</span>
                        </div>

                        {/* 2. Total Stok Masuk */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Total Stok ({baseUnitLabel}):
                          </label>
                          <FormattedNumberInput
                            value={stockPcs}
                            onChange={(val) => {
                              const newStock = Math.max(0, val);
                              const newCost = totalCost > 0 && newStock > 0 ? Math.round(totalCost / newStock) : costPerPcs;
                              setEditingProduct({
                                ...editingProduct,
                                stock: newStock,
                                costBase: newCost,
                              });
                            }}
                            suffix={editingProduct.baseUnit || 'Pcs'}
                            placeholder="100"
                            className="bg-white font-black text-slate-900"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">Jumlah unit masuk.</span>
                        </div>

                        {/* 3. Total Harga Beli Semua Stok */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Total Harga Beli:
                          </label>
                          <FormattedNumberInput
                            value={totalCost}
                            onChange={(val) => {
                              const newTotal = Math.max(0, val);
                              const newCost = stockPcs > 0 ? Math.round(newTotal / stockPcs) : costPerPcs;
                              setEditingProduct({
                                ...editingProduct,
                                totalPurchaseCost: newTotal,
                                costBase: newCost,
                              });
                            }}
                            prefix="Rp"
                            placeholder="250000"
                            className="bg-white font-black text-slate-900"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">Total faktur belanja.</span>
                        </div>

                        {/* 4. HPP Modal per 1 Pcs (Auto-calculated) */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            HPP per 1 {baseUnitLabel} (Auto):
                          </label>
                          <FormattedNumberInput
                            value={costPerPcs}
                            onChange={(val) => {
                              const newCost = Math.max(0, val);
                              const newTotal = stockPcs > 0 ? Math.round(stockPcs * newCost) : totalCost;
                              setEditingProduct({
                                ...editingProduct,
                                costBase: newCost,
                                totalPurchaseCost: newTotal,
                              });
                            }}
                            prefix="Rp"
                            placeholder="2500"
                            className="bg-blue-50 border-blue-300 font-black text-blue-950"
                          />
                          <span className="text-[10px] text-blue-700 mt-1 block font-medium">
                            {stockPcs > 0 && totalCost > 0 
                              ? `Rumus: Rp ${totalCost.toLocaleString('id-ID')} ÷ ${stockPcs} ${baseUnitLabel}` 
                              : 'Otomatis dihitung'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* LIVE CALCULATION & MARGIN RECOMMENDATION CARD */}
                    <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-2">
                        <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                          <Calculator className="w-4 h-4 text-blue-600" />
                          <span>2. Hasil Konversi &amp; Rekomendasi Harga Jual:</span>
                        </div>
                        {costPerPcs > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-slate-500 font-semibold">Margin Acuan:</span>
                            <button
                              type="button"
                              onClick={() => applyMarginPcs(10)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 font-bold border border-slate-200 transition"
                            >
                              +10% (Rp {Math.round((costPerPcs * 1.10) / 100) * 100})
                            </button>
                            <button
                              type="button"
                              onClick={() => applyMarginPcs(15)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 font-bold border border-slate-200 transition"
                            >
                              +15% (Rp {Math.round((costPerPcs * 1.15) / 100) * 100})
                            </button>
                            <button
                              type="button"
                              onClick={() => applyMarginPcs(20)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 font-bold border border-slate-200 transition"
                            >
                              +20% (Rp {Math.round((costPerPcs * 1.20) / 100) * 100})
                            </button>
                            <button
                              type="button"
                              onClick={() => applyMarginPcs(25)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 font-bold border border-slate-200 transition"
                            >
                              +25% (Rp {Math.round((costPerPcs * 1.25) / 100) * 100})
                            </button>
                            <button
                              type="button"
                              onClick={() => applyMarginPcs(30)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 font-bold border border-slate-200 transition"
                            >
                              +30% (Rp {Math.round((costPerPcs * 1.30) / 100) * 100})
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="font-bold text-slate-800 block mb-1">
                            Harga Jual Eceran per {baseUnitLabel} (Rp):
                          </label>
                          <FormattedNumberInput
                            value={sellingPrice}
                            onChange={(val) => setEditingProduct({ ...editingProduct, priceBase: val })}
                            prefix="Rp"
                            placeholder="3000"
                            className="bg-white font-black text-emerald-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Analisis Laba Penjualan per {baseUnitLabel}:
                          </label>
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                            profitPerPcs >= 0 
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                              : 'bg-red-50 border-red-200 text-red-700'
                          }`}>
                            <span>{profitPerPcs >= 0 ? 'Potensi Keuntungan:' : 'Perhatian Rugi:'}</span>
                            <span className="font-mono">
                              {profitPerPcs >= 0 
                                ? `+Rp ${profitPerPcs.toLocaleString('id-ID')} (${marginPct}%)` 
                                : `-Rp ${Math.abs(profitPerPcs).toLocaleString('id-ID')}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Projection Banner */}
                      {stockPcs > 0 && sellingPrice > 0 && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            Estimasi Total Omzet: <strong className="text-slate-900">Rp {(stockPcs * sellingPrice).toLocaleString('id-ID')}</strong>
                          </div>
                          <div>
                            Estimasi Total Laba: <strong className={profitPerPcs >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                              {profitPerPcs >= 0 ? '+' : ''}Rp {(stockPcs * profitPerPcs).toLocaleString('id-ID')}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* FLOW D: LITER / LIQUID FORM (BARANG CAIR) */}
              {productType === 'liter' && (() => {
                const stockLiter = Number(editingProduct.stock || 0);
                const totalCost = Number(editingProduct.totalPurchaseCost || 0);
                const costPerLiter = Number(editingProduct.costBase || 0);
                const cost500ml = Math.round(costPerLiter * 0.5);
                const cost250ml = Math.round(costPerLiter * 0.25);
                const cost100ml = Math.round(costPerLiter * 0.1);
                const cost1ml = costPerLiter > 0 ? (costPerLiter / 1000) : 0;
                const sellingPrice = Number(editingProduct.priceBase || 0);
                const profitPerLiter = sellingPrice - costPerLiter;
                const marginPct = sellingPrice > 0 ? Math.round((profitPerLiter / sellingPrice) * 100) : 0;

                const applyMarginLiter = (pct: number) => {
                  const targetPrice = Math.round((costPerLiter * (1 + pct / 100)) / 100) * 100;
                  setEditingProduct({
                    ...editingProduct,
                    priceBase: targetPrice,
                  });
                };

                return (
                  <div className="space-y-4">
                    {/* INPUT SECTION: STOK LITER & TOTAL HARGA BELI */}
                    <div className="bg-cyan-50/70 border border-cyan-200 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-cyan-950 flex items-center gap-1.5 text-xs">
                          <Droplets className="w-4 h-4 text-cyan-600" />
                          <span>1. Input Stok Masuk &amp; Total Belanja Modal (Barang Cair):</span>
                        </div>
                        <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-md">
                          Base Unit: LITER (Desimal Otomatis)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
                        {/* 1. Satuan Dasar */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Satuan Utama:
                          </label>
                          <select
                            value={editingProduct.baseUnit || 'liter'}
                            onChange={(e) => setEditingProduct({ ...editingProduct, baseUnit: e.target.value as UnitType })}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold uppercase text-slate-900 focus:ring-2 focus:ring-cyan-500 text-xs"
                          >
                            <option value="liter">Liter</option>
                            <option value="botol">Botol</option>
                            <option value="pouch">Pouch</option>
                            <option value="jerigen">Jerigen</option>
                          </select>
                          <span className="text-[10px] text-slate-400 mt-1 block">Satuan master cairan.</span>
                        </div>

                        {/* 2. Total Stok Masuk (Liter) */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Total Stok (Liter):
                          </label>
                          <FormattedNumberInput
                            value={stockLiter}
                            onChange={(val) => {
                              const newStock = Math.max(0, val);
                              const newCost = totalCost > 0 && newStock > 0 ? Math.round(totalCost / newStock) : costPerLiter;
                              setEditingProduct({
                                ...editingProduct,
                                stock: newStock,
                                costBase: newCost,
                              });
                            }}
                            allowDecimal={true}
                            suffix="Liter"
                            placeholder="20"
                            className="bg-white font-black text-slate-900"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">Contoh: 20 Liter atau 20.5 L.</span>
                        </div>

                        {/* 3. Total Harga Beli Semua Stok */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            Total Harga Beli:
                          </label>
                          <FormattedNumberInput
                            value={totalCost}
                            onChange={(val) => {
                              const newTotal = Math.max(0, val);
                              const newCost = stockLiter > 0 ? Math.round(newTotal / stockLiter) : costPerLiter;
                              setEditingProduct({
                                ...editingProduct,
                                totalPurchaseCost: newTotal,
                                costBase: newCost,
                              });
                            }}
                            prefix="Rp"
                            placeholder="280000"
                            className="bg-white font-black text-slate-900"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">Total nilai faktur kulakan.</span>
                        </div>

                        {/* 4. HPP Modal per 1 Liter (Auto-calculated) */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">
                            HPP per 1 Liter (Auto):
                          </label>
                          <FormattedNumberInput
                            value={costPerLiter}
                            onChange={(val) => {
                              const newCost = Math.max(0, val);
                              const newTotal = stockLiter > 0 ? Math.round(stockLiter * newCost) : totalCost;
                              setEditingProduct({
                                ...editingProduct,
                                costBase: newCost,
                                totalPurchaseCost: newTotal,
                              });
                            }}
                            prefix="Rp"
                            placeholder="14000"
                            className="bg-cyan-50 border-cyan-300 font-black text-cyan-950"
                          />
                          <span className="text-[10px] text-cyan-700 mt-1 block font-medium">
                            {stockLiter > 0 && totalCost > 0 
                              ? `Rumus: Rp ${totalCost.toLocaleString('id-ID')} ÷ ${stockLiter} L` 
                              : 'Otomatis dihitung'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* LIVE AUTOMATIC CONVERSION DOWNWARD BREAKDOWN (MILILITER / ML) */}
                    <div className="bg-white p-4 rounded-xl border border-cyan-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-cyan-100 pb-2">
                        <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                          <Calculator className="w-4 h-4 text-cyan-600" />
                          <span>2. Konversi Otomatis Rincian Modal ke Bawah (Per Mililiter / ml):</span>
                        </div>
                        <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                          Presisi Real-time
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {/* 1 Liter */}
                        <div className="bg-cyan-50/80 p-2.5 rounded-xl border border-cyan-200 text-center">
                          <span className="text-[10px] font-bold text-cyan-800 block uppercase">Per 1 Liter</span>
                          <span className="text-xs sm:text-sm font-black text-cyan-950 mt-0.5 block">
                            Rp {costPerLiter.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] text-cyan-600 block mt-0.5">Modal Pokok (1.000 ml)</span>
                        </div>

                        {/* 500 ml */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-600 block uppercase">Per 500 ml (1/2 L)</span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block">
                            Rp {cost500ml.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">Rumus: HPP &times; 0.5</span>
                        </div>

                        {/* 250 ml */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-600 block uppercase">Per 250 ml (1/4 L)</span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block">
                            Rp {cost250ml.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">Rumus: HPP &times; 0.25</span>
                        </div>

                        {/* 100 ml */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-600 block uppercase">Per 100 ml</span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block">
                            Rp {cost100ml.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">Rumus: HPP &times; 0.1</span>
                        </div>

                        {/* 1 ml */}
                        <div className="col-span-2 sm:col-span-1 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 text-center">
                          <span className="text-[10px] font-bold text-amber-800 block uppercase">Per 1 ml</span>
                          <span className="text-xs sm:text-sm font-black text-amber-950 mt-0.5 block">
                            Rp {cost1ml > 0 ? cost1ml.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '0'}
                          </span>
                          <span className="text-[9px] text-amber-600 block mt-0.5">Rumus: HPP &divide; 1.000</span>
                        </div>
                      </div>
                    </div>

                    {/* SELLING PRICE PER 1 LITER & REAL-TIME PROFIT */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                          <Coins className="w-4 h-4 text-cyan-600" />
                          <span>3. Harga Jual Eceran Pokok per 1 Liter:</span>
                        </div>
                        {costPerLiter > 0 && (
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-slate-500 font-semibold">Preset Margin:</span>
                            <button
                              type="button"
                              onClick={() => applyMarginLiter(10)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 font-bold border border-slate-200 transition"
                            >
                              +10%
                            </button>
                            <button
                              type="button"
                              onClick={() => applyMarginLiter(15)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 font-bold border border-slate-200 transition"
                            >
                              +15%
                            </button>
                            <button
                              type="button"
                              onClick={() => applyMarginLiter(20)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 font-bold border border-slate-200 transition"
                            >
                              +20%
                            </button>
                            <button
                              type="button"
                              onClick={() => applyMarginLiter(25)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 font-bold border border-slate-200 transition"
                            >
                              +25%
                            </button>
                            <button
                              type="button"
                              onClick={() => applyMarginLiter(30)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 font-bold border border-slate-200 transition"
                            >
                              +30%
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="font-bold text-slate-800 block mb-1">
                            Harga Jual per 1 Liter (Rp):
                          </label>
                          <FormattedNumberInput
                            value={sellingPrice}
                            onChange={(val) => setEditingProduct({ ...editingProduct, priceBase: val })}
                            prefix="Rp"
                            placeholder="16000"
                            className="bg-white font-black text-emerald-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Analisis Laba Penjualan per 1 Liter:
                          </label>
                          <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                            profitPerLiter >= 0 
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                              : 'bg-red-50 border-red-200 text-red-700'
                          }`}>
                            <span>{profitPerLiter >= 0 ? 'Potensi Keuntungan:' : 'Perhatian Rugi:'}</span>
                            <span className="font-mono">
                              {profitPerLiter >= 0 
                                ? `+Rp ${profitPerLiter.toLocaleString('id-ID')} (${marginPct}%)` 
                                : `-Rp ${Math.abs(profitPerLiter).toLocaleString('id-ID')}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DYNAMIC PACKAGING VARIANTS FOR LITER */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div>
                          <div className="font-black text-slate-900 flex items-center gap-1.5 text-xs">
                            <Package className="w-4 h-4 text-cyan-600" />
                            <span>4. Varian Kemasan Eceran Botol / Pouch (Potong Stok Master Liter)</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Kemasan repacking minyak goreng/cairan. Stok master liter terpotong otomatis saat transaksi.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const newVariant: RetailPackagingVariant = {
                              id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                              name: 'Kemasan Botol 500ml',
                              ratioToBase: 0.5,
                              unitLabel: 'Botol',
                              sellingPrice: Math.round((costPerLiter * 0.5 * 1.15) / 100) * 100 || 8000,
                              costPrice: Math.round(costPerLiter * 0.5),
                            };
                            setEditingProduct({
                              ...editingProduct,
                              packagingVariants: [...(editingProduct.packagingVariants || []), newVariant],
                            });
                          }}
                          className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Tambah Varian Kemasan</span>
                        </button>
                      </div>

                      {/* Quick Presets for Liquids */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500">Preset Cepat:</span>
                        <button
                          type="button"
                          onClick={() => addPackagingVariantPreset('250ml', 0.25, 'Kemasan Cup 250ml')}
                          className="px-2.5 py-1 bg-white hover:bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                        >
                          + Cup 250ml (0.25 L)
                        </button>
                        <button
                          type="button"
                          onClick={() => addPackagingVariantPreset('500ml', 0.5, 'Kemasan Botol 500ml')}
                          className="px-2.5 py-1 bg-white hover:bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                        >
                          + Botol 500ml (0.5 L)
                        </button>
                        <button
                          type="button"
                          onClick={() => addPackagingVariantPreset('1L', 1.0, 'Kemasan Botol 1 Liter')}
                          className="px-2.5 py-1 bg-white hover:bg-cyan-100 text-cyan-900 border border-cyan-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                        >
                          + Botol 1 Liter
                        </button>
                      </div>

                      {/* Variant list table */}
                      {editingProduct.packagingVariants && editingProduct.packagingVariants.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {editingProduct.packagingVariants.map((variant, vIdx) => {
                            const variantHpp = costPerLiter * (variant.ratioToBase || 0);
                            const profit = variant.sellingPrice - variantHpp;
                            const margin = variant.sellingPrice > 0 ? Math.round((profit / variant.sellingPrice) * 100) : 0;
                            const maxPacks = stockLiter > 0 && variant.ratioToBase > 0 ? Math.floor(stockLiter / variant.ratioToBase) : 0;

                            return (
                              <div
                                key={variant.id || vIdx}
                                className="bg-white p-3 rounded-xl border border-cyan-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center hover:border-cyan-400 transition"
                              >
                                <div className="sm:col-span-4">
                                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Nama Kemasan:</label>
                                  <input
                                    type="text"
                                    value={variant.name}
                                    onChange={(e) => {
                                      const updated = [...(editingProduct.packagingVariants || [])];
                                      updated[vIdx] = { ...updated[vIdx], name: e.target.value };
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900"
                                  />
                                </div>

                                <div className="sm:col-span-3">
                                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Isi (Liter):</label>
                                  <FormattedNumberInput
                                    value={variant.ratioToBase}
                                    onChange={(val) => {
                                      const updated = [...(editingProduct.packagingVariants || [])];
                                      const ratio = Math.max(0.01, val);
                                      updated[vIdx] = { 
                                        ...updated[vIdx], 
                                        ratioToBase: ratio,
                                        costPrice: Math.round(costPerLiter * ratio)
                                      };
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    allowDecimal={true}
                                    suffix="L"
                                    className="bg-slate-50 font-bold"
                                  />
                                  <span className="text-[9px] text-slate-400 block mt-0.5">
                                    HPP: Rp {Math.round(variantHpp).toLocaleString('id-ID')} &bull; Stok: {maxPacks} botol
                                  </span>
                                </div>

                                <div className="sm:col-span-4">
                                  <label className="text-[10px] font-bold text-emerald-800 block mb-0.5">Harga Jual (Rp):</label>
                                  <FormattedNumberInput
                                    value={variant.sellingPrice}
                                    onChange={(val) => {
                                      const updated = [...(editingProduct.packagingVariants || [])];
                                      updated[vIdx] = { ...updated[vIdx], sellingPrice: val };
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    prefix="Rp"
                                    className="bg-white font-black text-emerald-900"
                                  />
                                  {variant.sellingPrice > 0 && costPerLiter > 0 && (
                                    <span className={`text-[9px] font-bold block mt-0.5 ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                      {profit >= 0 ? `+Rp ${Math.round(profit).toLocaleString('id-ID')} (${margin}%)` : `-Rp ${Math.round(Math.abs(profit)).toLocaleString('id-ID')}`}
                                    </span>
                                  )}
                                </div>

                                <div className="sm:col-span-1 flex justify-end sm:justify-center pt-2 sm:pt-4">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = editingProduct.packagingVariants?.filter((_, i) => i !== vIdx);
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition"
                                    title="Hapus varian"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-white p-4 rounded-xl border border-dashed border-cyan-300 text-center text-slate-500 text-[11px]">
                          Belum ada varian kemasan botol/pouch. Klik salah satu tombol preset di atas atau tambah custom.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* GENERAL ALERT THRESHOLD FOR NON-PCS/LITER TYPES */}
              {productType !== 'pcs' && productType !== 'liter' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Batas Peringatan Stok Menipis (Warning Alert):
                  </label>
                  <FormattedNumberInput
                    value={editingProduct.minStockAlert}
                    onChange={(val) => setEditingProduct({ ...editingProduct, minStockAlert: val })}
                    allowDecimal={editingProduct.isWeighable || editingProduct.baseUnit === 'kg'}
                    suffix={editingProduct.baseUnit}
                    placeholder="10"
                    className="bg-slate-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Sistem memberikan peringatan visual di kasir jika stok &le; {editingProduct.minStockAlert || 10} {editingProduct.baseUnit}
                  </p>
                </div>
              )}

            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveProductForm}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Produk</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deletingProductTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Hapus Produk dari Database?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><strong>Nama Barang:</strong> {deletingProductTarget.name}</div>
              <div><strong>Kode SKU:</strong> <span className="font-mono font-bold text-slate-800">{deletingProductTarget.code}</span></div>
              <div><strong>Sisa Stok:</strong> {deletingProductTarget.stock} {deletingProductTarget.baseUnit}</div>
            </div>

            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus produk <strong>"{deletingProductTarget.name}"</strong> secara permanen dari katalog stok toko?
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProductTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(deletingProductTarget.id);
                  const name = deletingProductTarget.name;
                  setDeletingProductTarget(null);
                  showToast(`Produk "${name}" berhasil dihapus secara real-time!`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Produk</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
