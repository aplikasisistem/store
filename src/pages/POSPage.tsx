import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { Product, CartItem, PaymentMethod, RetailPackagingVariant } from '../types';
import { storage } from '../services/storage';
import { sound } from '../services/audio';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { ThermalReceipt } from '../components/ThermalReceipt';
import { 
  Search, 
  Camera, 
  Mic, 
  MicOff, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Scale, 
  CheckCircle, 
  AlertCircle, 
  Percent, 
  ShoppingBag,
  Sparkles,
  ArrowRight,
  UserCheck,
  Calendar,
  Package,
  Command,
  Zap,
  Flame,
  TrendingUp,
  X
} from 'lucide-react';
import { FormattedNumberInput } from '../components/FormattedNumberInput';
import { formatNumberWithDots } from '../utils/numberFormat';

export const POSPage: React.FC = () => {
  const { 
    products, 
    categories, 
    cart, 
    transactions,
    addToCart, 
    updateCartItemQuantity, 
    updateCartItemDiscount, 
    removeFromCart, 
    clearCart,
    cartTotalAmount,
    cartTotalItemsCount,
    checkout
  } = useStore();

  const { currentUser } = useAuth();

  // Sticky Cart Drawer References & Highlight State
  const cartListRef = useRef<HTMLDivElement>(null);
  const cartContainerRef = useRef<HTMLDivElement>(null);
  const [lastAddedCartKey, setLastAddedCartKey] = useState<string | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

  // Quick Add Top-Selling drawer / grid state
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchBarRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);

  // Keyboard navigation highlight index for filtered products
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Multi-tier selected unit per product card before adding to cart
  const [productSelectedUnits, setProductSelectedUnits] = useState<{ [productId: string]: string }>({});
  const [customQuantities, setCustomQuantities] = useState<{ [productId: string]: number }>({});

  // Dynamic ranking of top-selling products based on transaction sales frequency
  const topSellingProducts = useMemo(() => {
    const salesVolumeMap: Record<string, number> = {};
    const salesTxCountMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.items && Array.isArray(tx.items)) {
        tx.items.forEach((item) => {
          salesVolumeMap[item.productId] = (salesVolumeMap[item.productId] || 0) + (item.quantity || 1);
          salesTxCountMap[item.productId] = (salesTxCountMap[item.productId] || 0) + 1;
        });
      }
    });

    // Rank products dynamically
    const ranked = [...products].sort((a, b) => {
      const volA = salesVolumeMap[a.id] || 0;
      const volB = salesVolumeMap[b.id] || 0;
      if (volB !== volA) return volB - volA;

      const txA = salesTxCountMap[a.id] || 0;
      const txB = salesTxCountMap[b.id] || 0;
      if (txB !== txA) return txB - txA;

      // Fallback: priority to available stock and popular items
      return (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0);
    });

    // Return top 8 items
    return ranked.slice(0, 8).map((product, idx) => ({
      product,
      rank: idx + 1,
      totalSold: salesVolumeMap[product.id] || 0,
      txCount: salesTxCountMap[product.id] || 0
    }));
  }, [transactions, products]);

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [latestTransaction, setLatestTransaction] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Packaging Variant & Centralized Stock Modal
  const [selectedVariantProduct, setSelectedVariantProduct] = useState<Product | null>(null);
  const [variantQuantities, setVariantQuantities] = useState<{ [variantId: string]: number }>({});
  const [customWeighableAmount, setCustomWeighableAmount] = useState<number>(0);
  const [variantModalError, setVariantModalError] = useState<string | null>(null);

  // Checkout Form State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [debtNotes, setDebtNotes] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Voice-to-Text Search State (Web Speech API)
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Auto-focus search bar on mount
  useEffect(() => {
    if (searchBarRef.current) {
      searchBarRef.current.focus();
    }
  }, []);

  // Filtered product catalog
  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  // Reset highlighted index when filters change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, selectedCategory]);

  // Global Keyboard Navigation & Shortcuts (Hands-On-Keyboard UX for PC)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Focus search bar shortcut: '/' or 'F2'
      if (e.key === '/' || e.key === 'F2') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchBarRef.current?.focus();
        }
      }

      // 2. Checkout Modal shortcut: 'F9' or 'Ctrl + Enter'
      if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (cart.length > 0 && !isCheckoutModalOpen) {
          handleOpenCheckout();
        }
      }

      // 3. Clear cart / Cancel shortcut: 'F12'
      if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0 && confirm('Batalkan seluruh transaksi dan kosongkan keranjang?')) {
          clearCart();
          showVoiceToast('Keranjang dikosongkan.');
        }
      }

      // 4. Escape handler
      if (e.key === 'Escape') {
        if (isCheckoutModalOpen) {
          setIsCheckoutModalOpen(false);
        } else if (selectedVariantProduct) {
          setSelectedVariantProduct(null);
        } else if (isScannerOpen) {
          setIsScannerOpen(false);
        } else if (searchQuery) {
          setSearchQuery('');
        }
      }

      // 5. Checkout Modal specific shortcuts (F1, F3, F4, F8)
      if (isCheckoutModalOpen) {
        if (e.key === 'F1') {
          e.preventDefault();
          setCashReceived(cartTotalAmount);
          showVoiceToast('Uang pas dipilih (F1)');
        } else if (e.key === 'F3') {
          e.preventDefault();
          setCashReceived(50000);
          showVoiceToast('Tunai Rp 50.000 dipilih (F3)');
        } else if (e.key === 'F4') {
          e.preventDefault();
          setCashReceived(100000);
          showVoiceToast('Tunai Rp 100.000 dipilih (F4)');
        } else if (e.key === 'F8' || e.key === ' ') {
          if (document.activeElement !== cashInputRef.current) {
            e.preventDefault();
            cashInputRef.current?.focus();
          }
        }
      } else {
        // Shortcuts active outside checkout modal
        if (e.key === 'F4' || (e.altKey && e.key.toLowerCase() === 'q')) {
          e.preventDefault();
          setShowQuickAdd((prev) => !prev);
        } else if (e.key === 'F7' || (e.altKey && e.key.toLowerCase() === 'v')) {
          e.preventDefault();
          toggleVoiceRecognition();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart, isCheckoutModalOpen, selectedVariantProduct, isScannerOpen, searchQuery, cartTotalAmount]);

  // Clean raw speech query (removes Indonesian filler words like "cari", "tolong carikan")
  const cleanVoiceQuery = (raw: string): string => {
    let text = raw.trim().toLowerCase();
    text = text.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '').trim();

    const fillers = [
      /^tolong\s+carikan\s+barang\s+/i,
      /^tolong\s+carikan\s+produk\s+/i,
      /^tolong\s+carikan\s+/i,
      /^tolong\s+cari\s+barang\s+/i,
      /^tolong\s+cari\s+produk\s+/i,
      /^tolong\s+cari\s+/i,
      /^carikan\s+barang\s+/i,
      /^carikan\s+produk\s+/i,
      /^carikan\s+/i,
      /^cari\s+barang\s+/i,
      /^cari\s+produk\s+/i,
      /^cari\s+/i,
      /^pencarian\s+/i,
      /^lihat\s+/i,
    ];

    for (const regex of fillers) {
      text = text.replace(regex, '').trim();
    }

    return text;
  };

  // Setup Voice-to-Text Search Web Speech API
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (currentInterim) {
          const cleanInterim = cleanVoiceQuery(currentInterim);
          setInterimTranscript(cleanInterim);
          // Dynamically filter search query in real-time as user speaks
          setSearchQuery(cleanInterim);
        }

        if (finalTranscript) {
          const clean = cleanVoiceQuery(finalTranscript);
          setInterimTranscript('');
          handleVoiceSearchInput(clean);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListeningVoice(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
        setInterimTranscript('');
      };

      speechRecognitionRef.current = recognition;
    }
  }, [products]);

  const toggleVoiceRecognition = () => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Browser Anda belum mendukung input suara Web Speech API. Gunakan Google Chrome atau Microsoft Edge.');
      return;
    }

    if (isListeningVoice) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListeningVoice(false);
      setInterimTranscript('');
      showVoiceToast('Pencarian suara dimatikan.');
    } else {
      try {
        if (!speechRecognitionRef.current) {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'id-ID';
          speechRecognitionRef.current = recognition;
        }
        speechRecognitionRef.current.start();
        setIsListeningVoice(true);
        setInterimTranscript('');
        sound.playVoiceChime();
        showVoiceToast('🎤 Mendengarkan... Ucapkan nama produk (contoh: "Beras Ramos", "Minyak Sunco")');
        if (searchBarRef.current) {
          searchBarRef.current.focus();
        }
      } catch (err) {
        console.warn('Voice start error:', err);
        setIsListeningVoice(false);
      }
    }
  };

  const showVoiceToast = (msg: string) => {
    setVoiceToast(msg);
    setTimeout(() => setVoiceToast(null), 3500);
  };

  /**
   * Processes voice recognition transcript into the search box and filters products
   */
  const handleVoiceSearchInput = (phrase: string) => {
    if (!phrase) return;

    // Handle voice clear commands
    const clearCommands = ['hapus', 'bersihkan', 'batal', 'reset', 'hapus pencarian', 'kosongkan'];
    if (clearCommands.includes(phrase)) {
      setSearchQuery('');
      setInterimTranscript('');
      sound.playVoiceChime();
      showVoiceToast('Pencarian dibersihkan.');
      if (searchBarRef.current) searchBarRef.current.focus();
      return;
    }

    // Number word parsing for quick multi-quantity search (e.g., "dua beras" -> "2*beras")
    const numberMap: { [key: string]: number } = {
      satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
      enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
    };

    let targetQuery = phrase;
    const words = phrase.split(' ');
    if (words.length > 1 && numberMap[words[0]]) {
      const qty = numberMap[words[0]];
      const rest = words.slice(1).join(' ');
      targetQuery = `${qty}*${rest}`;
    }

    // Populate search bar directly with spoken product name
    setSearchQuery(targetQuery);
    setHighlightedIndex(0);
    sound.playScanBeep();

    // Check matches in current inventory
    const queryToCheck = targetQuery.includes('*') ? targetQuery.split('*')[1].trim() : targetQuery;
    const qLower = queryToCheck.toLowerCase();
    const matched = products.filter(
      (p) =>
        p.name.toLowerCase().includes(qLower) ||
        p.code.toLowerCase().includes(qLower) ||
        p.category.toLowerCase().includes(qLower)
    );

    if (matched.length > 0) {
      showVoiceToast(`Suara terdeteksi: "${targetQuery}" (${matched.length} produk ditemukan)`);
    } else {
      sound.playWarningSound();
      showVoiceToast(`Suara: "${targetQuery}" (0 produk cocok, coba sebut nama lain)`);
    }

    if (searchBarRef.current) {
      searchBarRef.current.focus();
    }
  };

  /**
   * Search Bar KeyDown & Quick Quantity Multiplier Handler (e.g. "3*5" or "5*BRG-001")
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(filteredProducts.length - 1, prev + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (e.key === 'Enter') {
      const query = searchQuery.trim();
      if (!query) return;

      let qty = 1;
      let targetQuery = query.toLowerCase();

      // Check Quantity Multiplier pattern (e.g., "3*5" or "5*BRG-001" or "2*Minyak")
      const multiplierMatch = query.match(/^(\d+)\*(.+)$/);
      if (multiplierMatch) {
        qty = parseInt(multiplierMatch[1], 10) || 1;
        targetQuery = multiplierMatch[2].trim().toLowerCase();
      }

      // Find matching product by exact code, id, or name substring
      const matched = products.find(
        (p) => 
          p.code.toLowerCase() === targetQuery || 
          p.id.toLowerCase() === targetQuery || 
          p.name.toLowerCase() === targetQuery ||
          p.name.toLowerCase().includes(targetQuery)
      );

      if (matched) {
        const hasVariants = Boolean(
          (matched.packagingVariants && matched.packagingVariants.length > 0) ||
          (matched.tierConfig && (matched.tierConfig.tier2Name || matched.tierConfig.tier3Name)) ||
          matched.baseUnit === 'kg' || matched.isWeighable || Boolean(matched.hargaJualKg)
        );

        if (hasVariants && !multiplierMatch) {
          handleOpenVariantModal(matched);
        } else {
          const unitToUse = productSelectedUnits[matched.id] || (matched.baseUnit === 'kg' ? '1 KG' : matched.baseUnit);
          handleAddToCart(matched, unitToUse, qty);
        }
        setSearchQuery('');
      } else if (filteredProducts.length === 1) {
        // Fallback to top filtered result if unique
        const topProd = filteredProducts[0];
        const hasVariants = Boolean(
          (topProd.packagingVariants && topProd.packagingVariants.length > 0) ||
          (topProd.tierConfig && (topProd.tierConfig.tier2Name || topProd.tierConfig.tier3Name)) ||
          topProd.baseUnit === 'kg' || topProd.isWeighable || Boolean(topProd.hargaJualKg)
        );

        if (hasVariants) {
          handleOpenVariantModal(topProd);
        } else {
          const unitToUse = productSelectedUnits[topProd.id] || (topProd.baseUnit === 'kg' ? '1 KG' : topProd.baseUnit);
          handleAddToCart(topProd, unitToUse, qty);
        }
        setSearchQuery('');
      } else if (filteredProducts.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
        // Add highlighted product
        const highProd = filteredProducts[highlightedIndex];
        const hasVariants = Boolean(
          (highProd.packagingVariants && highProd.packagingVariants.length > 0) ||
          (highProd.tierConfig && (highProd.tierConfig.tier2Name || highProd.tierConfig.tier3Name)) ||
          highProd.baseUnit === 'kg' || highProd.isWeighable || Boolean(highProd.hargaJualKg)
        );

        if (hasVariants) {
          handleOpenVariantModal(highProd);
        } else {
          const unitToUse = productSelectedUnits[highProd.id] || (highProd.baseUnit === 'kg' ? '1 KG' : highProd.baseUnit);
          handleAddToCart(highProd, unitToUse, qty);
        }
        setSearchQuery('');
      } else {
        sound.playWarningSound();
        showVoiceToast(`Barang dengan kata kunci "${query}" tidak ditemukan.`);
      }
    }
  };

  const handleBarcodeScanned = (code: string) => {
    const cleanCode = code.trim().toLowerCase();
    const matched = products.find(
      (p) => p.code.toLowerCase() === cleanCode || p.name.toLowerCase().includes(cleanCode)
    );

    if (matched) {
      const hasVariants = Boolean(
        (matched.packagingVariants && matched.packagingVariants.length > 0) ||
        (matched.tierConfig && (matched.tierConfig.tier2Name || matched.tierConfig.tier3Name)) ||
        matched.baseUnit === 'kg' || matched.isWeighable || Boolean(matched.hargaJualKg)
      );

      if (hasVariants) {
        handleOpenVariantModal(matched);
      } else {
        handleAddToCart(matched, matched.baseUnit, 1, undefined, {
          toastPrefix: 'Barcode ditemukan'
        });
      }
    } else {
      sound.playWarningSound();
      showVoiceToast(`Barcode "${code}" tidak terdaftar dalam stok produk.`);
    }
  };

  // Open Packaging Variant Selection Modal
  const handleOpenVariantModal = (product: Product) => {
    setSelectedVariantProduct(product);
    setVariantQuantities({});
    setCustomWeighableAmount(0);
    setVariantModalError(null);
  };

  // Seamless Add To Cart Trigger: highlights item in sticky cart drawer without window scroll
  const handleAddToCart = (
    product: Product, 
    selectedUnit?: string, 
    quantity: number = 1,
    variantId?: string,
    options?: { silent?: boolean; toastPrefix?: string }
  ): boolean => {
    const unitToUse = selectedUnit || product.baseUnit;
    const res = addToCart(product, unitToUse, quantity, variantId);

    if (res && res.success === false) {
      sound.playWarningSound();
      showVoiceToast(res.message || `Gagal menambahkan ${product.name}`);
      return false;
    }

    const itemKey = `${product.id}-${unitToUse}-${variantId || ''}`;
    setLastAddedCartKey(itemKey);

    // Smooth scroll inside cart container only (zero page jump/scroll)
    if (cartListRef.current) {
      cartListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setTimeout(() => {
      setLastAddedCartKey((current) => (current === itemKey ? null : current));
    }, 1800);

    if (!options?.silent) {
      sound.playScanBeep();
      showVoiceToast(
        options?.toastPrefix 
          ? `${options.toastPrefix}: ${product.name} (+${quantity} ${unitToUse})` 
          : `Ditambahkan: ${product.name} (+${quantity} ${unitToUse})`
      );
    }
    return true;
  };

  const handleAddVariantsToCart = () => {
    if (!selectedVariantProduct) return;

    const inCartBase = cart
      .filter((i) => i.productId === selectedVariantProduct.id)
      .reduce((sum, i) => sum + i.baseQuantity, 0);

    const remainingMasterStock = Math.max(0, Math.round((selectedVariantProduct.stock - inCartBase) * 10000) / 10000);

    let totalNewBase = 0;
    if (selectedVariantProduct.packagingVariants) {
      selectedVariantProduct.packagingVariants.forEach((v) => {
        const qty = variantQuantities[v.id] || 0;
        if (qty > 0) {
          totalNewBase += qty * v.ratioToBase;
        }
      });
    }
    if (customWeighableAmount > 0) {
      totalNewBase += customWeighableAmount;
    }

    totalNewBase = Math.round(totalNewBase * 10000) / 10000;

    if (totalNewBase <= 0) {
      setVariantModalError('Pilih setidaknya 1 varian kemasan atau masukkan berat timbangan.');
      return;
    }

    if (totalNewBase > remainingMasterStock + 0.0001) {
      sound.playWarningSound();
      setVariantModalError(
        `Stok Master tidak mencukupi! Sisa stok master: ${remainingMasterStock} ${selectedVariantProduct.baseUnit}.`
      );
      return;
    }

    let addedCount = 0;
    if (selectedVariantProduct.packagingVariants) {
      selectedVariantProduct.packagingVariants.forEach((v) => {
        const qty = variantQuantities[v.id] || 0;
        if (qty > 0) {
          handleAddToCart(selectedVariantProduct, v.name, qty, v.id, { silent: true });
          addedCount += qty;
        }
      });
    }

    if (customWeighableAmount > 0) {
      handleAddToCart(selectedVariantProduct, selectedVariantProduct.baseUnit, customWeighableAmount, undefined, { silent: true });
      addedCount += 1;
    }

    sound.playScanBeep();
    showVoiceToast(`Berhasil menambahkan ${addedCount} kemasan!`);
    setSelectedVariantProduct(null);
    setVariantQuantities({});
    setCustomWeighableAmount(0);
    setVariantModalError(null);
  };

  // Switch cart item weight package directly in cashier cart
  const handleChangeCartItemPackage = (item: CartItem, targetPackage: string) => {
    const parentProd = products.find((p) => p.id === item.productId);
    if (!parentProd) return;
    removeFromCart(item.productId, item.selectedUnit, item.variantId);
    const unitToUse = targetPackage === 'Custom' ? 'kg' : targetPackage;
    const qtyToUse = targetPackage === 'Custom' ? (item.quantity > 1 ? item.baseQuantity : 0.5) : 1;
    handleAddToCart(parentProd, unitToUse, qtyToUse, undefined, { silent: true });
    sound.playVoiceChime();
    showVoiceToast(`Paket diubah ke: ${targetPackage}`);
  };

  // Quick Add: 1-Click addition for dynamic top-selling items
  const handleQuickAdd = (product: Product, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Check stock
    const inCartBase = cart
      .filter((i) => i.productId === product.id)
      .reduce((sum, i) => sum + i.baseQuantity, 0);

    const remainingStock = Math.round((product.stock - inCartBase) * 1000) / 1000;
    if (remainingStock <= 0) {
      sound.playWarningSound();
      showVoiceToast(`Stok ${product.name} telah habis di toko!`);
      return;
    }

    const isWeighted = product.baseUnit === 'kg' || product.isWeighable || Boolean(product.hargaJualKg);
    const unitToUse = productSelectedUnits[product.id] || (isWeighted ? '1 KG' : product.baseUnit);
    const qty = 1;

    handleAddToCart(product, unitToUse, qty, undefined, {
      toastPrefix: '⚡ Quick Add'
    });
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCashReceived(cartTotalAmount);
    setCheckoutError(null);
    setIsCheckoutModalOpen(true);
  };

  const handleProcessCheckout = async () => {
    if (!currentUser) return;
    setCheckoutError(null);

    const res = await checkout({
      paymentMethod,
      cashReceived: paymentMethod === 'tunai' ? cashReceived : 0,
      customerName: paymentMethod === 'utang' ? customerName : undefined,
      customerPhone: paymentMethod === 'utang' ? customerPhone : undefined,
      dueDate: paymentMethod === 'utang' ? dueDate : undefined,
      debtNotes: paymentMethod === 'utang' ? debtNotes : undefined,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
    });

    if (res.success && res.transaction) {
      setIsCheckoutModalOpen(false);
      setLatestTransaction(res.transaction);
      setIsReceiptOpen(true);
      setCustomerName('');
      setCustomerPhone('');
      setDebtNotes('');
      sound.playSuccessChime();
    } else {
      setCheckoutError(res.error || 'Terjadi kesalahan saat memproses transaksi.');
      sound.playWarningSound();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 pb-24 lg:pb-6">
      {/* Toast Alert for Voice / Scan / Shortcuts */}
      {voiceToast && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-4 border border-slate-700">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{voiceToast}</span>
        </div>
      )}

      {/* Main Grid: Catalog on Left, Cart Drawer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: SEARCH BAR, FILTERS & PRODUCT GRID */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* Top Control Bar with Keyboard Shortcut Hints */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap sm:flex-nowrap items-center gap-2">
            
            {/* Search Input with Auto-Focus, Voice-to-Text Button, and Multiplier Support */}
            <div className="relative flex-1 min-w-[200px]">
              {isListeningVoice ? (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-500 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  <Mic className="w-4 h-4 text-red-600" />
                </div>
              ) : (
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              )}

              <input
                ref={searchBarRef}
                type="text"
                placeholder={
                  isListeningVoice
                    ? '🎤 Mendengarkan suara Anda... (contoh: "Beras Ramos", "Minyak Sunco")'
                    : 'Cari barang / SKU (Contoh: 3*Minyak atau tekan F7 untuk bicara)...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className={`w-full ${
                  isListeningVoice ? 'pl-11' : 'pl-9'
                } pr-28 py-2 border rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden transition ${
                  isListeningVoice
                    ? 'bg-red-50/30 border-red-400 ring-2 ring-red-400/70 text-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:bg-white'
                }`}
              />

              {/* Right Controls inside search input: Clear + Voice Search Button + Shortcut Badge */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setInterimTranscript('');
                      if (searchBarRef.current) searchBarRef.current.focus();
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
                    title="Hapus pencarian (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Inline Microphone Voice Search Trigger */}
                <button
                  type="button"
                  onClick={toggleVoiceRecognition}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    isListeningVoice
                      ? 'bg-red-500 text-white animate-pulse shadow-xs ring-2 ring-red-300'
                      : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-200/80'
                  }`}
                  title={isListeningVoice ? 'Hentikan pencarian suara (F7)' : 'Cari barang dengan suara (F7)'}
                >
                  {isListeningVoice ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span className="text-[10px] font-bold hidden md:inline">
                    {isListeningVoice ? 'Mendengarkan' : 'Suara'}
                  </span>
                </button>

                <span className="text-[10px] font-mono bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded hidden sm:inline">
                  F2 / F7
                </span>
              </div>
            </div>

            {/* Camera Barcode Scanner Button */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95 shrink-0"
              title="Buka Kamera Barcode Scanner"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Scan</span>
            </button>

            {/* Voice Search Toolbar Button */}
            <button
              onClick={toggleVoiceRecognition}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 shrink-0 ${
                isListeningVoice
                  ? 'bg-red-500 text-white animate-pulse shadow-md ring-2 ring-red-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
              title="Cari Produk dengan Suara (F7)"
            >
              {isListeningVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-600" />}
              <span className="hidden sm:inline">{isListeningVoice ? 'Mendengarkan...' : 'Cari Suara (F7)'}</span>
              <span className="sm:hidden">{isListeningVoice ? 'Stop' : 'Voice'}</span>
            </button>

            {/* Quick Add Top-Selling Toggle Button */}
            <button
              type="button"
              onClick={() => setShowQuickAdd((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 shrink-0 ${
                showQuickAdd
                  ? 'bg-amber-500 text-white shadow-xs shadow-amber-200'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
              }`}
              title="Toggle Panel Quick Add / Item Terlaris (F4)"
            >
              <Zap className={`w-4 h-4 ${showQuickAdd ? 'text-white fill-white' : 'text-amber-600 fill-amber-500'}`} />
              <span className="font-extrabold hidden sm:inline">Quick Add</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-black ${
                showQuickAdd ? 'bg-amber-600 text-white' : 'bg-amber-200/90 text-amber-900'
              }`}>
                {topSellingProducts.length}
              </span>
            </button>
          </div>

          {/* Dedicated Live Voice-to-Text Listening Banner */}
          {isListeningVoice && (
            <div className="bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 border border-red-200/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  VOICE SEARCH
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <span className="text-slate-500 font-medium">Mendengarkan suara:</span>
                  <span className="font-black text-slate-900 bg-white/95 px-2.5 py-1 rounded-lg border border-red-200 text-xs shadow-2xs">
                    {interimTranscript || searchQuery || 'Ucapkan nama sembako (contoh: "Beras Ramos", "Minyak Sunco")...'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setInterimTranscript('');
                      if (searchBarRef.current) searchBarRef.current.focus();
                    }}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                  >
                    Hapus Teks
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleVoiceRecognition}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black rounded-lg transition flex items-center gap-1 shadow-xs active:scale-95"
                >
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Selesai Bicara</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Keyboard Shortcut Bar Info */}
          <div className="bg-emerald-50/60 border border-emerald-200 px-3 py-2 rounded-xl flex items-center justify-between text-[11px] text-emerald-900 font-medium">
            <div className="flex items-center gap-2">
              <Command className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span><strong>Pintasan Kasir:</strong> <code className="bg-white px-1 rounded">3*Minyak</code> (Multi-qty) | <code className="bg-white px-1 rounded">F2 / /</code> (Fokus Cari) | <code className="bg-white px-1 rounded">F7</code> (Cari Suara) | <code className="bg-white px-1 rounded">F4</code> (Quick Add) | <code className="bg-white px-1 rounded">F9</code> (Bayar) | <code className="bg-white px-1 rounded">F12</code> (Batal)</span>
            </div>
          </div>

          {/* DYNAMIC QUICK ADD GRID: TOP SELLING ITEMS */}
          {showQuickAdd && (
            <div className="bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-amber-50/60 border border-amber-200/90 rounded-2xl p-3 shadow-xs transition-all animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-amber-200/70">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Zap className="w-3.5 h-3.5 fill-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                        Quick Add — Item Paling Sering Terjual
                      </h3>
                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Flame className="w-3 h-3 text-red-500 fill-red-500" />
                        1-Klik Masuk Keranjang
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-800/80 font-medium">
                      Otomatis diranking berdasarkan riwayat penjualan riil kasir
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(false)}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-950 px-2 py-0.5 hover:bg-amber-200/60 rounded-lg transition"
                    title="Tutup panel Quick Add (F4)"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Dynamic Grid: Responsive 2-col to 4-col */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {topSellingProducts.map(({ product, rank, totalSold }) => {
                  const isOutOfStock = product.stock <= 0;
                  const isWeighted = product.baseUnit === 'kg' || product.isWeighable || Boolean(product.hargaJualKg);
                  const displayUnit = isWeighted ? '1 KG' : product.baseUnit;
                  const displayPrice = isWeighted
                    ? (product.hargaJualKg || product.priceBase)
                    : (product.hargaJualPcs || product.priceBase);

                  return (
                    <div
                      key={product.id}
                      onClick={(e) => {
                        if (!isOutOfStock) {
                          handleQuickAdd(product, e);
                        }
                      }}
                      className={`text-left p-2.5 rounded-xl border transition flex flex-col justify-between group relative select-none cursor-pointer ${
                        isOutOfStock
                          ? 'bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed'
                          : 'bg-white hover:bg-amber-500/5 hover:border-amber-400 border-amber-200/80 shadow-xs hover:shadow-md active:scale-97'
                      }`}
                      title={isOutOfStock ? `${product.name} (Stok Habis)` : `Klik untuk tambah 1 ${displayUnit} ${product.name}`}
                    >
                      {/* Top Row: Rank & Sold Badge */}
                      <div className="flex items-center justify-between gap-1 w-full mb-1">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                          rank === 1
                            ? 'bg-red-500 text-white shadow-xs'
                            : rank === 2
                            ? 'bg-amber-500 text-white'
                            : rank === 3
                            ? 'bg-orange-400 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          <Flame className="w-2.5 h-2.5 fill-current" />
                          #{rank}
                        </span>

                        {totalSold > 0 ? (
                          <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded">
                            {totalSold} {product.baseUnit} terjual
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-500">
                            Stok {product.stock}
                          </span>
                        )}
                      </div>

                      {/* Product Name & Category */}
                      <div className="min-h-[2rem]">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-950 leading-snug line-clamp-2">
                          {product.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {product.category}
                        </span>
                      </div>

                      {/* Price & Single-click Quick Button */}
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between w-full">
                        <div>
                          <span className="text-xs font-black text-emerald-700 group-hover:text-emerald-800">
                            Rp {displayPrice.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-medium">
                            /{displayUnit}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => handleQuickAdd(product, e)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition ${
                            isOutOfStock
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs active:scale-95'
                          }`}
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>1-Klik</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sembako Category Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua Sembako ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Catalog Grid with Arrow Key Highlight */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product, index) => {
              const isWeightedProduct = product.baseUnit === 'kg' || product.isWeighable || Boolean(product.hargaJualKg);
              const availableUnits = storage.getAvailableUnitsForProduct(product);
              const defaultUnit = isWeightedProduct ? '1 KG' : product.baseUnit;
              const activeUnit = productSelectedUnits[product.id] || defaultUnit;
              const matchedUnitConfig = availableUnits.find(
                (u) => u.unit.toLowerCase().replace(/\s+/g, '') === activeUnit.toLowerCase().replace(/\s+/g, '')
              ) || availableUnits[0];

              const isLowStock = product.stock <= product.minStockAlert && product.stock > 0;
              const isOutOfStock = product.stock <= 0;
              const customQty = customQuantities[product.id] ?? 0.5;
              const isHighlighted = index === highlightedIndex;

              return (
                <div
                  key={product.id}
                  onClick={() => setHighlightedIndex(index)}
                  className={`bg-white rounded-2xl border p-3 flex flex-col justify-between shadow-xs hover:shadow-md transition relative overflow-hidden cursor-pointer ${
                    isHighlighted ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-md bg-emerald-50/10' : ''
                  } ${
                    isOutOfStock
                      ? 'border-red-200 bg-red-50/20'
                      : isLowStock
                      ? 'border-amber-200'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Stock Status Badge */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {product.code}
                    </span>
                    {isOutOfStock ? (
                      <span className="text-[10px] font-extrabold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        Habis
                      </span>
                    ) : isLowStock ? (
                      <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Sisa {product.stock} {product.baseUnit}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Stok {product.stock} {product.baseUnit}
                      </span>
                    )}
                  </div>

                  {/* Product Name & Category */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight line-clamp-2 min-h-[2rem]">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {product.category}
                    </p>
                  </div>

                  {/* DEDICATED WEIGHTED ITEM SELECTOR: [ 1 KG | 500g | 250g | 100g | Custom ] */}
                  {isWeightedProduct ? (
                    <div className="my-2 space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                          <span>Paket Berat:</span>
                          <span className="text-emerald-800 uppercase font-black">{activeUnit}</span>
                        </div>

                        {/* 5 Package Selector Buttons */}
                        <div className="grid grid-cols-5 gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                          {['1 KG', '500g', '250g', '100g', 'Custom'].map((pkg) => {
                            const isSelected = 
                              (activeUnit.toLowerCase() === pkg.toLowerCase()) || 
                              (pkg === 'Custom' && (activeUnit.toLowerCase() === 'custom' || activeUnit.toLowerCase() === 'kg'));
                            return (
                              <button
                                key={pkg}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProductSelectedUnits((prev) => ({
                                    ...prev,
                                    [product.id]: pkg === 'Custom' ? 'kg' : pkg,
                                  }));
                                }}
                                className={`py-1 px-0.5 rounded text-[10px] font-black transition text-center ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {pkg}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Displayed Price / Custom Weight Input */}
                      {(activeUnit.toLowerCase() === 'custom' || activeUnit.toLowerCase() === 'kg') ? (
                        <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-200 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-emerald-950">Berat Timbangan:</span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              @ Rp {(product.hargaJualKg || product.priceBase).toLocaleString('id-ID')}/kg
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.05"
                              min="0.05"
                              value={customQty}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setCustomQuantities((prev) => ({ ...prev, [product.id]: val }));
                              }}
                              placeholder="0.5"
                              className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-bold text-center"
                            />
                            <span className="font-bold text-slate-700 text-xs">kg</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-200">
                            <span className="text-slate-600 font-medium">Subtotal:</span>
                            <span className="font-black text-emerald-800">
                              Rp {Math.round(((product.hargaJualKg || product.priceBase) * customQty)).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-between pt-0.5">
                          <span className="text-xs text-slate-500 font-medium">Harga:</span>
                          <div className="text-right">
                            <span className="text-sm font-black text-emerald-700">
                              Rp {matchedUnitConfig.price.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              / {matchedUnitConfig.unit}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Add To Cart Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const isCustom = activeUnit.toLowerCase() === 'custom' || activeUnit.toLowerCase() === 'kg';
                          const qtyToAdd = isCustom ? customQty : 1;
                          const unitToAdd = isCustom ? 'kg' : activeUnit;
                          handleAddToCart(product, unitToAdd, qtyToAdd);
                        }}
                        disabled={isOutOfStock}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 ${
                          isOutOfStock
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Keranjang ({activeUnit.toLowerCase() === 'custom' || activeUnit.toLowerCase() === 'kg' ? `${customQty} kg` : activeUnit})</span>
                      </button>
                    </div>
                  ) : product.packagingVariants && product.packagingVariants.length > 0 ? (
                    <div className="my-2.5 space-y-2">
                      <div className="text-[11px] font-bold text-amber-900 bg-amber-50/80 p-2 rounded-xl border border-amber-200">
                        <div className="flex items-center justify-between text-amber-800 mb-1 text-[10px]">
                          <span className="flex items-center gap-1 font-extrabold">
                            <Package className="w-3 h-3 text-amber-600" />
                            {product.packagingVariants.length} Varian Kemasan
                          </span>
                          <span className="text-emerald-700 font-black">
                            Mulai Rp {Math.min(...product.packagingVariants.map((v) => v.sellingPrice)).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenVariantModal(product);
                        }}
                        disabled={isOutOfStock}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs ${
                          isOutOfStock
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Pilih Kemasan Eceran</span>
                      </button>
                    </div>
                  ) : (
                    <div className="my-2 space-y-2">
                      {/* Interactive Unit Selector [ Dus | Renceng | Pcs ] */}
                      {availableUnits.length > 1 ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                            <span>Pilih Satuan Jual:</span>
                            <span className="text-emerald-800 uppercase font-black">{activeUnit}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100/90 rounded-lg border border-slate-200">
                            {availableUnits.map((u) => {
                              const isSelected = activeUnit.toLowerCase() === u.unit.toLowerCase();
                              return (
                                <button
                                  key={u.unit}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProductSelectedUnits((prev) => ({
                                      ...prev,
                                      [product.id]: u.unit,
                                    }));
                                  }}
                                  className={`py-1 px-1 rounded-md text-[10px] font-black transition capitalize text-center ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:bg-slate-200'
                                  }`}
                                  title={`${u.label}`}
                                >
                                  {u.unit}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-semibold">Satuan:</span>
                          <span className="text-xs font-bold text-slate-800 uppercase">{activeUnit}</span>
                        </div>
                      )}

                      {/* Displayed Price for Active Unit */}
                      <div className="flex items-baseline justify-between pt-0.5">
                        <span className="text-xs text-slate-500 font-medium">Harga:</span>
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-700">
                            Rp {matchedUnitConfig.price.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            / {matchedUnitConfig.unit} {matchedUnitConfig.ratio > 1 ? `(${matchedUnitConfig.ratio} pcs)` : ''}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product, activeUnit, 1);
                        }}
                        disabled={isOutOfStock}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 ${
                          isOutOfStock
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Keranjang ({activeUnit})</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700 text-sm">Barang tidak ditemukan</h4>
              <p className="text-xs text-slate-500 mt-1">
                Coba gunakan kata kunci lain atau periksa kategori sembako.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CASHIER SHOPPING CART SIDEBAR (Sticky Drawer) */}
        <div className="lg:col-span-5 xl:col-span-4 self-start sticky top-4">
          <div 
            ref={cartContainerRef}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-md shadow-slate-200/50 p-4 sticky top-4 flex flex-col h-[calc(100vh-6.5rem)] max-h-[calc(100vh-6.5rem)] overscroll-contain transition-all duration-200 z-10"
          >
            
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200/80">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  </div>
                  {cartTotalItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-white">
                      {cartTotalItemsCount}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm leading-tight">Keranjang Belanja</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Sticky POS Drawer
                    </span>
                    <span className="text-[10px] text-slate-400">&bull; F9 Bayar</span>
                  </div>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded-lg transition"
                  title="Kosongkan Keranjang (F12)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Batal (F12)</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div 
              ref={cartListRef} 
              className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 overscroll-contain scroll-smooth"
            >
              {cart.map((item, idx) => {
                const parentProd = products.find((p) => p.id === item.productId);
                const isItemWeighted = item.isWeighable || parentProd?.baseUnit === 'kg' || Boolean(parentProd?.hargaJualKg);
                const isCustomKg = item.selectedUnit.toLowerCase() === 'kg' || item.selectedUnit.toLowerCase() === 'custom';
                const itemKey = `${item.productId}-${item.selectedUnit}-${item.variantId || ''}`;
                const isJustAdded = lastAddedCartKey === itemKey;

                return (
                  <div
                    key={`${item.productId}-${item.selectedUnit}-${idx}`}
                    className={`p-2.5 rounded-xl border text-xs space-y-2 transition-all duration-300 ${
                      isJustAdded
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-400/50 scale-[1.01]'
                        : 'bg-slate-50 hover:bg-slate-100/60 border-slate-200/80'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="font-bold text-slate-900 line-clamp-1">{item.productName}</div>
                          {isJustAdded && (
                            <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded shrink-0 animate-in fade-in zoom-in duration-200">
                              Baru Masuk
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">Rp {item.unitPrice.toLocaleString('id-ID')} / {item.selectedUnit}</span>
                          {isItemWeighted ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold border border-emerald-300">
                              Potong {item.baseQuantity} kg Stok Master
                            </span>
                          ) : item.unitMultiplier > 1 ? (
                            <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                              Potong {item.baseQuantity} Pcs
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId, item.selectedUnit, item.variantId)}
                        className="text-slate-400 hover:text-red-600 p-1 transition shrink-0"
                        title="Hapus barang (Backspace)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Selling Weight Package Selector In Cart: [ 1 KG | 500g | 250g | 100g | Custom ] */}
                    {isItemWeighted && (
                      <div className="pt-1.5 border-t border-slate-200/70">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1">
                          <span>Ubah Paket Berat:</span>
                          <span className="text-emerald-800 font-black">{item.selectedUnit}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 p-0.5 bg-white rounded-lg border border-slate-200">
                          {['1 KG', '500g', '250g', '100g', 'Custom'].map((pkg) => {
                            const isSelected = 
                              (item.selectedUnit.toLowerCase() === pkg.toLowerCase()) || 
                              (pkg === 'Custom' && isCustomKg);
                            return (
                              <button
                                key={pkg}
                                type="button"
                                onClick={() => handleChangeCartItemPackage(item, pkg)}
                                className={`py-0.5 px-0.5 rounded text-[10px] font-black transition text-center ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                                title={`Ubah paket ke ${pkg}`}
                              >
                                {pkg}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quantity & Subtotal Controls */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            updateCartItemQuantity(
                              item.productId,
                              item.selectedUnit,
                              isCustomKg ? Math.max(0.05, Math.round((item.quantity - 0.25) * 100) / 100) : item.quantity - 1,
                              item.variantId
                            )
                          }
                          className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center font-bold hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <input
                          type="number"
                          step={isCustomKg ? '0.05' : '1'}
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartItemQuantity(
                              item.productId,
                              item.selectedUnit,
                              parseFloat(e.target.value) || 0,
                              item.variantId
                            )
                          }
                          className="w-14 text-center font-bold bg-white border border-slate-300 rounded-md py-0.5 text-xs"
                        />

                        <button
                          onClick={() =>
                            updateCartItemQuantity(
                              item.productId,
                              item.selectedUnit,
                              isCustomKg ? Math.round((item.quantity + 0.25) * 100) / 100 : item.quantity + 1,
                              item.variantId
                            )
                          }
                          className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center font-bold hover:bg-slate-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-[10px] text-slate-500 font-medium">
                          {isCustomKg ? 'kg' : 'bks'}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-slate-900 text-xs">
                          Rp {item.subtotal.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Keranjang Masih Kosong</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Klik <strong>1-Klik Quick Add</strong> atau tombol <strong>+ Keranjang</strong> pada barang.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                    <Command className="w-3 h-3" />
                    <span>Ketik / untuk cari cepat</span>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Summary & Sticky Checkout Button */}
            <div className="pt-3 border-t border-slate-200 space-y-2 shrink-0 bg-white">
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Total Item Belanja:</span>
                <span className="font-bold text-slate-900">{cartTotalItemsCount} unit</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-slate-700">TOTAL BELANJA:</span>
                <span className="text-lg font-black text-emerald-700">
                  Rp {cartTotalAmount.toLocaleString('id-ID')}
                </span>
              </div>

              <button
                onClick={handleOpenCheckout}
                disabled={cart.length === 0}
                className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95 ${
                  cart.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                <span>Proses Pembayaran (F9)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY FLOATING CART BAR (lg:hidden) */}
      {cart.length > 0 && !isCheckoutModalOpen && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-slate-900 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between border border-slate-800 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="absolute -top-1 -right-1 bg-white text-emerald-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {cartTotalItemsCount}
              </span>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Belanja</div>
              <div className="text-sm font-black text-emerald-400">
                Rp {cartTotalAmount.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1"
            >
              <span>Lihat ({cart.length})</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCheckout}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-1 shadow-md"
            >
              <span>Bayar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MOBILE FULL CART DRAWER OVERLAY (lg:hidden) */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col p-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-sm">Keranjang Belanja ({cartTotalItemsCount})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {cart.map((item, idx) => {
                const parentProd = products.find((p) => p.id === item.productId);
                const isItemWeighted = item.isWeighable || parentProd?.baseUnit === 'kg' || Boolean(parentProd?.hargaJualKg);
                const isCustomKg = item.selectedUnit.toLowerCase() === 'kg' || item.selectedUnit.toLowerCase() === 'custom';

                return (
                  <div
                    key={`mobile-${item.productId}-${item.selectedUnit}-${idx}`}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-xs space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 line-clamp-1">{item.productName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Rp {item.unitPrice.toLocaleString('id-ID')} / {item.selectedUnit}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId, item.selectedUnit, item.variantId)}
                        className="text-slate-400 hover:text-red-600 p-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            updateCartItemQuantity(
                              item.productId,
                              item.selectedUnit,
                              isCustomKg ? Math.max(0.05, Math.round((item.quantity - 0.25) * 100) / 100) : item.quantity - 1,
                              item.variantId
                            )
                          }
                          className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-12 text-center font-bold text-xs">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateCartItemQuantity(
                              item.productId,
                              item.selectedUnit,
                              isCustomKg ? Math.round((item.quantity + 0.25) * 100) / 100 : item.quantity + 1,
                              item.variantId
                            )
                          }
                          className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] text-slate-500">{item.selectedUnit}</span>
                      </div>
                      <div className="font-black text-slate-900 text-xs">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-2 shrink-0">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-slate-700">TOTAL BELANJA:</span>
                <span className="text-lg font-black text-emerald-700">
                  Rp {cartTotalAmount.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileCartOpen(false);
                    handleOpenCheckout();
                  }}
                  className="flex-2 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>Proses Pembayaran (F9)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL WITH KEYBOARD SHORTCUTS (F1, F3, F4, F8, Enter) */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">Pembayaran Transaksi</h3>
                <p className="text-xs text-slate-400">Total: Rp {cartTotalAmount.toLocaleString('id-ID')}</p>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              
              {checkoutError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Metode Pembayaran:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('tunai')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                      paymentMethod === 'tunai'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>TUNAI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('utang')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                      paymentMethod === 'utang'
                        ? 'border-amber-600 bg-amber-50 text-amber-800'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>UTANG / BON</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'tunai' && (
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 flex justify-between items-center mb-1">
                      <span>Uang Tunai Diterima (F8):</span>
                      <span className="text-[10px] text-slate-400">Tekan Enter untuk konfirmasi</span>
                    </label>
                    <input
                      ref={cashInputRef}
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (cashReceived >= cartTotalAmount) {
                            handleProcessCheckout();
                          }
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-base font-black focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      placeholder="0"
                    />
                  </div>

                  {/* Quick Cash Buttons with Shortcuts (F1, F3, F4) */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCashReceived(cartTotalAmount)}
                      className="py-1.5 px-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold"
                    >
                      Uang Pas (F1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived(20000)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      Rp 20.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived(50000)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      Rp 50.000 (F3)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived(100000)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      Rp 100.000 (F4)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived(200000)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      Rp 200.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived(500000)}
                      className="py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      Rp 500.000
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-600">KEMBALIAN:</span>
                    <span
                      className={`text-base font-black ${
                        cashReceived >= cartTotalAmount ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {cashReceived >= cartTotalAmount
                        ? `Rp ${(cashReceived - cartTotalAmount).toLocaleString('id-ID')}`
                        : `Kurang Rp ${(cartTotalAmount - cashReceived).toLocaleString('id-ID')}`}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'utang' && (
                <div className="space-y-3 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                  <div>
                    <label className="text-xs font-bold text-amber-900 block mb-1">
                      Nama Pelanggan (Wajib):
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Contoh: Bu Siti"
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-900 block mb-1">
                      Jatuh Tempo:
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
              >
                Batal (Esc)
              </button>
              <button
                type="button"
                onClick={handleProcessCheckout}
                disabled={paymentMethod === 'tunai' && cashReceived < cartTotalAmount}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Konfirmasi Bayar (Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Packaging Variant Selection Modal */}
      {selectedVariantProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">{selectedVariantProduct.name}</h3>
                <p className="text-xs text-slate-400">Pilih Varian Kemasan / Eceran</p>
              </div>
              <button onClick={() => setSelectedVariantProduct(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {variantModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
                  {variantModalError}
                </div>
              )}

              <div className="space-y-2">
                {selectedVariantProduct.packagingVariants?.map((v) => {
                  const qty = variantQuantities[v.id] || 0;
                  return (
                    <div key={v.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{v.name}</div>
                        <div className="text-xs text-emerald-700 font-semibold">
                          Rp {v.sellingPrice.toLocaleString('id-ID')} &bull; Rasio: {v.ratioToBase} {selectedVariantProduct.baseUnit}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const cur = variantQuantities[v.id] || 0;
                            setVariantQuantities({ ...variantQuantities, [v.id]: Math.max(0, cur - 1) });
                          }}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold flex items-center justify-center"
                        >-</button>
                        <span className="w-8 text-center font-bold text-sm">{qty}</span>
                        <button
                          onClick={() => {
                            const cur = variantQuantities[v.id] || 0;
                            setVariantQuantities({ ...variantQuantities, [v.id]: cur + 1 });
                          }}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold flex items-center justify-center"
                        >+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setSelectedVariantProduct(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Batal (Esc)
              </button>
              <button
                onClick={handleAddVariantsToCart}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-md"
              >
                Masukkan ke Keranjang (Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleBarcodeScanned}
        />
      )}

      {/* Thermal Receipt Print Modal */}
      {isReceiptOpen && latestTransaction && (
        <ThermalReceipt
          transaction={latestTransaction}
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}
    </div>
  );
};
