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
      stock: 50,
      minStockAlert: 10,
      costBase: 12500,
      priceBase: 15000,
      hargaJualKg: 15000,
      hargaJualGram500: 7500,
      hargaJualGram250: 4000,
      hargaJualGram100: 2000,
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
    if (p.baseUnit === 'kg' || p.isWeighable || p.hargaJualKg) {
      initialType = 'kg';
    } else if (
      (p.rasioRencengPerDus && p.rasioPcsPerRenceng) ||
      p.tierConfig?.tier3Name === 'dus' ||
      p.baseUnit === 'dus' ||
      (p.tierConfig?.tier3Ratio && p.tierConfig.tier3Ratio > 1)
    ) {
      initialType = 'box';
    } else if (p.baseUnit === 'liter' || p.baseUnit === 'botol') {
      initialType = 'liter';
    } else {
      initialType = 'pcs';
    }
    setProductType(initialType);

    const priceKg = p.hargaJualKg || p.priceBase || 15000;
    const enrichedProduct: Product = {
      ...p,
      hargaJualKg: p.hargaJualKg || priceKg,
      hargaJualGram500: p.hargaJualGram500 || Math.round(((priceKg * 0.5) / 100)) * 100,
      hargaJualGram250: p.hargaJualGram250 || Math.round(((priceKg * 0.25) / 100)) * 100,
      hargaJualGram100: p.hargaJualGram100 || Math.round(((priceKg * 0.1) / 100)) * 100,
    };

    setEditingProduct(enrichedProduct);
    setIsEditModalOpen(true);
  };

  // Switch Product Type Tabs (Step 1)
  const handleSelectProductType = (type: 'kg' | 'box' | 'pcs' | 'liter') => {
    setProductType(type);
    if (!editingProduct) return;

    if (type === 'kg') {
      const priceKg = editingProduct.hargaJualKg || editingProduct.priceBase || 15000;
      setEditingProduct({
        ...editingProduct,
        baseUnit: 'kg',
        isWeighable: true,
        stock: editingProduct.stock || 50,
        costBase: editingProduct.costBase || 12500,
        priceBase: priceKg,
        hargaJualKg: priceKg,
        hargaJualGram500: editingProduct.hargaJualGram500 || Math.round(((priceKg * 0.5) / 100)) * 100 || 7500,
        hargaJualGram250: editingProduct.hargaJualGram250 || Math.round(((priceKg * 0.25) / 100)) * 100 || 4000,
        hargaJualGram100: editingProduct.hargaJualGram100 || Math.round(((priceKg * 0.1) / 100)) * 100 || 2000,
        tierConfig: {
          ...editingProduct.tierConfig,
          baseUnit: 'kg',
        },
      });
    } else if (type === 'box') {
      const rencengPerDus = editingProduct.rasioRencengPerDus || 48;
      const pcsPerRenceng = editingProduct.rasioPcsPerRenceng || 12;
      const totalRatio = rencengPerDus * pcsPerRenceng;
      const boxSelling = editingProduct.hargaJualDus || editingProduct.tierConfig?.priceTier3 || (editingProduct.priceBase ? editingProduct.priceBase * totalRatio : 120000);
      const boxCost = editingProduct.tierConfig?.costTier3 || (editingProduct.costBase ? editingProduct.costBase * totalRatio : 100000);
      const rencengSelling = editingProduct.hargaJualRenceng || (editingProduct.tierConfig?.priceTier2 || Math.round((boxSelling / rencengPerDus) * 1.1 / 100) * 100 || 2800);
      const pcsSelling = editingProduct.hargaJualPcs || editingProduct.priceBase || Math.round(boxSelling / totalRatio) || 300;
      const unitCost = Math.round(boxCost / totalRatio);

      // Default box quantity
      const currentBoxQty = editingProduct.stock ? Math.floor(editingProduct.stock / totalRatio) : 50;

      setEditingProduct({
        ...editingProduct,
        baseUnit: 'pcs',
        isWeighable: false,
        stock: currentBoxQty * totalRatio,
        rasioRencengPerDus: rencengPerDus,
        rasioPcsPerRenceng: pcsPerRenceng,
        hargaJualDus: boxSelling,
        hargaJualRenceng: rencengSelling,
        hargaJualPcs: pcsSelling,
        costBase: unitCost,
        priceBase: pcsSelling,
        tierConfig: {
          ...editingProduct.tierConfig,
          baseUnit: 'pcs',
          tier2Name: 'renceng',
          tier2Ratio: pcsPerRenceng,
          priceTier2: rencengSelling,
          costTier2: unitCost * pcsPerRenceng,
          tier3Name: 'dus',
          tier3Ratio: totalRatio,
          costTier3: boxCost,
          priceTier3: boxSelling,
        },
      });
    } else if (type === 'liter') {
      setEditingProduct({
        ...editingProduct,
        baseUnit: 'liter',
        isWeighable: false,
        tierConfig: {
          ...editingProduct.tierConfig,
          baseUnit: 'liter',
        },
      });
    } else {
      setEditingProduct({
        ...editingProduct,
        baseUnit: 'pcs',
        isWeighable: false,
        tierConfig: {
          ...editingProduct.tierConfig,
          baseUnit: 'pcs',
        },
      });
    }
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

    const isBoxType = productType === 'box' || Boolean(editingProduct.rasioRencengPerDus && editingProduct.rasioPcsPerRenceng);
    const isKgType = productType === 'kg' || editingProduct.baseUnit === 'kg' || Boolean(editingProduct.hargaJualKg);
    const effectivePriceBase = isBoxType && editingProduct.hargaJualPcs 
      ? Number(editingProduct.hargaJualPcs) 
      : isKgType && editingProduct.hargaJualKg
      ? Number(editingProduct.hargaJualKg)
      : Number(editingProduct.priceBase || 0);

    const prodToSave = {
      ...editingProduct,
      name: editingProduct.name.trim(),
      code: editingProduct.code.trim(),
      stock: Number(editingProduct.stock || 0),
      minStockAlert: Number(editingProduct.minStockAlert || 5),
      costBase: Number(editingProduct.costBase || 0),
      priceBase: effectivePriceBase,
      // 3-tier box
      rasioRencengPerDus: isBoxType && editingProduct.rasioRencengPerDus ? Number(editingProduct.rasioRencengPerDus) : undefined,
      rasioPcsPerRenceng: isBoxType && editingProduct.rasioPcsPerRenceng ? Number(editingProduct.rasioPcsPerRenceng) : undefined,
      hargaJualDus: isBoxType && editingProduct.hargaJualDus ? Number(editingProduct.hargaJualDus) : undefined,
      hargaJualRenceng: isBoxType && editingProduct.hargaJualRenceng ? Number(editingProduct.hargaJualRenceng) : undefined,
      hargaJualPcs: isBoxType && editingProduct.hargaJualPcs ? Number(editingProduct.hargaJualPcs) : undefined,
      // Multi-price weighted
      hargaJualKg: isKgType && editingProduct.hargaJualKg ? Number(editingProduct.hargaJualKg) : (isBoxType ? undefined : editingProduct.hargaJualKg),
      hargaJualGram500: isKgType && editingProduct.hargaJualGram500 ? Number(editingProduct.hargaJualGram500) : (isBoxType ? undefined : editingProduct.hargaJualGram500),
      hargaJualGram250: isKgType && editingProduct.hargaJualGram250 ? Number(editingProduct.hargaJualGram250) : (isBoxType ? undefined : editingProduct.hargaJualGram250),
      hargaJualGram100: isKgType && editingProduct.hargaJualGram100 ? Number(editingProduct.hargaJualGram100) : (isBoxType ? undefined : editingProduct.hargaJualGram100),
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
                        {/* Name & SKU */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.isWeighable && (
                              <span title="Barang Timbangan">
                                <Scale className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">{p.code}</span>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {p.category}
                          </span>
                        </td>

                        {/* Multi-Tier Units & Packaging Variants Info */}
                        <td className="py-3 px-3">
                          {p.rasioRencengPerDus && p.rasioPcsPerRenceng ? (
                            <div className="space-y-1">
                              <div className="font-extrabold text-amber-950 bg-amber-100/90 px-2 py-1 rounded-md border border-amber-300 text-[11px] inline-block shadow-2xs">
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
                              <div className="font-extrabold text-emerald-950 bg-emerald-100/90 px-2 py-1 rounded-md border border-emerald-300 text-[11px] inline-block shadow-2xs">
                                1 KG = 1.000 Gram
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
                              {p.packagingVariants && p.packagingVariants.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {p.packagingVariants.map((v) => (
                                    <span
                                      key={v.id}
                                      className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded font-bold"
                                      title={`1 ${v.unitLabel} = ${v.ratioToBase} ${p.baseUnit} (@ Rp ${v.sellingPrice.toLocaleString('id-ID')})`}
                                    >
                                      {v.name.replace('Kemasan ', '')}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1 text-[11px]">
                              <div className="font-semibold text-slate-800">
                                Base: <span className="uppercase font-bold">{p.baseUnit}</span>
                              </div>
                              {p.packagingVariants && p.packagingVariants.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {p.packagingVariants.map((v) => (
                                    <span
                                      key={v.id}
                                      className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded font-bold"
                                      title={`1 ${v.unitLabel} = ${v.ratioToBase} ${p.baseUnit} (@ Rp ${v.sellingPrice.toLocaleString('id-ID')})`}
                                    >
                                      {v.name.replace('Kemasan ', '')}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {p.tierConfig?.tier2Name && (
                                <div className="text-slate-500 text-[10px]">
                                  1 {p.tierConfig.tier2Name} = {p.tierConfig.tier2Ratio} {p.baseUnit}
                                </div>
                              )}
                              {p.tierConfig?.tier3Name && (
                                <div className="text-emerald-700 font-medium text-[10px]">
                                  1 {p.tierConfig.tier3Name} = {p.tierConfig.tier3Ratio} {p.baseUnit}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Master Stock Status Badge */}
                        <td className="py-3 px-3">
                          {p.rasioRencengPerDus && p.rasioPcsPerRenceng ? (
                            <div className="space-y-1">
                              <span
                                className={`inline-block px-2 py-1 rounded-lg text-xs font-black ${
                                  isOut
                                    ? 'bg-red-100 text-red-700'
                                    : isLow
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                Stok Master: {p.stock.toLocaleString('id-ID')} Pcs
                              </span>
                              <div className="text-[10px] text-slate-600 font-semibold">
                                ≈ {(p.stock / (p.rasioRencengPerDus * p.rasioPcsPerRenceng)).toFixed(1)} Dus ({Math.floor(p.stock / p.rasioPcsPerRenceng).toLocaleString('id-ID')} Renceng)
                              </div>
                            </div>
                          ) : (p.baseUnit === 'kg' || p.isWeighable || p.hargaJualKg) ? (
                            <div className="space-y-1">
                              <span
                                className={`inline-block px-2 py-1 rounded-lg text-xs font-black ${
                                  isOut
                                    ? 'bg-red-100 text-red-700'
                                    : isLow
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                Stok Master: {p.stock} kg
                              </span>
                              <div className="text-[10px] text-slate-600 font-semibold">
                                ≈ {p.stock > 0 ? (p.stock / 0.5).toFixed(0) : 0} bks (500g) &bull; {p.stock > 0 ? (p.stock / 0.25).toFixed(0) : 0} bks (250g)
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span
                                className={`inline-block px-2 py-1 rounded-lg text-xs font-black ${
                                  isOut
                                    ? 'bg-red-100 text-red-700'
                                    : isLow
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                Stok Master: {p.stock} {p.baseUnit}
                              </span>
                              {p.packagingVariants && p.packagingVariants.length > 0 && p.stock > 0 && (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  s/d {Math.floor(p.stock / p.packagingVariants[0].ratioToBase)} bks ({p.packagingVariants[0].name.replace('Kemasan ', '')})
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Cost (HPP) */}
                        <td className="py-3 px-3 font-semibold text-slate-600">
                          {p.rasioRencengPerDus && p.rasioPcsPerRenceng ? (
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
                          ) : (
                            <div>
                              Rp {p.costBase.toLocaleString('id-ID')}
                              {p.tierConfig?.tier3Ratio && (
                                <span className="block text-[10px] text-slate-400">
                                  (Dus: Rp {(p.tierConfig.costTier3 || p.costBase * p.tierConfig.tier3Ratio).toLocaleString('id-ID')})
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Selling Price (Stacked) */}
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {p.rasioRencengPerDus && p.rasioPcsPerRenceng ? (
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
                                <span className="text-[10px] font-bold text-slate-600">250g (Eceran):</span>
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
                          ) : (
                            <div>
                              Rp {p.priceBase.toLocaleString('id-ID')}
                              {p.tierConfig?.tier3Ratio && (
                                <span className="block text-[10px] text-emerald-700">
                                  (Dus: Rp {(p.tierConfig.priceTier3 || p.priceBase * p.tierConfig.tier3Ratio).toLocaleString('id-ID')})
                                </span>
                              )}
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
                  {storage.getAvailableUnitsForProduct(restockProductTarget).map((u) => (
                    <option key={u.unit} value={u.unit}>
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

              {/* FLOW A: KG / WEIGHT FORM */}
              {productType === 'kg' && (
                <div className="space-y-4">
                  {/* Stock & Cost Base */}
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-emerald-600" />
                        <span>Parameter Stok Masuk &amp; Modal (HPP):</span>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                        Base Unit: KG (Desimal Otomatis)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Total Stok Masuk (kg):</label>
                        <FormattedNumberInput
                          value={editingProduct.stock}
                          onChange={(val) => setEditingProduct({ ...editingProduct, stock: val })}
                          allowDecimal={true}
                          suffix="kg"
                          placeholder="50"
                          className="bg-white font-bold"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Masukkan stok awal langsung dalam kg (misal: 50 kg untuk 1 karung beras).
                        </span>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Harga Beli Modal (HPP per 1 kg):</label>
                        <FormattedNumberInput
                          value={editingProduct.costBase}
                          onChange={(val) => setEditingProduct({ ...editingProduct, costBase: val })}
                          prefix="Rp"
                          placeholder="0"
                          className="bg-white"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          HPP 500g: Rp {Math.round((editingProduct.costBase || 0) * 0.5).toLocaleString('id-ID')} &bull; 250g: Rp {Math.round((editingProduct.costBase || 0) * 0.25).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MULTI-PRICE INPUT FIELDS (KG / 500g / 250g / 100g) WITH AUTO-CALCULATION */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <div>
                        <div className="font-black text-slate-900 flex items-center gap-1.5 text-xs">
                          <Coins className="w-4 h-4 text-amber-600" />
                          <span>Multi-Harga Jual Barang Timbangan &amp; Pecahan Gram</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Tentukan harga jual bertingkat untuk penjualan 1 KG dan pecahan eceran gram.
                        </p>
                      </div>

                      {/* Auto-Calculate Suggestion Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const base = editingProduct.hargaJualKg || editingProduct.priceBase || 15000;
                          const p500 = Math.round((base * 0.5) / 100) * 100;
                          const p250 = Math.round((base * 0.25 * 1.05) / 100) * 100; // e.g. 4000
                          const p100 = Math.round((base * 0.1 * 1.33) / 100) * 100; // e.g. 2000
                          setEditingProduct({
                            ...editingProduct,
                            priceBase: base,
                            hargaJualKg: base,
                            hargaJualGram500: p500,
                            hargaJualGram250: p250,
                            hargaJualGram100: p100,
                          });
                        }}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-2xs"
                        title="Hitung otomatis harga jual pecahan berdasarkan rasio gram dan margin eceran"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>💡 Hitung Otomatis Rasio Gram</span>
                      </button>
                    </div>

                    {/* 4 Distinct Input Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* [ Price per KG ] */}
                      <div className="bg-white p-2.5 rounded-xl border border-emerald-300/80 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-black text-emerald-900 text-xs">Harga per 1 KG:</label>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">Master</span>
                        </div>
                        <FormattedNumberInput
                          value={editingProduct.hargaJualKg ?? editingProduct.priceBase}
                          onChange={(val) => {
                            setEditingProduct({
                              ...editingProduct,
                              hargaJualKg: val,
                              priceBase: val,
                            });
                          }}
                          prefix="Rp"
                          placeholder="15000"
                          className="bg-emerald-50/40 font-black text-slate-900 border-emerald-200"
                        />
                        <span className="text-[10px] text-slate-400 block">
                          Harga dasar per 1.000 gram
                        </span>
                      </div>

                      {/* [ Price per 500g ] */}
                      <div className="bg-white p-2.5 rounded-xl border border-amber-300/80 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-black text-amber-900 text-xs">Harga 500g (1/2 kg):</label>
                          <button
                            type="button"
                            onClick={() => {
                              const base = editingProduct.hargaJualKg || editingProduct.priceBase || 15000;
                              const sugg = Math.round((base * 0.5) / 100) * 100;
                              setEditingProduct({ ...editingProduct, hargaJualGram500: sugg });
                            }}
                            className="text-[9px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-1 py-0.2 rounded border border-amber-200"
                            title="Terapkan saran 50%"
                          >
                            Saran Rp {Math.round(((editingProduct.hargaJualKg || editingProduct.priceBase || 15000) * 0.5) / 100 * 100).toLocaleString('id-ID')}
                          </button>
                        </div>
                        <FormattedNumberInput
                          value={editingProduct.hargaJualGram500 ?? Math.round(((editingProduct.hargaJualKg || editingProduct.priceBase || 15000) * 0.5) / 100) * 100}
                          onChange={(val) => setEditingProduct({ ...editingProduct, hargaJualGram500: val })}
                          prefix="Rp"
                          placeholder="7500"
                          className="bg-amber-50/40 font-black text-slate-900 border-amber-200"
                        />
                        <span className="text-[10px] text-slate-400 block">
                          Kemasan 1/2 kg eceran
                        </span>
                      </div>

                      {/* [ Price per 250g ] */}
                      <div className="bg-white p-2.5 rounded-xl border border-blue-300/80 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-black text-blue-900 text-xs">Harga 250g (1/4 kg):</label>
                          <button
                            type="button"
                            onClick={() => {
                              const base = editingProduct.hargaJualKg || editingProduct.priceBase || 15000;
                              const sugg = Math.round((base * 0.25 * 1.05) / 100) * 100;
                              setEditingProduct({ ...editingProduct, hargaJualGram250: sugg });
                            }}
                            className="text-[9px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-1 py-0.2 rounded border border-blue-200"
                            title="Terapkan saran eceran 250g"
                          >
                            Saran Rp {Math.round(((editingProduct.hargaJualKg || editingProduct.priceBase || 15000) * 0.25 * 1.05) / 100 * 100).toLocaleString('id-ID')}
                          </button>
                        </div>
                        <FormattedNumberInput
                          value={editingProduct.hargaJualGram250 ?? Math.round(((editingProduct.hargaJualKg || editingProduct.priceBase || 15000) * 0.25 * 1.05) / 100) * 100}
                          onChange={(val) => setEditingProduct({ ...editingProduct, hargaJualGram250: val })}
                          prefix="Rp"
                          placeholder="4000"
                          className="bg-blue-50/40 font-black text-slate-900 border-blue-200"
                        />
                        <span className="text-[10px] text-slate-400 block">
                          Kemasan 1/4 kg eceran
                        </span>
                      </div>

                      {/* [ Price per 100g ] */}
                      <div className="bg-white p-2.5 rounded-xl border border-purple-300/80 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-black text-purple-900 text-xs">Harga 100g (Eceran):</label>
                          <button
                            type="button"
                            onClick={() => {
                              const base = editingProduct.hargaJualKg || editingProduct.priceBase || 15000;
                              const sugg = Math.round((base * 0.1 * 1.33) / 100) * 100;
                              setEditingProduct({ ...editingProduct, hargaJualGram100: sugg });
                            }}
                            className="text-[9px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-1 py-0.2 rounded border border-purple-200"
                            title="Terapkan saran eceran 100g"
                          >
                            Saran Rp {Math.round(((editingProduct.hargaJualKg || editingProduct.priceBase || 15000) * 0.1 * 1.33) / 100 * 100).toLocaleString('id-ID')}
                          </button>
                        </div>
                        <FormattedNumberInput
                          value={editingProduct.hargaJualGram100 ?? Math.round(((editingProduct.hargaJualKg || editingProduct.priceBase || 15000) * 0.1 * 1.33) / 100) * 100}
                          onChange={(val) => setEditingProduct({ ...editingProduct, hargaJualGram100: val })}
                          prefix="Rp"
                          placeholder="2000"
                          className="bg-purple-50/40 font-black text-slate-900 border-purple-200"
                        />
                        <span className="text-[10px] text-slate-400 block">
                          Pecahan 100 gram
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AUTO-TIER GRAM TO KG CONVERSION & PACKAGING VARIANTS */}
                  <div className="space-y-3 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/70">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <Package className="w-4 h-4 text-amber-600" />
                        <span>Varian Kemasan Eceran Tambahan</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                        Potong Stok Master Real-time
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600">
                      Preset kemasan eceran siap pakai. Stok master berkurang otomatis saat terjual di kasir.
                    </p>

                    {/* ACTIVE QUICK PRESET BUTTONS */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-500">Preset Cepat:</span>
                      <button
                        type="button"
                        onClick={() => addPackagingVariantPreset('100g', 0.1, 'Kemasan 100g (0.1 kg)')}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                      >
                        + 100g (0.1 kg)
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
                        onClick={() => addPackagingVariantPreset('1kg', 1.0, 'Kemasan 1 kg')}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition shadow-2xs"
                      >
                        + 1 kg
                      </button>
                      <button
                        type="button"
                        onClick={() => addPackagingVariantPreset('custom', 0.2, 'Kemasan Varian Baru')}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition shadow-2xs flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Tambah Varian Baru</span>
                      </button>
                    </div>

                    {/* PACKAGING VARIANTS LIST TABLE (WITH DISABLED EDIT & DELETE BUTTONS) */}
                    {editingProduct.packagingVariants && editingProduct.packagingVariants.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {editingProduct.packagingVariants.map((variant, vIdx) => {
                          const maxUnits = editingProduct.stock && variant.ratioToBase > 0 
                            ? Math.floor(editingProduct.stock / variant.ratioToBase) 
                            : 0;
                          return (
                            <div
                              key={variant.id || vIdx}
                              className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{variant.name}</span>
                                </span>

                                {/* DISABLED EDIT & DELETE BUTTONS PER SPECIFICATION */}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={true}
                                    className="opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1 text-[10px] font-bold"
                                    title="Tindakan Edit & Hapus Varian Dikunci"
                                  >
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={true}
                                    className="opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1 text-[10px] font-bold"
                                    title="Tindakan Edit & Hapus Varian Dikunci"
                                  >
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                                <div>
                                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                                    Berat/Rasio ke KG:
                                  </label>
                                  <div className="bg-slate-50 border rounded-lg px-2 py-1 font-mono font-bold text-slate-700">
                                    {variant.ratioToBase} kg
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-emerald-800 block mb-0.5">
                                    Harga Jual Eceran Varian:
                                  </label>
                                  <FormattedNumberInput
                                    value={variant.sellingPrice}
                                    onChange={(val) => {
                                      const updated = [...(editingProduct.packagingVariants || [])];
                                      updated[vIdx] = { ...updated[vIdx], sellingPrice: val };
                                      setEditingProduct({ ...editingProduct, packagingVariants: updated });
                                    }}
                                    prefix="Rp"
                                    placeholder="0"
                                    className="bg-slate-50 font-bold"
                                  />
                                </div>

                                <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                                  <div className="text-[10px] bg-amber-50/80 border border-amber-200 rounded-lg p-1.5 font-semibold text-amber-900">
                                    <span>Dari Stok Master: </span>
                                    <strong className="text-emerald-700">{maxUnits} pcs</strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <div className="text-[10px] text-amber-800 flex items-center gap-1 font-semibold pt-1">
                          <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Tindakan Edit &amp; Hapus varian dikunci untuk mencegah kesalahan modifikasi data persediaan.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/60 p-3 rounded-xl border border-dashed border-amber-300 text-center text-slate-500 text-[11px]">
                        Belum ada varian kemasan eceran. Klik tombol preset cepat di atas untuk menambahkan.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FLOW B: BOX / WHOLESALE DUS FORM (3-TIER MULTI-UNIT CONVERSION) */}
              {productType === 'box' && (
                <div className="space-y-4">
                  <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                      <div className="font-extrabold text-amber-950 flex items-center gap-1.5 text-xs sm:text-sm">
                        <Boxes className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Konversi Bertingkat 3-Tier: Dus ➔ Strip/Renceng ➔ Pcs</span>
                      </div>
                      <span className="text-[10px] font-black bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                        Multi-Level Selling Price
                      </span>
                    </div>

                    {/* Step 1: Multi-Tier Conversion Ratios & Incoming Stock */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">
                          1. Stok Masuk (Jumlah Dus):
                        </label>
                        {(() => {
                          const rencengPerDus = editingProduct.rasioRencengPerDus || 48;
                          const pcsPerRenceng = editingProduct.rasioPcsPerRenceng || 12;
                          const totalPerDus = rencengPerDus * pcsPerRenceng;
                          const currentBoxQty = totalPerDus > 0 ? Math.floor((editingProduct.stock || 0) / totalPerDus) : 1;

                          return (
                            <FormattedNumberInput
                              value={currentBoxQty || 50}
                              onChange={(boxQty) => {
                                const validBoxes = Math.max(1, boxQty);
                                const totalPcs = validBoxes * totalPerDus;
                                setEditingProduct({
                                  ...editingProduct,
                                  stock: totalPcs,
                                });
                              }}
                              suffix="Dus"
                              placeholder="50"
                              className="bg-white font-black text-amber-950"
                            />
                          );
                        })()}
                        <p className="text-[10px] text-slate-500 mt-1">Jumlah kotak/dus yang dibeli.</p>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">
                          2. Rasio Renceng / Strip per Dus:
                        </label>
                        <FormattedNumberInput
                          value={editingProduct.rasioRencengPerDus || 48}
                          onChange={(rRenceng) => {
                            const validRenceng = Math.max(1, rRenceng);
                            const pcsPerRenceng = editingProduct.rasioPcsPerRenceng || 12;
                            const totalPerDus = validRenceng * pcsPerRenceng;
                            const currentBoxQty = editingProduct.rasioRencengPerDus
                              ? Math.floor((editingProduct.stock || 0) / (editingProduct.rasioRencengPerDus * pcsPerRenceng))
                              : 50;
                            const totalPcs = Math.max(1, currentBoxQty) * totalPerDus;

                            setEditingProduct({
                              ...editingProduct,
                              rasioRencengPerDus: validRenceng,
                              stock: totalPcs,
                              tierConfig: {
                                ...editingProduct.tierConfig,
                                baseUnit: 'pcs',
                                tier2Name: 'renceng',
                                tier2Ratio: pcsPerRenceng,
                                tier3Name: 'dus',
                                tier3Ratio: totalPerDus,
                              },
                            });
                          }}
                          suffix="Renceng"
                          placeholder="48"
                          className="bg-white font-bold"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Contoh: 1 Dus isi 48 Renceng.</p>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">
                          3. Rasio Pcs per Strip / Renceng:
                        </label>
                        <FormattedNumberInput
                          value={editingProduct.rasioPcsPerRenceng || 12}
                          onChange={(rPcs) => {
                            const validPcs = Math.max(1, rPcs);
                            const rencengPerDus = editingProduct.rasioRencengPerDus || 48;
                            const totalPerDus = rencengPerDus * validPcs;
                            const currentBoxQty = editingProduct.rasioPcsPerRenceng
                              ? Math.floor((editingProduct.stock || 0) / (rencengPerDus * editingProduct.rasioPcsPerRenceng))
                              : 50;
                            const totalPcs = Math.max(1, currentBoxQty) * totalPerDus;

                            setEditingProduct({
                              ...editingProduct,
                              rasioPcsPerRenceng: validPcs,
                              stock: totalPcs,
                              tierConfig: {
                                ...editingProduct.tierConfig,
                                baseUnit: 'pcs',
                                tier2Name: 'renceng',
                                tier2Ratio: validPcs,
                                tier3Name: 'dus',
                                tier3Ratio: totalPerDus,
                              },
                            });
                          }}
                          suffix="Pcs/Strip"
                          placeholder="12"
                          className="bg-white font-bold"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Contoh: 1 Renceng isi 12 Pcs.</p>
                      </div>
                    </div>

                    {/* Live Calculation Ratio Banner */}
                    {(() => {
                      const rencengPerDus = editingProduct.rasioRencengPerDus || 48;
                      const pcsPerRenceng = editingProduct.rasioPcsPerRenceng || 12;
                      const totalPerDus = rencengPerDus * pcsPerRenceng;
                      const boxQty = totalPerDus > 0 ? Math.floor((editingProduct.stock || 0) / totalPerDus) : 0;

                      return (
                        <div className="bg-gradient-to-r from-amber-100/90 to-amber-50 border border-amber-300 p-3 rounded-xl text-xs space-y-1">
                          <div className="font-extrabold text-amber-950 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Konversi Otomatis Persediaan:
                            </span>
                            <span className="bg-amber-200/90 text-amber-900 font-mono text-[11px] px-2 py-0.5 rounded font-black">
                              1 Dus = {rencengPerDus} Renceng = {totalPerDus} Pcs
                            </span>
                          </div>
                          <div className="text-amber-900 font-medium">
                            Total Stok Master Dicatat: <strong className="text-emerald-800 text-sm font-black">{(editingProduct.stock || 0).toLocaleString('id-ID')} Pcs</strong> ({boxQty} Dus = {(boxQty * rencengPerDus).toLocaleString('id-ID')} Renceng)
                          </div>
                        </div>
                      );
                    })()}

                    {/* Step 2: HPP & Auto-Calculated Cost Suggestions */}
                    <div className="bg-white/80 p-3.5 rounded-xl border border-amber-200 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-800 block mb-1">
                            Harga Beli per Dus (HPP Dus):
                          </label>
                          {(() => {
                            const rencengPerDus = editingProduct.rasioRencengPerDus || 48;
                            const pcsPerRenceng = editingProduct.rasioPcsPerRenceng || 12;
                            const totalPerDus = rencengPerDus * pcsPerRenceng;
                            const boxCost = editingProduct.tierConfig?.costTier3 || (editingProduct.costBase || 0) * totalPerDus || 100000;

                            return (
                              <FormattedNumberInput
                                value={boxCost}
                                onChange={(val) => {
                                  const costPerPcs = Math.round(val / (totalPerDus || 1));
                                  setEditingProduct({
                                    ...editingProduct,
                                    costBase: costPerPcs,
                                    tierConfig: {
                                      ...editingProduct.tierConfig,
                                      baseUnit: 'pcs',
                                      costTier3: val,
                                      costTier2: costPerPcs * pcsPerRenceng,
                                    },
                                  });
                                }}
                                prefix="Rp"
                                placeholder="100000"
                                className="bg-white font-bold"
                              />
                            );
                          })()}
                        </div>

                        {/* Live auto-calculation suggestions for HPP */}
                        {(() => {
                          const rencengPerDus = editingProduct.rasioRencengPerDus || 48;
                          const pcsPerRenceng = editingProduct.rasioPcsPerRenceng || 12;
                          const totalPerDus = rencengPerDus * pcsPerRenceng;
                          const boxCost = editingProduct.tierConfig?.costTier3 || (editingProduct.costBase || 0) * totalPerDus || 100000;
                          const costPerRenceng = Math.round(boxCost / rencengPerDus);
                          const costPerPcs = Math.round(boxCost / totalPerDus);

                          return (
                            <>
                              <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">
                                  HPP / Modal per Renceng:
                                </label>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 text-xs">
                                  Rp {costPerRenceng.toLocaleString('id-ID')} / Renceng
                                </div>
                                <span className="text-[10px] text-slate-400">Otomatis dari HPP Dus / {rencengPerDus}</span>
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-slate-500 block mb-1">
                                  HPP / Modal Eceran Pcs:
                                </label>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 text-xs">
                                  Rp {costPerPcs.toLocaleString('id-ID')} / Pcs
                                </div>
                                <span className="text-[10px] text-slate-400">Otomatis dari HPP Dus / {totalPerDus}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Step 3: 3 Distinct Selling Price Inputs (Dus, Renceng, Pcs) */}
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs mb-2 flex items-center justify-between">
                        <span>3 Tingkat Harga Jual (Dus ➔ Renceng ➔ Pcs):</span>
                        <span className="text-[10px] font-normal text-slate-500">
                          Bisa dioverwrite manual sesuai kebijakan margin toko
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. Box Selling Price */}
                        <div>
                          <label className="text-xs font-black text-emerald-800 block mb-1">
                            [1] Harga Jual per Dus:
                          </label>
                          <FormattedNumberInput
                            value={editingProduct.hargaJualDus || editingProduct.tierConfig?.priceTier3 || 120000}
                            onChange={(val) => {
                              setEditingProduct({
                                ...editingProduct,
                                hargaJualDus: val,
                                tierConfig: {
                                  ...editingProduct.tierConfig,
                                  baseUnit: 'pcs',
                                  tier3Name: 'dus',
                                  priceTier3: val,
                                },
                              });
                            }}
                            prefix="Rp"
                            placeholder="120000"
                            className="bg-white font-black text-emerald-900"
                          />
                          <p className="text-[10px] text-emerald-700 font-semibold mt-1">Penjualan grosir karton besar.</p>
                        </div>

                        {/* 2. Strip / Renceng Selling Price */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-black text-amber-800 block">
                              [2] Harga Jual per Renceng:
                            </label>
                            {(() => {
                              const rencengPerDus = editingProduct.rasioRencengPerDus || 48;
                              const boxSelling = editingProduct.hargaJualDus || 120000;
                              const suggested = Math.round((boxSelling / rencengPerDus) * 1.12 / 100) * 100;
                              return (
                                <button
                                  type="button"
                                  onClick={() => setEditingProduct({ ...editingProduct, hargaJualRenceng: suggested })}
                                  className="text-[10px] text-amber-700 underline hover:text-amber-900 font-semibold"
                                  title="Pakai saran harga"
                                >
                                  Saran: Rp {suggested.toLocaleString('id-ID')}
                                </button>
                              );
                            })()}
                          </div>
                          <FormattedNumberInput
                            value={editingProduct.hargaJualRenceng || 2800}
                            onChange={(val) => {
                              setEditingProduct({
                                ...editingProduct,
                                hargaJualRenceng: val,
                                tierConfig: {
                                  ...editingProduct.tierConfig,
                                  baseUnit: 'pcs',
                                  tier2Name: 'renceng',
                                  priceTier2: val,
                                },
                              });
                            }}
                            prefix="Rp"
                            placeholder="2800"
                            className="bg-white font-black text-amber-900"
                          />
                          <p className="text-[10px] text-amber-700 font-semibold mt-1">Penjualan grosir rentengan.</p>
                        </div>

                        {/* 3. Pcs / Retail Selling Price */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-black text-blue-800 block">
                              [3] Harga Jual Eceran per Pcs:
                            </label>
                            {(() => {
                              const rencengPerDus = editingProduct.rasioRencengPerDus || 48;
                              const pcsPerRenceng = editingProduct.rasioPcsPerRenceng || 12;
                              const totalPerDus = rencengPerDus * pcsPerRenceng;
                              const boxSelling = editingProduct.hargaJualDus || 120000;
                              const suggestedPcs = Math.round((boxSelling / totalPerDus) * 1.3 / 50) * 50;
                              return (
                                <button
                                  type="button"
                                  onClick={() => setEditingProduct({ ...editingProduct, hargaJualPcs: suggestedPcs, priceBase: suggestedPcs })}
                                  className="text-[10px] text-blue-700 underline hover:text-blue-900 font-semibold"
                                  title="Pakai saran harga"
                                >
                                  Saran: Rp {suggestedPcs.toLocaleString('id-ID')}
                                </button>
                              );
                            })()}
                          </div>
                          <FormattedNumberInput
                            value={editingProduct.hargaJualPcs || editingProduct.priceBase || 300}
                            onChange={(val) => {
                              setEditingProduct({
                                ...editingProduct,
                                hargaJualPcs: val,
                                priceBase: val,
                              });
                            }}
                            prefix="Rp"
                            placeholder="300"
                            className="bg-white font-black text-blue-900"
                          />
                          <p className="text-[10px] text-blue-700 font-semibold mt-1">Penjualan eceran satuan.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FLOW C & D: PCS / RETAIL OR LITER / LIQUID FORM */}
              {(productType === 'pcs' || productType === 'liter') && (
                <div className="space-y-4">
                  <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-blue-950 flex items-center gap-1.5">
                        {productType === 'liter' ? <Droplets className="w-4 h-4 text-cyan-600" /> : <Package className="w-4 h-4 text-blue-600" />}
                        <span>Parameter Satuan Standar ({productType === 'liter' ? 'Barang Cair' : 'Eceran Unit'}):</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">
                          Satuan Dasar (Base Unit):
                        </label>
                        <select
                          value={editingProduct.baseUnit || (productType === 'liter' ? 'liter' : 'pcs')}
                          onChange={(e) => setEditingProduct({ ...editingProduct, baseUnit: e.target.value as UnitType })}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold uppercase text-slate-900"
                        >
                          {productType === 'liter' ? (
                            <>
                              <option value="liter">Liter</option>
                              <option value="botol">Botol</option>
                              <option value="pouch">Pouch</option>
                            </>
                          ) : (
                            <>
                              <option value="pcs">Pcs</option>
                              <option value="saset">Saset</option>
                              <option value="bungkus">Bungkus</option>
                              <option value="pouch">Pouch</option>
                              <option value="botol">Botol</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Total Stok Masuk:</label>
                        <FormattedNumberInput
                          value={editingProduct.stock}
                          onChange={(val) => setEditingProduct({ ...editingProduct, stock: val })}
                          suffix={editingProduct.baseUnit || 'unit'}
                          placeholder="0"
                          className="bg-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Batas Stok Menipis (Alert):</label>
                        <FormattedNumberInput
                          value={editingProduct.minStockAlert}
                          onChange={(val) => setEditingProduct({ ...editingProduct, minStockAlert: val })}
                          placeholder="10"
                          className="bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Harga Beli Modal (HPP):</label>
                        <FormattedNumberInput
                          value={editingProduct.costBase}
                          onChange={(val) => setEditingProduct({ ...editingProduct, costBase: val })}
                          prefix="Rp"
                          placeholder="0"
                          className="bg-white"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-emerald-800 block mb-1">Harga Jual Eceran:</label>
                        <FormattedNumberInput
                          value={editingProduct.priceBase}
                          onChange={(val) => setEditingProduct({ ...editingProduct, priceBase: val })}
                          prefix="Rp"
                          placeholder="0"
                          className="bg-white font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
