import { Product, CartItem } from '../types';

/**
 * Computes the contents/ratio description for a product variant.
 * Examples:
 * - 1 Dus (40 Pcs) -> "1 DUS" or "Isi 1 Dus"
 * - 2 Dus (80 Pcs) -> "2 DUS" or "Isi 2 Dus"
 * - Renceng (10 Pcs) -> "10 PCS" or "Isi 10 Pcs"
 * - 1/4 kg -> "250g"
 */
export function getVariantContentDescription(
  product: Product,
  variant: { name: string; ratioToBase?: number; ratio?: number },
  options?: { verbose?: boolean; style?: 'short' | 'isi' }
): string {
  const ratio = Number(variant.ratioToBase ?? variant.ratio ?? 1);
  const rawName = (variant.name || '').toUpperCase().trim();
  const useIsi = options?.style === 'isi';

  // If the variant name already has explicit parenthesis with content, extract it
  const existingParenMatch = rawName.match(/\(([^)]+)\)/);
  if (existingParenMatch && (existingParenMatch[1].includes('DUS') || existingParenMatch[1].includes('PCS') || existingParenMatch[1].includes('KG') || existingParenMatch[1].includes('GRAM'))) {
    return existingParenMatch[1].trim();
  }

  // Box / Dus products
  const rencengPerDus = product.rasioRencengPerDus || 0;
  const pcsPerRenceng = product.rasioPcsPerRenceng || 0;
  const directPcsPerDus = product.tierConfig?.tier3Ratio || product.rasioPcsPerDus || 0;
  const totalPerDus = rencengPerDus > 0 && pcsPerRenceng > 0 ? (rencengPerDus * pcsPerRenceng) : directPcsPerDus;

  if (rawName === 'DUS' || rawName.includes('DUS') || rawName.includes('BOX')) {
    if (totalPerDus > 0) {
      const dusCount = Math.round((ratio / totalPerDus) * 100) / 100;
      if (dusCount > 0) {
        const formattedDus = dusCount % 1 === 0 ? dusCount.toString() : dusCount.toLocaleString('id-ID');
        if (options?.verbose) {
          return `Isi ${formattedDus} Dus (${ratio} Pcs)`;
        }
        if (useIsi) {
          return `Isi ${formattedDus} Dus`;
        }
        return `${formattedDus} DUS`;
      }
    }
    if (ratio > 1) {
      return options?.verbose ? `Isi ${ratio} Pcs` : useIsi ? `Isi ${ratio} Pcs` : `${ratio} PCS`;
    }
    return options?.verbose ? 'Isi 1 Dus' : useIsi ? 'Isi 1 Dus' : '1 DUS';
  }

  if (rawName === 'RENCENG' || rawName.includes('RENCENG') || rawName.includes('RENTENG')) {
    if (pcsPerRenceng > 0) {
      const rencengCount = Math.round((ratio / pcsPerRenceng) * 10) / 10;
      if (rencengCount === 1) {
        return options?.verbose ? `Isi 1 Renceng (${pcsPerRenceng} Pcs)` : useIsi ? `Isi ${pcsPerRenceng} Pcs` : `${pcsPerRenceng} PCS`;
      } else if (rencengCount > 1) {
        return options?.verbose ? `Isi ${rencengCount} Renceng (${ratio} Pcs)` : useIsi ? `Isi ${rencengCount} Renceng` : `${rencengCount} RENCENG (${ratio} PCS)`;
      }
    }
    if (ratio > 1) {
      return options?.verbose ? `Isi ${ratio} Pcs` : useIsi ? `Isi ${ratio} Pcs` : `${ratio} PCS`;
    }
    return options?.verbose ? 'Isi 1 Renceng' : useIsi ? 'Isi 1 Renceng' : '1 RENCENG';
  }

  if (rawName === 'PCS') {
    if (ratio > 1) {
      return options?.verbose ? `Isi ${ratio} Pcs` : useIsi ? `Isi ${ratio} Pcs` : `${ratio} PCS`;
    }
    return ''; // Standard 1 PCS needs no extra suffix
  }

  // Pack 6, Pack 12, Pack 24, Bal, etc.
  if (rawName.startsWith('PACK') || rawName.includes('PACK') || rawName === 'BAL' || rawName.includes('BAL')) {
    if (ratio > 1) {
      return options?.verbose ? `Isi ${ratio} Pcs` : useIsi ? `Isi ${ratio} Pcs` : `${ratio} PCS`;
    }
    return '';
  }

  // Weighable (KG / Gram) products
  if (product.baseUnit === 'kg' || product.isWeighable || Boolean(product.hargaJualKg)) {
    if (Math.abs(ratio - 1.0) < 0.001) return '1 KG';
    if (Math.abs(ratio - 0.5) < 0.001) return '500g (1/2 kg)';
    if (Math.abs(ratio - 0.25) < 0.001) return '250g (1/4 kg)';
    if (Math.abs(ratio - 0.1) < 0.001) return '100g (1 Ons)';
    const grams = Math.round(ratio * 1000);
    return `${grams} Gram`;
  }

  // General fallback
  if (ratio > 1) {
    return options?.verbose ? `Isi ${ratio} ${product.baseUnit}` : useIsi ? `Isi ${ratio} ${product.baseUnit}` : `${ratio} ${product.baseUnit.toUpperCase()}`;
  }

  return '';
}

/**
 * Formats full integrated variant display name:
 * e.g.:
 * - "DUS" (ratio 40, totalPerDus 40, style='short') -> "DUS (1 DUS)"
 * - "DUS" (ratio 80, totalPerDus 40, style='short') -> "DUS (2 DUS)"
 * - "DUS" (ratio 80, totalPerDus 40, style='isi')   -> "DUS (Isi 2 Dus)"
 * - "RENCENG" (ratio 10, style='short')            -> "RENCENG (10 PCS)"
 * - "PCS" (ratio 1)                                -> "PCS"
 */
export function formatVariantDisplayName(
  product: Product,
  variant: { name: string; ratioToBase?: number; ratio?: number },
  options?: { style?: 'short' | 'isi' }
): string {
  const rawName = (variant.name || '').trim();
  const upper = rawName.toUpperCase();

  // If already contains parenthesis with ratio info, return as is
  if (rawName.includes('(') && rawName.includes(')')) {
    return rawName;
  }

  // PCS with ratio 1 stays pure "PCS"
  const ratio = Number(variant.ratioToBase ?? variant.ratio ?? 1);
  if (upper === 'PCS' && ratio === 1) {
    return 'PCS';
  }

  const content = getVariantContentDescription(product, variant, options);
  if (!content) {
    return rawName;
  }

  return `${rawName} (${content})`;
}

/**
 * Detailed description for modal listing (e.g. "Isi 2 Dus = 80 Pcs" or "Isi 10 Pcs")
 */
export function getVariantDetailSubtext(
  product: Product,
  variant: { name: string; ratioToBase?: number; ratio?: number }
): string {
  const ratio = Number(variant.ratioToBase ?? variant.ratio ?? 1);
  const rawName = (variant.name || '').toUpperCase().trim();

  const rencengPerDus = product.rasioRencengPerDus || 0;
  const pcsPerRenceng = product.rasioPcsPerRenceng || 0;
  const directPcsPerDus = product.tierConfig?.tier3Ratio || product.rasioPcsPerDus || 0;
  const totalPerDus = rencengPerDus > 0 && pcsPerRenceng > 0 ? (rencengPerDus * pcsPerRenceng) : directPcsPerDus;

  if (rawName === 'DUS' || rawName.includes('DUS') || rawName.includes('BOX')) {
    if (totalPerDus > 0) {
      const dusCount = Math.round((ratio / totalPerDus) * 100) / 100;
      const formattedDus = dusCount % 1 === 0 ? dusCount.toString() : dusCount.toLocaleString('id-ID');
      return `Isi ${formattedDus} Dus (${ratio} Pcs Stok Master)`;
    }
    return `Isi ${ratio} Pcs`;
  }

  if (rawName === 'RENCENG' || rawName.includes('RENCENG') || rawName.includes('RENTENG')) {
    if (pcsPerRenceng > 0) {
      const rencengCount = Math.round((ratio / pcsPerRenceng) * 10) / 10;
      return `Isi ${rencengCount} Renceng (${ratio} Pcs Stok Master)`;
    }
    return `Isi ${ratio} Pcs`;
  }

  if (rawName === 'PCS') {
    return ratio > 1 ? `Isi ${ratio} Pcs Eceran` : 'Satuan Eceran (1 Pcs)';
  }

  if (ratio > 1) {
    return `Isi ${ratio} ${product.baseUnit}`;
  }

  return `1 ${variant.name}`;
}

/**
 * Formats Cart Item title with full variant details:
 * e.g. "PANDIR DUS - DUS (Isi 2 Dus)"
 */
export function formatCartItemTitle(item: CartItem, product?: Product): string {
  const prodName = item.productName || 'Produk';
  const vName = (item.variantName || item.selectedUnit || '').trim();

  // If plain PCS without variantId, just return product name
  if (!item.variantId && (vName.toLowerCase() === 'pcs' || item.unitMultiplier === 1 && !vName.toLowerCase().includes('dus'))) {
    return prodName;
  }

  // If item already contains " - DUS (Isi 2 DUS)", return as is
  if (prodName.includes(' - ') && prodName.includes('(')) {
    return prodName;
  }

  // If product is available, compute integrated variant label
  if (product) {
    const formattedV = formatVariantDisplayName(product, { name: vName, ratioToBase: item.unitMultiplier }, { style: 'isi' });
    return `${prodName} - ${formattedV}`;
  }

  // Fallback from CartItem properties
  if (vName.includes('(')) {
    return `${prodName} - ${vName}`;
  }

  const mult = item.unitMultiplier || 1;
  const upperUnit = vName.toUpperCase();

  if (upperUnit === 'DUS' || upperUnit.includes('DUS')) {
    return `${prodName} - ${vName} (Isi ${mult > 1 ? mult : 1} Pcs)`;
  }

  if (upperUnit === 'RENCENG' || upperUnit.includes('RENCENG')) {
    return `${prodName} - ${vName} (Isi ${mult} Pcs)`;
  }

  if (mult > 1) {
    return `${prodName} - ${vName} (Isi ${mult} Pcs)`;
  }

  return `${prodName} - ${vName}`;
}
