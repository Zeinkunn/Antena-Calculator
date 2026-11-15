import React, { useState } from 'react';
import {
  AntennaCalculationResult,
  AntennaParams,
  Language,
} from '../types/antenna';
import { ANTENNA_CATALOG } from '../data/antennaCatalog';
import { formatLength } from '../engine/antennaCalculator';
import {
  BookOpen,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Sigma,
  X,
} from 'lucide-react';

interface CutSheetDrawerProps {
  lang: Language;
  params: AntennaParams;
  calc: AntennaCalculationResult;
  isOpen: boolean;
  onClose: () => void;
}

export const CutSheetDrawer: React.FC<CutSheetDrawerProps> = ({
  lang,
  params,
  calc,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'cutsheet' | 'theory' | 'formulas'>('cutsheet');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const catalog = ANTENNA_CATALOG[params.antennaType];

  const handleCopyCutSheet = () => {
    const header = `${catalog.name[lang]} @ ${params.frequencyMHz} MHz (λ = ${(
      calc.wavelengthMeters * 100
    ).toFixed(2)} cm)\nGain: +${calc.gainDbi.toFixed(2)} dBi | HPBW: ${calc.hpbwEDeg.toFixed(
      1
    )}° | Impedance: ${calc.impedanceOhms.toFixed(1)} Ω\n----------------------------------------\n`;
    const rows = calc.cutSheet
      .map(
        (item) =>
          `${item.symbol.padEnd(8)} | ${item.name[lang].padEnd(36)} | ${(
            item.valueMeters * 1000
          ).toFixed(1)} mm (${(item.valueMeters * 100).toFixed(2)} cm) | ${
            item.lambdaFraction
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(header + rows);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    const headers = [
      'Symbol',
      'Component',
      'Length_mm',
      'Length_cm',
      'Length_m',
      'Lambda_Fraction',
      'Boom_Position_mm',
      'Notes',
    ];
    const csvRows = [
      headers.join(','),
      ...calc.cutSheet.map((item) =>
        [
          `"${item.symbol}"`,
          `"${item.name[lang]}"`,
          (item.valueMeters * 1000).toFixed(2),
          (item.valueMeters * 100).toFixed(3),
          item.valueMeters.toFixed(4),
          `"${item.lambdaFraction}"`,
          item.positionMeters !== undefined ? (item.positionMeters * 1000).toFixed(1) : '""',
          `"${item.notes[lang]}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `antenna-cutsheet-${params.antennaType}-${params.frequencyMHz}MHz.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[82vh] bg-[#0B101B]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_28px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono-num text-[#00E5FF] uppercase tracking-wider">
              {catalog.name[lang]} • {params.frequencyMHz} MHz (λ ={' '}
              {(calc.wavelengthMeters * 100).toFixed(2)} cm)
            </div>
            <h3 className="font-display font-bold text-base text-[#F8FAFC] mt-0.5">
              {lang === 'id'
                ? 'Cetak Biru Ukuran Potong (Cut Sheet) & Referensi Rekayasa RF'
                : 'Precision Fabrication Cut Sheet & RF Engineering Reference'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCutSheet}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#CBD5E1] flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-[#10B981]">
                    {lang === 'id' ? 'Tersalin!' : 'Copied!'}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>{lang === 'id' ? 'Salin Ukuran' : 'Copy Spec'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#CBD5E1] flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#FFB300]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-[#FF3366]/20 hover:text-[#FF3366] text-[#94A3B8] transition cursor-pointer"
              title="Close (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Tab Bar */}
        <div className="px-5 py-2.5 bg-[#0F1623] border-b border-white/10 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('cutsheet')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'cutsheet'
                ? 'bg-[#00E5FF] text-[#080C14]'
                : 'bg-white/5 text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>
              {lang === 'id'
                ? `Tabel Ukuran Potong (${calc.cutSheet.length} Bagian)`
                : `Dimension Cut Sheet (${calc.cutSheet.length} Parts)`}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('theory')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'theory'
                ? 'bg-[#10B981] text-[#080C14]'
                : 'bg-white/5 text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>
              {lang === 'id'
                ? 'Prinsip Kerja & Aplikasi'
                : 'Physics & Applications'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'formulas'
                ? 'bg-[#FFB300] text-[#080C14]'
                : 'bg-white/5 text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Sigma className="w-3.5 h-3.5" />
            <span>
              {lang === 'id' ? 'Rumus & Persamaan RF' : 'RF Engineering Equations'}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'cutsheet' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[#94A3B8] font-mono-num text-[11px] uppercase">
                    <th className="py-2.5 px-3">{lang === 'id' ? 'Elemen' : 'Element'}</th>
                    <th className="py-2.5 px-3">
                      {lang === 'id' ? 'Panjang (mm)' : 'Length (mm)'}
                    </th>
                    {params.antennaType === 'yagi' && (
                      <>
                        <th className="py-2.5 px-3">
                          {lang === 'id' ? 'Spasi dari Prev. (mm)' : 'Spacing from Prev. (mm)'}
                        </th>
                        <th className="py-2.5 px-3">
                          {lang === 'id' ? 'Posisi Kumulatif (mm)' : 'Cumulative Pos (mm)'}
                        </th>
                      </>
                    )}
                    <th className="py-2.5 px-3">
                      {lang === 'id' ? 'Rasio λ' : 'λ Fraction'}
                    </th>
                    <th className="py-2.5 px-3">
                      {lang === 'id'
                        ? 'Catatan Konstruksi'
                        : 'Fabrication Notes'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {calc.cutSheet.map((row) => (
                    <tr key={row.key} className="hover:bg-white/[0.03] transition">
                      <td className="py-2.5 px-3 font-medium text-[#F8FAFC] flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-mono-num font-bold shrink-0"
                          style={{
                            backgroundColor: `${row.highlightColor || '#00E5FF'}18`,
                            color: row.highlightColor || '#00E5FF',
                            border: `1px solid ${row.highlightColor || '#00E5FF'}40`,
                          }}
                        >
                          {row.symbol}
                        </span>
                        <span>{row.name[lang]}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono-num font-bold text-[#00E5FF]">
                        {(row.valueMeters * 1000).toFixed(1)} mm{' '}
                        <span className="text-[10px] text-[#64748B] font-normal">
                          ({formatLength(row.valueMeters)})
                        </span>
                      </td>
                      {params.antennaType === 'yagi' && (
                        <>
                          <td className="py-2.5 px-3 font-mono-num font-bold text-[#FFB300]">
                            {row.spacingFromPrevMeters !== undefined ? (
                              <>
                                {(row.spacingFromPrevMeters * 1000).toFixed(1)} mm{' '}
                                <span className="text-[10px] text-[#94A3B8] font-normal">
                                  ({row.spacingLambdaFraction})
                                </span>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono-num font-bold text-[#F8FAFC]">
                            {row.positionMeters !== undefined
                              ? `${(row.positionMeters * 1000).toFixed(1)} mm`
                              : '—'}
                          </td>
                        </>
                      )}
                      <td className="py-2.5 px-3 font-mono-num text-[#10B981]">
                        {row.lambdaFraction}
                      </td>
                      <td className="py-2.5 px-3 text-[#94A3B8]">{row.notes[lang]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'theory' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-[#111927] border border-white/8 rounded-xl p-4">
                <h4 className="font-display font-bold text-[#00E5FF] uppercase text-xs mb-2">
                  {lang === 'id'
                    ? 'Cara Kerja Fisika Elektromagnetik'
                    : 'Electromagnetic Operating Principle'}
                </h4>
                <p className="text-[#CBD5E1] leading-relaxed">
                  {catalog.howItWorks[lang]}
                </p>
              </div>

              <div className="bg-[#111927] border border-white/8 rounded-xl p-4">
                <h4 className="font-display font-bold text-[#10B981] uppercase text-xs mb-2">
                  {lang === 'id'
                    ? 'Keunggulan & Aplikasi Utama'
                    : 'Key Advantages & Use Cases'}
                </h4>
                <ul className="space-y-1.5 text-[#CBD5E1] list-disc list-inside">
                  {catalog.applications.map((app, i) => (
                    <li key={i}>{app[lang]}</li>
                  ))}
                  {catalog.pros.map((pro, i) => (
                    <li key={`p-${i}`} className="text-[#10B981]">
                      {pro[lang]}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#111927] border border-white/8 rounded-xl p-4">
                <h4 className="font-display font-bold text-[#FFB300] uppercase text-xs mb-2">
                  {lang === 'id'
                    ? 'Batasan Teknis & Hal Penting Perakitan'
                    : 'Engineering Trade-offs & Tuning Notes'}
                </h4>
                <ul className="space-y-1.5 text-[#CBD5E1] list-disc list-inside">
                  {catalog.cons.map((con, i) => (
                    <li key={i}>{con[lang]}</li>
                  ))}
                  <li className="text-[#94A3B8]">
                    {lang === 'id'
                      ? `Pola Pancaran: ${calc.patternType.id}`
                      : `Radiation Pattern: ${calc.patternType.en}`}
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'formulas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calc.formulas.map((f, idx) => (
                <div
                  key={idx}
                  className="bg-[#111927] border border-white/8 rounded-xl p-4 space-y-2"
                >
                  <div className="text-xs font-display font-bold text-[#FFB300]">
                    {f.title[lang]}
                  </div>
                  <div className="bg-[#080C14] border border-white/10 rounded-lg px-3 py-2 font-mono-num text-xs text-[#00E5FF]">
                    {f.equation}
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {f.explanation[lang]}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
