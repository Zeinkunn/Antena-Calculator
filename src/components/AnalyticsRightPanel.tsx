import React, { useState } from 'react';
import {
  AntennaCalculationResult,
  AntennaParams,
  Language,
} from '../types/antenna';
import { PolarPlotCanvas } from './PolarPlotCanvas';
import { SWRChartCanvas } from './SWRChartCanvas';
import {
  Activity,
  Compass,
  Minus,
  Plus,
  RefreshCw,
  Signal,
  Wifi,
} from 'lucide-react';

interface AnalyticsRightPanelProps {
  lang: Language;
  params: AntennaParams;
  calc: AntennaCalculationResult;
  onUpdateParams: (patch: Partial<AntennaParams>) => void;
}

export const AnalyticsRightPanel: React.FC<AnalyticsRightPanelProps> = ({
  lang,
  params,
  calc,
  onUpdateParams,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'polar' | 'vswr' | 'link'>('polar');

  const vswrGood = calc.activeVswr <= 1.5;
  const vswrWarn = calc.activeVswr > 1.5 && calc.activeVswr <= 2.2;
  const txWatts = Math.pow(10, (params.txPowerDbm - 30) / 10);

  // Compute Signal Strength percentage (0% at -110 dBm to 100% at -35 dBm)
  const rssi = calc.linkBudget.rxPowerDbm;
  const signalStrengthPct = Math.max(
    4,
    Math.min(100, Math.round(((rssi + 110) / 75) * 100))
  );
  const activeBars =
    calc.linkBudget.linkQuality === 'excellent'
      ? 5
      : calc.linkBudget.linkQuality === 'good'
      ? 4
      : calc.linkBudget.linkQuality === 'marginal'
      ? 2
      : 1;

  const qualityLabel =
    calc.linkBudget.linkQuality === 'excellent'
      ? lang === 'id'
        ? 'Sinyal Sangat Kuat'
        : 'Excellent Signal'
      : calc.linkBudget.linkQuality === 'good'
      ? lang === 'id'
        ? 'Sinyal Stabil'
        : 'Good Signal'
      : calc.linkBudget.linkQuality === 'marginal'
      ? lang === 'id'
        ? 'Sinyal Lemah'
        : 'Marginal Signal'
      : lang === 'id'
      ? 'Sinyal Putus (Loss)'
      : 'No Link';

  const qualityColor =
    calc.linkBudget.linkQuality === 'excellent'
      ? '#10B981'
      : calc.linkBudget.linkQuality === 'good'
      ? '#00E5FF'
      : calc.linkBudget.linkQuality === 'marginal'
      ? '#FFB300'
      : '#FF3366';

  return (
    <aside className="fixed top-[88px] right-5 z-20 w-[315px] max-w-[calc(100vw-40px)] pointer-events-auto">
      <div className="bg-[#0B101B]/86 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col">
        {/* Clean Single-Line Card Header */}
        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between gap-2">
          <h2 className="font-display font-bold text-sm text-[#F8FAFC] truncate">
            {lang === 'id' ? 'Telemetri & Grafik RF' : 'RF Telemetry & Plots'}
          </h2>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-6 h-6 rounded-md hover:bg-white/10 text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-center transition shrink-0 cursor-pointer"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
        </div>

        {!isMinimized && (
          <div className="p-4 flex flex-col gap-4">
            {/* Flat 4-Metric Readout Strip */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 pb-3.5 border-b border-white/8">
              <div>
                <div className="text-[11px] text-[#94A3B8]">Peak Gain</div>
                <div className="text-base font-bold font-mono-num text-[#00E5FF] mt-0.5">
                  +{calc.gainDbi.toFixed(2)} <span className="text-xs font-normal">dBi</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-[#94A3B8]">Beamwidth (-3dB)</div>
                <div className="text-base font-bold font-mono-num text-[#FFB300] mt-0.5">
                  {calc.hpbwEDeg.toFixed(1)}°{' '}
                  <span className="text-xs font-normal text-[#94A3B8]">
                    × {calc.hpbwHDeg.toFixed(0)}°
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-[#94A3B8]">VSWR</div>
                <div
                  className={`text-base font-bold font-mono-num mt-0.5 ${
                    vswrGood
                      ? 'text-[#10B981]'
                      : vswrWarn
                      ? 'text-[#FFB300]'
                      : 'text-[#FF3366]'
                  }`}
                >
                  {calc.activeVswr.toFixed(2)} : 1
                </div>
              </div>

              <div>
                <div className="text-[11px] text-[#94A3B8]">
                  {lang === 'id' ? 'Impedansi' : 'Impedance'}
                </div>
                <div className="text-base font-bold font-mono-num text-[#F8FAFC] mt-0.5">
                  {calc.impedanceOhms.toFixed(0)}
                  {calc.reactanceOhms >= 0
                    ? `+j${calc.reactanceOhms.toFixed(0)}`
                    : `-j${Math.abs(calc.reactanceOhms).toFixed(0)}`}{' '}
                  <span className="text-xs font-normal text-[#94A3B8]">Ω</span>
                </div>
              </div>
            </div>

            {/* 3-Tab Segmented Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-white/[0.04] p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('polar')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-display font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                  activeTab === 'polar'
                    ? 'bg-[#00E5FF] text-[#080C14]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>Polar</span>
              </button>

              <button
                onClick={() => setActiveTab('vswr')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-display font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                  activeTab === 'vswr'
                    ? 'bg-[#00E5FF] text-[#080C14]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>VSWR</span>
              </button>

              <button
                onClick={() => setActiveTab('link')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-display font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                  activeTab === 'link'
                    ? 'bg-[#00E5FF] text-[#080C14]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Wifi className="w-3 h-3" />
                <span>{lang === 'id' ? 'Jarak' : 'Range'}</span>
              </button>
            </div>

            {/* Active View Directly on Card Surface */}
            {activeTab === 'polar' && (
              <div className="flex flex-col items-center">
                <PolarPlotCanvas lang={lang} params={params} calc={calc} />
              </div>
            )}

            {activeTab === 'vswr' && (
              <div className="flex flex-col gap-3">
                <SWRChartCanvas lang={lang} params={params} calc={calc} />

                <div className="pt-2.5 border-t border-white/8 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#CBD5E1]">
                      {lang === 'id' ? 'Frekuensi Uji (f_uji)' : 'Test Freq (f_op)'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-num font-bold text-[#FFB300]">
                        {params.operatingFreqMHz.toFixed(2)} MHz
                      </span>
                      {Math.abs(params.operatingFreqMHz - params.frequencyMHz) > 0.05 && (
                        <button
                          onClick={() =>
                            onUpdateParams({ operatingFreqMHz: params.frequencyMHz })
                          }
                          className="p-0.5 rounded bg-white/10 text-[#00E5FF] cursor-pointer"
                          title="Reset to f0"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={+(params.frequencyMHz * 0.85).toFixed(2)}
                    max={+(params.frequencyMHz * 1.15).toFixed(2)}
                    step={+(params.frequencyMHz * 0.002).toFixed(3) || 0.1}
                    value={params.operatingFreqMHz}
                    onChange={(e) =>
                      onUpdateParams({
                        operatingFreqMHz: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rf-slider rf-slider-amber"
                  />
                </div>
              </div>
            )}

            {activeTab === 'link' && (
              <div className="flex flex-col gap-3.5">
                {/* SIGNAL STRENGTH METER (RSSI + 5-Bar Indicator + Progress Gauge) */}
                <div className="flex flex-col gap-2 pb-3 border-b border-white/8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Signal className="w-3.5 h-3.5" style={{ color: qualityColor }} />
                      <span className="text-xs font-semibold" style={{ color: qualityColor }}>
                        {qualityLabel}
                      </span>
                    </div>

                    {/* 5 Visual Signal Bars */}
                    <div className="flex items-end gap-1 h-4">
                      {[1, 2, 3, 4, 5].map((bar) => (
                        <span
                          key={bar}
                          className="w-1.5 rounded-sm transition-all"
                          style={{
                            height: `${bar * 20}%`,
                            backgroundColor:
                              bar <= activeBars ? qualityColor : 'rgba(255,255,255,0.12)',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Signal Strength Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${signalStrengthPct}%`,
                        backgroundColor: qualityColor,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono-num">
                    <span className="text-[#94A3B8]">
                      Signal:{' '}
                      <strong className="text-[#F8FAFC]">
                        {calc.linkBudget.rxPowerDbm.toFixed(1)} dBm
                      </strong>{' '}
                      ({signalStrengthPct}%)
                    </span>
                    <span className="text-[#94A3B8]">
                      SNR:{' '}
                      <strong style={{ color: qualityColor }}>
                        {calc.linkBudget.snrMarginDb >= 0 ? '+' : ''}
                        {calc.linkBudget.snrMarginDb.toFixed(1)} dB
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Distance & TX Power Sliders */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#CBD5E1]">
                      {lang === 'id' ? 'Jarak Transmisi' : 'Link Distance'}
                    </span>
                    <span className="font-mono-num font-bold text-[#00E5FF]">
                      {params.linkDistanceKm.toFixed(1)} km
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={150}
                    step={0.2}
                    value={params.linkDistanceKm}
                    onChange={(e) =>
                      onUpdateParams({ linkDistanceKm: parseFloat(e.target.value) })
                    }
                    className="w-full rf-slider"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#CBD5E1]">
                      {lang === 'id' ? 'Daya Pancar (TX)' : 'TX Power'}
                    </span>
                    <span className="font-mono-num font-bold text-[#FFB300]">
                      {params.txPowerDbm} dBm (
                      {txWatts >= 1
                        ? `${txWatts.toFixed(1)} W`
                        : `${(txWatts * 1000).toFixed(0)} mW`}
                      )
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={47}
                    step={1}
                    value={params.txPowerDbm}
                    onChange={(e) =>
                      onUpdateParams({ txPowerDbm: parseInt(e.target.value, 10) })
                    }
                    className="w-full rf-slider rf-slider-amber"
                  />
                </div>

                {/* Link Budget Summary Readouts */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/8 text-xs font-mono-num">
                  <div>
                    <span className="text-[10px] text-[#64748B] block">FSPL Loss</span>
                    <span className="text-[#F8FAFC] font-semibold">
                      -{calc.linkBudget.fsplDb.toFixed(1)}dB
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] block">EIRP</span>
                    <span className="text-[#00E5FF] font-semibold">
                      +{calc.linkBudget.eirpDbm.toFixed(1)}dBm
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] block">Fresnel F₁</span>
                    <span className="text-[#FFB300] font-semibold">
                      {calc.linkBudget.fresnelRadiusMeters.toFixed(1)}m
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
