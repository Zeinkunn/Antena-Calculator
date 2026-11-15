import React, { useState } from 'react';
import {
  AntennaCalculationResult,
  AntennaParams,
  Language,
  VisualSimulationConfig,
} from '../types/antenna';
import { ANTENNA_CATALOG } from '../data/antennaCatalog';
import { formatCompactLength } from '../engine/antennaCalculator';
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  RefreshCw,
  Sliders,
  Waves,
} from 'lucide-react';

interface CalculatorControlPanelProps {
  lang: Language;
  params: AntennaParams;
  calc: AntennaCalculationResult;
  visConfig: VisualSimulationConfig;
  onUpdateParams: (patch: Partial<AntennaParams>) => void;
  onUpdateVisConfig: (patch: Partial<VisualSimulationConfig>) => void;
  onTriggerBurst: () => void;
  onOpenCutSheet: () => void;
}

export const CalculatorControlPanel: React.FC<CalculatorControlPanelProps> = ({
  lang,
  params,
  calc,
  visConfig,
  onUpdateParams,
  onUpdateVisConfig,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'params' | 'visual'>('params');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const catalogItem = ANTENNA_CATALOG[params.antennaType];

  const handleDesignFreqChange = (newFreq: number) => {
    const clamped = Math.max(20, Math.min(12000, newFreq));
    onUpdateParams({
      frequencyMHz: clamped,
      operatingFreqMHz: clamped,
    });
  };

  return (
    <aside className="fixed top-[88px] left-5 z-20 w-[310px] max-w-[calc(100vw-40px)] pointer-events-auto">
      <div className="bg-[#0B101B]/86 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col">
        {/* Clean Single-Line Card Header (No Eyebrow Label) */}
        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between gap-2">
          <h2 className="font-display font-bold text-sm text-[#F8FAFC] truncate">
            {catalogItem.shortName[lang]}
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
            {/* Minimal Tab Switcher */}
            <div className="grid grid-cols-2 gap-1 bg-white/[0.04] p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('params')}
                className={`py-1.5 px-2 rounded-lg text-xs font-display font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'params'
                    ? 'bg-[#00E5FF] text-[#080C14]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{lang === 'id' ? 'Parameter' : 'Parameters'}</span>
              </button>
              <button
                onClick={() => setActiveTab('visual')}
                className={`py-1.5 px-2 rounded-lg text-xs font-display font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'visual'
                    ? 'bg-[#00E5FF] text-[#080C14]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Waves className="w-3.5 h-3.5" />
                <span>{lang === 'id' ? 'Visual 3D' : '3D Visuals'}</span>
              </button>
            </div>

            {activeTab === 'params' ? (
              <div className="flex flex-col gap-4">
                {/* 1. Primary Frequency Slider (Directly on card surface, no nested card) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[#CBD5E1]">
                      {lang === 'id' ? 'Frekuensi (f₀)' : 'Frequency (f₀)'}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={20}
                        max={12000}
                        step={0.1}
                        value={params.frequencyMHz}
                        onChange={(e) =>
                          handleDesignFreqChange(parseFloat(e.target.value) || 144)
                        }
                        className="w-20 bg-white/[0.05] border border-white/10 focus:border-[#00E5FF] rounded-md px-2 py-0.5 text-right font-mono-num text-xs text-[#00E5FF] font-bold outline-none"
                      />
                      <span className="text-[11px] font-mono-num text-[#94A3B8]">MHz</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={6000}
                    step={1}
                    value={Math.min(6000, params.frequencyMHz)}
                    onChange={(e) => handleDesignFreqChange(parseFloat(e.target.value))}
                    className="w-full rf-slider"
                  />
                  <div className="flex justify-between text-[10px] font-mono-num text-[#64748B]">
                    <span>λ = {formatCompactLength(calc.wavelengthMeters)}</span>
                    <span>λ/2 = {formatCompactLength(calc.halfWaveMeters)}</span>
                  </div>
                </div>

                {/* 2. Antenna-Specific Geometry Sliders (Directly on card surface) */}
                {params.antennaType === 'yagi' && (
                  <div className="flex flex-col gap-3.5 pt-3.5 border-t border-white/8">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#CBD5E1]">
                          {lang === 'id' ? 'Jumlah Elemen' : 'Elements'}
                        </span>
                        <span className="font-mono-num font-bold text-[#00E5FF]">
                          {params.yagiElementCount} ({params.yagiElementCount - 2} Dir)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={3}
                        max={14}
                        step={1}
                        value={params.yagiElementCount}
                        onChange={(e) =>
                          onUpdateParams({
                            yagiElementCount: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full rf-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#CBD5E1]">
                          {lang === 'id' ? 'Spasi Progresif (DL6WU)' : 'Progressive Spacing'}
                        </span>
                        <span className="font-mono-num font-bold text-[#10B981]">
                          {(0.18 * (params.yagiDirectorSpacingLambda / 0.2)).toFixed(3)}λ →{' '}
                          {(
                            Math.min(
                              0.34,
                              0.195 + 0.015 * Math.max(0, params.yagiElementCount - 3)
                            ) *
                            (params.yagiDirectorSpacingLambda / 0.2)
                          ).toFixed(3)}
                          λ
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.15}
                        max={0.28}
                        step={0.005}
                        value={params.yagiDirectorSpacingLambda}
                        onChange={(e) =>
                          onUpdateParams({
                            yagiDirectorSpacingLambda: parseFloat(e.target.value),
                          })
                        }
                        className="w-full rf-slider"
                      />
                    </div>
                  </div>
                )}

                {params.antennaType === 'groundplane' && (
                  <div className="flex flex-col gap-2 pt-3.5 border-t border-white/8">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#CBD5E1]">
                        {lang === 'id' ? 'Sudut Radial' : 'Radial Angle'}
                      </span>
                      <span className="font-mono-num font-bold text-[#00E5FF]">
                        {params.gpRadialAngleDeg}° ({calc.impedanceOhms.toFixed(0)} Ω)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={65}
                      step={1}
                      value={params.gpRadialAngleDeg}
                      onChange={(e) =>
                        onUpdateParams({
                          gpRadialAngleDeg: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full rf-slider"
                    />
                  </div>
                )}

                {params.antennaType === 'dish' && (
                  <div className="flex flex-col gap-3.5 pt-3.5 border-t border-white/8">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#CBD5E1]">
                          {lang === 'id' ? 'Diameter Dish' : 'Dish Diameter'}
                        </span>
                        <span className="font-mono-num font-bold text-[#00E5FF]">
                          {params.dishDiameterLambda.toFixed(1)} λ (
                          {formatCompactLength(
                            params.dishDiameterLambda * calc.wavelengthMeters
                          )}
                          )
                        </span>
                      </div>
                      <input
                        type="range"
                        min={2.0}
                        max={30.0}
                        step={0.5}
                        value={params.dishDiameterLambda}
                        onChange={(e) =>
                          onUpdateParams({
                            dishDiameterLambda: parseFloat(e.target.value),
                          })
                        }
                        className="w-full rf-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#CBD5E1]">
                          {lang === 'id' ? 'Rasio Fokus (f/D)' : 'Focal Ratio (f/D)'}
                        </span>
                        <span className="font-mono-num font-bold text-[#FFB300]">
                          {params.dishFdRatio.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.28}
                        max={0.65}
                        step={0.01}
                        value={params.dishFdRatio}
                        onChange={(e) =>
                          onUpdateParams({ dishFdRatio: parseFloat(e.target.value) })
                        }
                        className="w-full rf-slider rf-slider-amber"
                      />
                    </div>
                  </div>
                )}

                {params.antennaType === 'helical' && (
                  <div className="flex flex-col gap-3.5 pt-3.5 border-t border-white/8">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#CBD5E1]">
                          {lang === 'id' ? 'Jumlah Lilitan' : 'Helix Turns'}
                        </span>
                        <span className="font-mono-num font-bold text-[#00E5FF]">
                          {params.helicalTurns}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={3}
                        max={18}
                        step={1}
                        value={params.helicalTurns}
                        onChange={(e) =>
                          onUpdateParams({
                            helicalTurns: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full rf-slider"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#CBD5E1]">
                        {lang === 'id' ? 'Arah Putaran' : 'Handedness'}
                      </span>
                      <div className="flex gap-1">
                        {(['RHCP', 'LHCP'] as const).map((hand) => (
                          <button
                            key={hand}
                            onClick={() =>
                              onUpdateParams({ helicalHandedness: hand })
                            }
                            className={`px-2.5 py-0.5 rounded-md text-xs font-mono-num font-bold transition cursor-pointer ${
                              params.helicalHandedness === hand
                                ? 'bg-[#00E5FF] text-[#080C14]'
                                : 'bg-white/5 text-[#94A3B8]'
                            }`}
                          >
                            {hand}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {params.antennaType === 'patch' && (
                  <div className="flex flex-col gap-3.5 pt-3.5 border-t border-white/8">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#CBD5E1]">
                          {lang === 'id' ? 'Konstanta PCB (εr)' : 'Substrate εr'}
                        </span>
                        <span className="font-mono-num font-bold text-[#00E5FF]">
                          {params.patchDielectricEr.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={2.1}
                        max={10.2}
                        step={0.05}
                        value={params.patchDielectricEr}
                        onChange={(e) =>
                          onUpdateParams({
                            patchDielectricEr: parseFloat(e.target.value),
                          })
                        }
                        className="w-full rf-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#CBD5E1]">
                          {lang === 'id' ? 'Tebal PCB (h)' : 'Thickness (h)'}
                        </span>
                        <span className="font-mono-num font-bold text-[#FFB300]">
                          {params.patchSubstrateHeightMm.toFixed(1)} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={4.0}
                        step={0.1}
                        value={params.patchSubstrateHeightMm}
                        onChange={(e) =>
                          onUpdateParams({
                            patchSubstrateHeightMm: parseFloat(e.target.value),
                          })
                        }
                        className="w-full rf-slider rf-slider-amber"
                      />
                    </div>
                  </div>
                )}

                {params.antennaType === 'horn' && (
                  <div className="flex flex-col gap-3.5 pt-3.5 border-t border-white/8">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#CBD5E1]">
                          {lang === 'id' ? 'Lebar Corong (A)' : 'Horn Width (A)'}
                        </span>
                        <span className="font-mono-num font-bold text-[#00E5FF]">
                          {params.hornApertureALambda.toFixed(1)} λ
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1.4}
                        max={6.5}
                        step={0.1}
                        value={params.hornApertureALambda}
                        onChange={(e) =>
                          onUpdateParams({
                            hornApertureALambda: parseFloat(e.target.value),
                          })
                        }
                        className="w-full rf-slider"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#CBD5E1]">
                          {lang === 'id' ? 'Panjang Corong (L)' : 'Axial Length (L)'}
                        </span>
                        <span className="font-mono-num font-bold text-[#FFB300]">
                          {params.hornLengthLambda.toFixed(1)} λ
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1.5}
                        max={6.5}
                        step={0.1}
                        value={params.hornLengthLambda}
                        onChange={(e) =>
                          onUpdateParams({
                            hornLengthLambda: parseFloat(e.target.value),
                          })
                        }
                        className="w-full rf-slider rf-slider-amber"
                      />
                    </div>
                  </div>
                )}

                {/* 3. Flat Hairline Toggle for Secondary Sliders (VF, Wire Ø, Detuning) */}
                <div className="pt-3 border-t border-white/8">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full text-xs text-[#94A3B8] hover:text-[#F8FAFC] flex items-center justify-between transition cursor-pointer"
                  >
                    <span>
                      {lang === 'id'
                        ? 'Parameter Kawat & Detuning'
                        : 'Wire & Detuning Sliders'}
                    </span>
                    {showAdvanced ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showAdvanced && (
                    <div className="pt-3.5 flex flex-col gap-3.5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#94A3B8]">
                            {lang === 'id' ? 'Frekuensi Uji (f_uji)' : 'Test TX Freq'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-num font-bold text-[#FFB300]">
                              {params.operatingFreqMHz.toFixed(2)} MHz
                            </span>
                            {Math.abs(params.operatingFreqMHz - params.frequencyMHz) >
                              0.05 && (
                              <button
                                onClick={() =>
                                  onUpdateParams({
                                    operatingFreqMHz: params.frequencyMHz,
                                  })
                                }
                                className="p-0.5 rounded bg-white/10 text-[#00E5FF] cursor-pointer"
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

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#94A3B8]">VF</span>
                            <span className="font-mono-num font-bold text-[#F8FAFC]">
                              {params.velocityFactor.toFixed(2)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.85}
                            max={0.99}
                            step={0.01}
                            value={params.velocityFactor}
                            onChange={(e) =>
                              onUpdateParams({
                                velocityFactor: parseFloat(e.target.value),
                              })
                            }
                            className="w-full rf-slider"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#94A3B8]">
                              {lang === 'id' ? 'Ø Kawat' : 'Wire Ø'}
                            </span>
                            <span className="font-mono-num font-bold text-[#F8FAFC]">
                              {params.conductorDiameterMm.toFixed(1)} mm
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0.8}
                            max={25.0}
                            step={0.2}
                            value={params.conductorDiameterMm}
                            onChange={(e) =>
                              onUpdateParams({
                                conductorDiameterMm: parseFloat(e.target.value),
                              })
                            }
                            className="w-full rf-slider"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* TAB 2: 3D WAVE & VISUAL SLIDERS (Directly on card surface, no nested box) */
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#CBD5E1]">
                      {lang === 'id' ? 'Kecepatan Gelombang' : 'Wave Speed'}
                    </span>
                    <span className="font-mono-num font-bold text-[#00E5FF]">
                      {visConfig.waveSpeed.toFixed(1)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.1}
                    value={visConfig.waveSpeed}
                    onChange={(e) =>
                      onUpdateVisConfig({ waveSpeed: parseFloat(e.target.value) })
                    }
                    className="w-full rf-slider"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#CBD5E1]">
                      {lang === 'id' ? 'Skala Pancaran Boom' : 'Signal Boom Reach'}
                    </span>
                    <span className="font-mono-num font-bold text-[#FFB300]">
                      {(visConfig.signalPowerIntensity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={1.6}
                    step={0.05}
                    value={visConfig.signalPowerIntensity}
                    onChange={(e) =>
                      onUpdateVisConfig({
                        signalPowerIntensity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rf-slider rf-slider-amber"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#CBD5E1]">
                      {lang === 'id' ? 'Opasitas Kubah 3D' : '3D Lobe Opacity'}
                    </span>
                    <span className="font-mono-num font-bold text-[#F8FAFC]">
                      {(visConfig.lobeOpacity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.85}
                    step={0.05}
                    value={visConfig.lobeOpacity}
                    onChange={(e) =>
                      onUpdateVisConfig({
                        lobeOpacity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full rf-slider"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/8">
                  <span className="text-xs text-[#CBD5E1]">Wireframe 3D</span>
                  <button
                    onClick={() =>
                      onUpdateVisConfig({
                        lobeWireframe: !visConfig.lobeWireframe,
                      })
                    }
                    className={`px-2.5 py-0.5 rounded-md text-xs font-mono-num border transition cursor-pointer ${
                      visConfig.lobeWireframe
                        ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]'
                        : 'bg-white/5 border-white/10 text-[#64748B]'
                    }`}
                  >
                    {visConfig.lobeWireframe ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#CBD5E1]">
                    {lang === 'id' ? 'Grid Lantai' : 'Floor Grid'}
                  </span>
                  <button
                    onClick={() =>
                      onUpdateVisConfig({
                        showPolarGrid: !visConfig.showPolarGrid,
                      })
                    }
                    className={`px-2.5 py-0.5 rounded-md text-xs font-mono-num border transition cursor-pointer ${
                      visConfig.showPolarGrid
                        ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                        : 'bg-white/5 border-white/10 text-[#64748B]'
                    }`}
                  >
                    {visConfig.showPolarGrid ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
