import React, { useEffect, useRef, useState } from 'react';
import { AntennaParams, AntennaType, Language } from '../types/antenna';
import { ANTENNA_CATALOG, FREQUENCY_PRESETS } from '../data/antennaCatalog';
import { formatCompactLength } from '../engine/antennaCalculator';
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FileSpreadsheet,
  RadioTower,
  Zap,
} from 'lucide-react';

interface HeaderBarProps {
  lang: Language;
  onToggleLang: (lang: Language) => void;
  params: AntennaParams;
  wavelengthMeters: number;
  gainDbi: number;
  cutSheetCount: number;
  isHudHidden: boolean;
  onToggleHudHidden: () => void;
  onOpenCutSheet: () => void;
  onSelectAntennaType: (type: AntennaType) => void;
  onSelectPresetFreq: (freqMHz: number) => void;
}

const ANTENNA_ORDER: AntennaType[] = [
  'yagi',
  'dipole',
  'groundplane',
  'jpole',
  'fiberglass',
  'dish',
  'helical',
  'patch',
  'biquad',
  'horn',
];

export const HeaderBar: React.FC<HeaderBarProps> = ({
  lang,
  onToggleLang,
  params,
  wavelengthMeters,
  gainDbi,
  cutSheetCount,
  isHudHidden,
  onToggleHudHidden,
  onOpenCutSheet,
  onSelectAntennaType,
  onSelectPresetFreq,
}) => {
  const [openMenu, setOpenMenu] = useState<'antenna' | 'preset' | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  const activeAntenna = ANTENNA_CATALOG[params.antennaType];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      ref={barRef}
      className="fixed top-5 left-5 right-5 z-30 pointer-events-none flex items-center justify-between gap-4"
    >
      {/* Left Floating Pill: Clean single surface with hairline dividers (No nested button boxes) */}
      <div className="pointer-events-auto h-12 flex items-center bg-[#0B101B]/86 backdrop-blur-2xl border border-white/10 rounded-2xl px-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.65)] divide-x divide-white/10">
        {/* Brand */}
        <div className="flex items-center gap-2 pr-3.5">
          <RadioTower className="w-4 h-4 text-[#00E5FF] shrink-0" />
          <span className="font-display font-bold text-sm text-[#F8FAFC] tracking-tight">
            RF-VNA 3D
          </span>
        </div>

        {/* 1. ANTENNA TYPE DROPDOWN */}
        <div className="relative px-3.5">
          <button
            onClick={() => setOpenMenu(openMenu === 'antenna' ? null : 'antenna')}
            className="flex items-center gap-2 text-xs font-display font-bold text-[#F8FAFC] hover:text-[#00E5FF] transition cursor-pointer"
          >
            <span className="text-[#00E5FF]">{activeAntenna.shortName[lang]}</span>
            <span className="text-[11px] font-mono-num text-[#10B981]">
              +{gainDbi.toFixed(1)} dBi
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform ${
                openMenu === 'antenna' ? 'rotate-180 text-[#00E5FF]' : ''
              }`}
            />
          </button>

          {openMenu === 'antenna' && (
            <div className="absolute left-0 mt-3.5 w-[320px] sm:w-[460px] rounded-2xl bg-[#0B101B]/95 backdrop-blur-2xl border border-white/12 shadow-[0_24px_60px_rgba(0,0,0,0.85)] p-2 z-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {ANTENNA_ORDER.map((type) => {
                  const item = ANTENNA_CATALOG[type];
                  const isSelected = params.antennaType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        onSelectAntennaType(type);
                        setOpenMenu(null);
                      }}
                      className={`px-3 py-2.5 rounded-xl text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[#00E5FF]/15 text-[#00E5FF]'
                          : 'hover:bg-white/5 text-[#F8FAFC]'
                      }`}
                    >
                      <span className="font-display font-semibold text-xs truncate">
                        {item.shortName[lang]}
                      </span>
                      <span className="text-[10px] font-mono-num text-[#10B981] shrink-0">
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. FREQUENCY PRESET DROPDOWN */}
        <div className="relative pl-3.5">
          <button
            onClick={() => setOpenMenu(openMenu === 'preset' ? null : 'preset')}
            className="flex items-center gap-2 text-xs font-mono-num text-[#F8FAFC] hover:text-[#FFB300] transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[#FFB300] shrink-0" />
            <span className="font-bold">
              {params.frequencyMHz >= 1000
                ? `${(params.frequencyMHz / 1000).toFixed(3)} GHz`
                : `${params.frequencyMHz.toFixed(2)} MHz`}
            </span>
            <span className="text-[11px] text-[#94A3B8] hidden md:inline">
              (λ={formatCompactLength(wavelengthMeters)})
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#94A3B8] transition-transform ${
                openMenu === 'preset' ? 'rotate-180 text-[#FFB300]' : ''
              }`}
            />
          </button>

          {openMenu === 'preset' && (
            <div className="absolute left-0 mt-3.5 w-[290px] rounded-2xl bg-[#0B101B]/95 backdrop-blur-2xl border border-white/12 shadow-[0_24px_60px_rgba(0,0,0,0.85)] p-2 z-50">
              <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                {FREQUENCY_PRESETS.map((preset) => {
                  const isSelected =
                    Math.abs(params.frequencyMHz - preset.freqMHz) < 0.25;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onSelectPresetFreq(preset.freqMHz);
                        setOpenMenu(null);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFB300]/15 text-[#FFB300]'
                          : 'hover:bg-white/5 text-[#F1F5F9]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 font-mono-num text-xs font-bold">
                          <span>{preset.label}</span>
                          <span className="text-[10px] text-[#94A3B8] font-normal">
                            {preset.band}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {preset.usage[lang]}
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#FFB300] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Floating Pill: Clean single surface with hairline dividers */}
      <div className="pointer-events-auto h-12 flex items-center bg-[#0B101B]/86 backdrop-blur-2xl border border-white/10 rounded-2xl px-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.65)] divide-x divide-white/10">
        <button
          onClick={onOpenCutSheet}
          className="pr-3.5 text-xs font-display font-semibold text-[#00E5FF] hover:brightness-125 flex items-center gap-1.5 transition cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {lang === 'id' ? 'Cut Sheet & Rumus' : 'Cut Sheet'}
          </span>
          <span className="text-[10px] font-mono-num opacity-80">({cutSheetCount})</span>
        </button>

        <button
          onClick={onToggleHudHidden}
          className={`px-3.5 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
            isHudHidden ? 'text-[#FFB300]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          {isHudHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">
            {isHudHidden
              ? lang === 'id'
                ? 'Tampilkan Panel'
                : 'Show UI'
              : lang === 'id'
              ? 'Fokus 3D'
              : 'Focus 3D'}
          </span>
        </button>

        <div className="pl-3.5 flex items-center gap-1 font-mono-num text-xs">
          <button
            onClick={() => onToggleLang('id')}
            className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
              lang === 'id' ? 'text-[#00E5FF]' : 'text-[#64748B] hover:text-[#F8FAFC]'
            }`}
          >
            ID
          </button>
          <span className="text-white/20">/</span>
          <button
            onClick={() => onToggleLang('en')}
            className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
              lang === 'en' ? 'text-[#00E5FF]' : 'text-[#64748B] hover:text-[#F8FAFC]'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
};
