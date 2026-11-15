import React, { useMemo, useState } from 'react';
import {
  AntennaParams,
  AntennaType,
  Language,
  VisualSimulationConfig,
} from './types/antenna';
import { calculateAntenna } from './engine/antennaCalculator';
import { HeaderBar } from './components/HeaderBar';
import { CalculatorControlPanel } from './components/CalculatorControlPanel';
import { Viewport3D } from './components/Viewport3D';
import { AnalyticsRightPanel } from './components/AnalyticsRightPanel';
import { CutSheetDrawer } from './components/CutSheetDrawer';

export function App() {
  const [lang, setLang] = useState<Language>('id');
  const [burstTriggerCount, setBurstTriggerCount] = useState<number>(0);
  const [isCutSheetOpen, setIsCutSheetOpen] = useState<boolean>(false);
  const [isHudHidden, setIsHudHidden] = useState<boolean>(false);

  const [params, setParams] = useState<AntennaParams>({
    antennaType: 'yagi',
    frequencyMHz: 433.92,
    operatingFreqMHz: 433.92,
    velocityFactor: 0.95,
    conductorDiameterMm: 4.0,

    // Yagi-Uda defaults
    yagiElementCount: 6,
    yagiDirectorSpacingLambda: 0.2,

    // Ground Plane defaults
    gpRadialAngleDeg: 45,

    // J-Pole & Fiberglass Collinear defaults
    jpoleStubSpacingLambda: 0.03,
    collinearSectionCount: 4,

    // Parabolic Dish defaults
    dishDiameterLambda: 6.5,
    dishFdRatio: 0.4,
    dishEfficiency: 0.6,

    // Helical defaults
    helicalTurns: 8,
    helicalSpacingLambda: 0.24,
    helicalHandedness: 'RHCP',

    // Microstrip Patch defaults
    patchDielectricEr: 4.4,
    patchSubstrateHeightMm: 1.6,

    // Pyramidal Horn defaults
    hornApertureALambda: 2.6,
    hornLengthLambda: 2.8,

    // Link Budget defaults
    txPowerDbm: 27, // 500 mW
    linkDistanceKm: 12.0,
    rxAntennaGainDbi: 2.15,
    cableLossDb: 1.2,
  });

  const [visConfig, setVisConfig] = useState<VisualSimulationConfig>({
    isPlaying: true,
    waveSpeed: 1.0,
    signalPowerIntensity: 1.0,
    showSignalBoom: true,
    showRadiationLobe: true,
    lobeOpacity: 0.38,
    lobeWireframe: true,
    showEHFieldVectors: true,
    showDimensions3D: true,
    showPolarGrid: true,
    autoRotateCamera: false,
  });

  const calc = useMemo(() => calculateAntenna(params), [params]);

  const handleUpdateParams = (patch: Partial<AntennaParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const handleUpdateVisConfig = (patch: Partial<VisualSimulationConfig>) => {
    setVisConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleSelectAntennaType = (antennaType: AntennaType) => {
    setParams((prev) => ({
      ...prev,
      antennaType,
    }));
    setBurstTriggerCount((c) => c + 1);
  };

  const handleSelectPresetFreq = (freqMHz: number) => {
    setParams((prev) => ({
      ...prev,
      frequencyMHz: freqMHz,
      operatingFreqMHz: freqMHz,
    }));
    setBurstTriggerCount((c) => c + 1);
  };

  const handleTriggerBurst = () => {
    setBurstTriggerCount((c) => c + 1);
  };

  return (
    <div className="relative w-screen h-screen bg-[#060911] text-[#F1F5F9] overflow-hidden select-none">
      {/* 100% Full-Screen 3D Antenna & Signal Boom Viewport + Bottom Action Dock */}
      <Viewport3D
        lang={lang}
        params={params}
        calc={calc}
        visConfig={visConfig}
        onUpdateVisConfig={handleUpdateVisConfig}
        burstTriggerCount={burstTriggerCount}
        onTriggerBurst={handleTriggerBurst}
      />

      {/* Top Floating Command Bar (Antenna Dropdown, Preset Band Dropdown, Cut Sheet Button, ID/EN) */}
      <HeaderBar
        lang={lang}
        onToggleLang={setLang}
        params={params}
        wavelengthMeters={calc.wavelengthMeters}
        gainDbi={calc.gainDbi}
        cutSheetCount={calc.cutSheet.length}
        isHudHidden={isHudHidden}
        onToggleHudHidden={() => setIsHudHidden((v) => !v)}
        onOpenCutSheet={() => setIsCutSheetOpen(true)}
        onSelectAntennaType={handleSelectAntennaType}
        onSelectPresetFreq={handleSelectPresetFreq}
      />

      {/* Floating Left & Right Cards (Hidden when 3D Focus Mode is active) */}
      {!isHudHidden && (
        <>
          <CalculatorControlPanel
            lang={lang}
            params={params}
            calc={calc}
            visConfig={visConfig}
            onUpdateParams={handleUpdateParams}
            onUpdateVisConfig={handleUpdateVisConfig}
            onTriggerBurst={handleTriggerBurst}
            onOpenCutSheet={() => setIsCutSheetOpen(true)}
          />

          <AnalyticsRightPanel
            lang={lang}
            params={params}
            calc={calc}
            onUpdateParams={handleUpdateParams}
          />
        </>
      )}

      {/* On-Demand Floating Cut Sheet & Engineering Reference Modal */}
      <CutSheetDrawer
        lang={lang}
        params={params}
        calc={calc}
        isOpen={isCutSheetOpen}
        onClose={() => setIsCutSheetOpen(false)}
      />
    </div>
  );
}

export default App;
