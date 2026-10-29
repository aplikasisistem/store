import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Product, UnitType, RetailPackagingVariant } from '../types';
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
  Coins
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
  const [restockNotes, setRestockNotes] = useState<string>('');

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
    const defaultUnit = product.tierConfig?.tier3Name || product.baseUnit;
    setRestockUnit(defaultUnit);
    setRestockQty(1);
    const matched = available.find((u) => u.unit === defaultUnit) || available[0];
    setRestockCost(matched.cost);
    setRestockNotes('Restok dari supplier');
  };

  const handleExecuteRestock = () => {
    if (!restockProductTarget || restockQty <= 0) return;
    restockProduct(restockProductTarget.id, restockUnit, restockQty, restockNotes, restockCost);
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
                  <th className="py-2.5 px-3">Jumlah (Base Unit)</th>
                  <th className="py-2.5 px-3">Perubahan Stok</th>
                  <th className="py-2.5 px-4">Catatan Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {stockLogs.map((log) => {
                  const isAdd = log.baseQuantityChange > 0;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800">{log.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{log.productCode}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-600 uppercase text-[10px]">
                        {log.type}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">
                        {log.originalQuantity} {log.originalUnit}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-black px-2 py-0.5 rounded ${
                            isAdd ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {isAdd ? `+${log.baseQuantityChange}` : log.baseQuantityChange} {log.baseUnit}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 italic">
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

      {/* RESTOCK MODAL */}
      {restockProductTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4">
            <div className="bg-emerald-950 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <PackagePlus className="w-4 h-4 text-emerald-400" />
                  <span>Restok Barang Masuk</span>
                </h3>
                <p className="text-[11px] text-emerald-200 mt-0.5">{restockProductTarget.name}</p>
              </div>
              <button
                onClick={() => setRestockProductTarget(null)}
                className="text-emerald-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              {/* Unit selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Pilih Satuan Barang Restok Masuk:
                </label>
                <select
                  value={restockUnit}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setRestockUnit(selected);
                    const available = storage.getAvailableUnitsForProduct(restockProductTarget);
                    const matched = available.find((u) => u.unit === selected);
                    if (matched) setRestockCost(matched.cost);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                >
                  {storage.getAvailableUnitsForProduct(restockProductTarget).map((u, uIdx) => (
                    <option key={`${u.variantId || u.unit}-${uIdx}`} value={u.unit}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Restock Quantity */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jumlah Restok Masuk ({restockUnit}):
                </label>
                <FormattedNumberInput
                  value={restockQty}
                  onChange={(val) => setRestockQty(val)}
                  allowDecimal={restockProductTarget.isWeighable || restockUnit === 'kg'}
                  suffix={restockUnit}
                  className="bg-white"
                  placeholder="1"
                />
              </div>

              {/* Live conversion info */}
              {(() => {
                const available = storage.getAvailableUnitsForProduct(restockProductTarget);
                const matched = available.find((u) => u.unit === restockUnit);
                const ratio = matched ? matched.ratio : 1;
                const baseAdded = restockQty * ratio;
                const newTotal = restockProductTarget.stock + baseAdded;

                return (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Kalkulasi Otomatis Konversi:</span>
                    </div>
                    <div className="text-emerald-800">
                      {formatNumberWithDots(restockQty, restockProductTarget.isWeighable || restockUnit === 'kg')} {restockUnit} = <strong>+{formatNumberWithDots(baseAdded, true)} {restockProductTarget.baseUnit}</strong>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Stok Sekarang: {formatNumberWithDots(restockProductTarget.stock, true)} {restockProductTarget.baseUnit} ➔{' '}
                      <strong>Menjadi: {formatNumberWithDots(newTotal, true)} {restockProductTarget.baseUnit}</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Supplier Purchase Cost */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Harga Beli per {restockUnit} (Modal Supplier):
                </label>
                <FormattedNumberInput
                  value={restockCost}
                  onChange={(val) => setRestockCost(val)}
                  prefix="Rp"
                  className="bg-white"
                  placeholder="0"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan Restok:
                </label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="Nama supplier / nomor DO faktur"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setRestockProductTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteRestock}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs"
              >
                Konfirmasi Masuk Stok
              </button>
            </div>
          </div>
        </div>
      )}

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
                  setEditingProduct({
                    ...editingProduct,
                    priceBase: targetPrice,
                    hargaJualKg: targetPrice,
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
