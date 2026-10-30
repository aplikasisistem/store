import React, { useState, useEffect } from 'react';
import { Scale, Package, Calculator, Check, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { FormattedNumberInput } from './FormattedNumberInput';
import { formatNumberWithDots } from '../utils/numberFormat';

interface StockConversionCalculatorProps {
  baseUnit: string;
  isWeighable?: boolean;
  currentStock: number;
  onStockCalculated: (totalStock: number, tierConfigUpdates?: {
    tier2Name?: string;
    tier2Ratio?: number;
    tier3Name?: string;
    tier3Ratio?: number;
  }) => void;
  initialTier2Ratio?: number;
  initialTier3Ratio?: number;
}

export const StockConversionCalculator: React.FC<StockConversionCalculatorProps> = ({
  baseUnit,
  isWeighable = false,
  currentStock,
  onStockCalculated,
  initialTier2Ratio = 10,
  initialTier3Ratio = 100,
}) => {
  // Mode: 'weight' (Kg) vs 'tiered' (Dus/Renceng/Pcs)
  const defaultMode = isWeighable || baseUnit === 'kg' ? 'weight' : 'tiered';
  const [mode, setMode] = useState<'weight' | 'tiered'>(defaultMode);

  // --- MODE 1: KG BREAKDOWN STATES ---
  const [packQuarterKg, setPackQuarterKg] = useState<number>(0); // 0.25 kg
  const [packHalfKg, setPackHalfKg] = useState<number>(0);       // 0.50 kg
  const [packOneKg, setPackOneKg] = useState<number>(0);        // 1.0 kg
  const [packFiveKg, setPackFiveKg] = useState<number>(0);       // 5.0 kg
  const [directKg, setDirectKg] = useState<number>(currentStock || 0);

  // Calculate total kg from breakdown pcs
  const calculatedTotalKg = Math.round(
    ((packQuarterKg * 0.25) + (packHalfKg * 0.5) + (packOneKg * 1) + (packFiveKg * 5)) * 1000
  ) / 1000;

  // When breakdown pcs change, update directKg and notify parent
  const applyBreakdownKg = () => {
    setDirectKg(calculatedTotalKg);
    onStockCalculated(calculatedTotalKg);
  };

  // --- MODE 2: DUS / RENCENG / PCS STATES ---
  const [countDus, setCountDus] = useState<number>(0);
  const [ratioDusToRenceng, setRatioDusToRenceng] = useState<number>(initialTier2Ratio > 0 ? Math.round(initialTier3Ratio / initialTier2Ratio) || 10 : 10);
  const [ratioRencengToPcs, setRatioRencengToPcs] = useState<number>(initialTier2Ratio || 10);
  const [countRenceng, setCountRenceng] = useState<number>(0);
  const [countPcs, setCountPcs] = useState<number>(0);

  // Calculate total pcs: (dus * ratioDusToRenceng * ratioRencengToPcs) + (renceng * ratioRencengToPcs) + pcs
  const pcsPerDus = ratioDusToRenceng * ratioRencengToPcs;
  const calculatedTotalPcs = (countDus * pcsPerDus) + (countRenceng * ratioRencengToPcs) + countPcs;

  const applyTieredPcs = () => {
    onStockCalculated(calculatedTotalPcs, {
      tier2Name: 'renceng',
      tier2Ratio: ratioRencengToPcs,
      tier3Name: 'dus',
      tier3Ratio: pcsPerDus,
    });
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3 text-xs">
      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Calculator className="w-4 h-4 text-emerald-600" />
          <span>Kalkulator Konversi Stok Otomatis</span>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setMode('weight')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
              mode === 'weight'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-3 h-3" />
            <span>Berat (Kg)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('tiered')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
              mode === 'tiered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3 h-3" />
            <span>Dus / Renceng / Pcs</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: KONVERSI BERAT (KG <-> PCS KEMASAN ECERAN) --- */}
      {mode === 'weight' && (
        <div className="space-y-3">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Masukkan jumlah kemasan eceran (pcs) untuk menghitung otomatis total Kg, atau ketik langsung total Kg untuk melihat estimasi bungkusnya.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">
                Kemasan 1/4 kg (0.25 kg):
              </label>
              <FormattedNumberInput
                value={packQuarterKg}
                onChange={setPackQuarterKg}
                suffix="pcs"
                placeholder=""
                className="bg-white"
              />
              <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">
                = {(packQuarterKg * 0.25).toLocaleString('id-ID')} kg
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">
                Kemasan 1/2 kg (0.50 kg):
              </label>
              <FormattedNumberInput
                value={packHalfKg}
                onChange={setPackHalfKg}
                suffix="pcs"
                placeholder=""
                className="bg-white"
              />
              <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">
                = {(packHalfKg * 0.5).toLocaleString('id-ID')} kg
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">
                Kemasan 1 kg:
              </label>
              <FormattedNumberInput
                value={packOneKg}
                onChange={setPackOneKg}
                suffix="pcs"
                placeholder=""
                className="bg-white"
              />
              <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">
                = {(packOneKg * 1).toLocaleString('id-ID')} kg
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">
                Kemasan 5 kg:
              </label>
              <FormattedNumberInput
                value={packFiveKg}
                onChange={setPackFiveKg}
                suffix="pcs"
                placeholder=""
                className="bg-white"
              />
              <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">
                = {(packFiveKg * 5).toLocaleString('id-ID')} kg
              </span>
            </div>
          </div>

          {/* Result Calculation Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-emerald-900 block">
                Total Hasil Kalkulasi Berat:
              </span>
              <div className="text-base font-black text-emerald-800">
                {calculatedTotalKg.toLocaleString('id-ID')} Kg
                <span className="text-[11px] font-semibold text-emerald-700 ml-1">
                  ({(calculatedTotalKg * 1000).toLocaleString('id-ID')} Gram)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={applyBreakdownKg}
              disabled={calculatedTotalKg <= 0}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Terapkan ke Stok ({calculatedTotalKg} kg)</span>
            </button>
          </div>

          {/* Reverse Estimations: When Total Kg is set */}
          {currentStock > 0 && (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Estimasi Konversi dari Stok Saat Ini ({currentStock} kg):
              </span>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-700">
                <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                  Setara <strong>{formatNumberWithDots(currentStock * 4)}</strong> pcs 1/4 kg
                </span>
                <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                  Setara <strong>{formatNumberWithDots(currentStock * 2)}</strong> pcs 1/2 kg
                </span>
                <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                  Setara <strong>{formatNumberWithDots(currentStock)}</strong> pcs 1 kg
                </span>
                <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                  Setara <strong>{formatNumberWithDots(currentStock * 1000)}</strong> Gram
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: KONVERSI DUS -> RENCENG -> PCS BERTINGKAT --- */}
      {mode === 'tiered' && (
        <div className="space-y-3">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Masukkan jumlah Dus, Renceng, dan Pcs eceran. Sistem otomatis mengalikan rasio hierarki dan menghitung total Pcs.
          </p>

          {/* Hierarchy Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">
                Jumlah Dus:
              </label>
              <FormattedNumberInput
                value={countDus}
                onChange={setCountDus}
                placeholder=""
                className="bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">
                1 Dus = ... Renceng:
              </label>
              <FormattedNumberInput
                value={ratioDusToRenceng}
                onChange={setRatioDusToRenceng}
                placeholder=""
                className="bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">
                1 Renceng = ... Pcs:
              </label>
              <FormattedNumberInput
                value={ratioRencengToPcs}
                onChange={setRatioRencengToPcs}
                placeholder=""
                className="bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-1">
                Sisa Renceng (Grosir):
              </label>
              <FormattedNumberInput
                value={countRenceng}
                onChange={setCountRenceng}
                placeholder=""
                className="bg-white"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-700 block mb-1">
                Sisa Pcs (Eceran):
              </label>
              <FormattedNumberInput
                value={countPcs}
                onChange={setCountPcs}
                placeholder=""
                className="bg-white"
              />
            </div>
          </div>

          {/* Formula calculation badge */}
          <div className="bg-slate-100 p-2 rounded-xl text-[11px] text-slate-700 font-mono">
            Kalkulasi: ({countDus} Dus x {pcsPerDus} Pcs) + ({countRenceng} Renceng x {ratioRencengToPcs} Pcs) + {countPcs} Pcs
            {' = '}
            <strong className="text-emerald-700">{formatNumberWithDots(calculatedTotalPcs)} Pcs</strong>
          </div>

          {/* Apply Button */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold text-emerald-900 block">
                Total Pcs Dihitung:
              </span>
              <div className="text-base font-black text-emerald-800">
                {formatNumberWithDots(calculatedTotalPcs)} {baseUnit || 'Pcs'}
              </div>
            </div>

            <button
              type="button"
              onClick={applyTieredPcs}
              disabled={calculatedTotalPcs <= 0}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Terapkan ke Stok ({formatNumberWithDots(calculatedTotalPcs)} {baseUnit})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
