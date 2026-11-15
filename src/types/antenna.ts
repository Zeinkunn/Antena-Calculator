export type Language = 'id' | 'en';

export type AntennaType =
  | 'dipole'
  | 'groundplane'
  | 'yagi'
  | 'dish'
  | 'helical'
  | 'patch'
  | 'biquad'
  | 'horn';

export interface BilingualText {
  id: string;
  en: string;
}

export interface FrequencyPreset {
  id: string;
  label: string;
  freqMHz: number;
  band: string;
  usage: BilingualText;
}

export interface AntennaParams {
  antennaType: AntennaType;
  /** Design resonant frequency in MHz */
  frequencyMHz: number;
  /** Active operating/transmit frequency in MHz (for VSWR detuning test) */
  operatingFreqMHz: number;
  /** Conductor velocity factor (0.85 to 0.99) */
  velocityFactor: number;
  /** Element wire/tube diameter in mm */
  conductorDiameterMm: number;

  // Yagi-Uda specific
  /** Total number of elements (Reflector + Driven + Directors, from 3 to 14) */
  yagiElementCount: number;
  /** Director spacing in fraction of wavelength (0.15 to 0.35) */
  yagiDirectorSpacingLambda: number;

  // Ground Plane specific
  /** Radial droop angle in degrees (0 = horizontal, 45 = standard 50 ohm) */
  gpRadialAngleDeg: number;

  // Parabolic Dish specific
  /** Dish diameter in wavelengths or meters (we store diameter in meters, auto-scaled or adjustable) */
  dishDiameterLambda: number;
  /** Focal length to diameter ratio (f/D: 0.25 to 0.65) */
  dishFdRatio: number;
  /** Aperture efficiency (0.50 to 0.75) */
  dishEfficiency: number;

  // Helical specific
  /** Number of helical turns (3 to 20) */
  helicalTurns: number;
  /** Turn spacing in wavelengths (approx 0.22 to 0.28) */
  helicalSpacingLambda: number;
  /** Polarization handedness */
  helicalHandedness: 'RHCP' | 'LHCP';

  // Microstrip Patch specific
  /** Substrate relative permittivity (Er: 2.2 Rogers to 4.4 FR-4 to 10.2 Alumina) */
  patchDielectricEr: number;
  /** Substrate height in mm */
  patchSubstrateHeightMm: number;

  // Pyramidal Horn specific
  /** Horn flare aperture width in wavelengths */
  hornApertureALambda: number;
  /** Horn axial length in wavelengths */
  hornLengthLambda: number;

  // Link Budget Simulator parameters
  txPowerDbm: number;
  linkDistanceKm: number;
  rxAntennaGainDbi: number;
  cableLossDb: number;
}

export interface CutSheetItem {
  key: string;
  name: BilingualText;
  symbol: string;
  valueMeters: number;
  lambdaFraction: string;
  spacingFromPrevMeters?: number;
  spacingLambdaFraction?: string;
  positionMeters?: number;
  notes: BilingualText;
  highlightColor?: string;
}

export interface SWRPoint {
  freqMHz: number;
  vswr: number;
  s11Db: number;
}

export interface LinkBudgetResult {
  fsplDb: number;
  eirpDbm: number;
  rxPowerDbm: number;
  fresnelRadiusMeters: number;
  thermalNoiseFloorDbm: number;
  snrMarginDb: number;
  linkQuality: 'excellent' | 'good' | 'marginal' | 'no-link';
}

export interface AntennaCalculationResult {
  wavelengthMeters: number;
  effectiveWavelengthMeters: number;
  quarterWaveMeters: number;
  halfWaveMeters: number;

  /** Peak Gain in dBi */
  gainDbi: number;
  /** Peak Gain in dBd (dBi - 2.15) */
  gainDbd: number;
  /** Half-Power Beamwidth (-3dB) in E-plane (degrees) */
  hpbwEDeg: number;
  /** Half-Power Beamwidth (-3dB) in H-plane (degrees) */
  hpbwHDeg: number;
  /** Front-to-Back ratio in dB */
  frontToBackDb: number;
  /** Nominal input impedance at resonance (Ohms) */
  impedanceOhms: number;
  /** Active reactance at operating frequency (Ohms) */
  reactanceOhms: number;
  /** Active VSWR at operatingFreqMHz */
  activeVswr: number;
  /** Active Return Loss S11 in dB at operatingFreqMHz */
  activeS11Db: number;
  /** Fractional 2:1 VSWR Bandwidth in % and MHz */
  bandwidthPercent: number;
  bandwidthMHz: number;
  /** Effective Aperture Area in m^2 */
  effectiveApertureM2: number;
  /** Polarization type description */
  polarization: BilingualText;
  /** Radiation pattern classification */
  patternType: BilingualText;

  /** Total physical boom/depth length in meters */
  totalLengthMeters: number;

  /** Detailed Cut Sheet / Blueprint table */
  cutSheet: CutSheetItem[];

  /** Formulas & Engineering notes for this specific antenna */
  formulas: {
    title: BilingualText;
    equation: string;
    explanation: BilingualText;
  }[];

  /** VSWR sweep across frequency band */
  swrCurve: SWRPoint[];

  /** Link budget calculation */
  linkBudget: LinkBudgetResult;
}

export interface VisualSimulationConfig {
  /** Play/Pause electromagnetic wave propagation */
  isPlaying: boolean;
  /** Wave propagation speed multiplier (0.2x to 2.5x) */
  waveSpeed: number;
  /** Signal Boom pulse intensity (0.3 to 2.0) */
  signalPowerIntensity: number;
  /** Show 3D Expanding Signal Boom Wavefront Rings & Particles */
  showSignalBoom: boolean;
  /** Show 3D Volumetric Radiation Pattern Lobe (dBi Heatmap Mesh) */
  showRadiationLobe: boolean;
  /** Radiation Lobe Opacity (0.1 to 0.85) */
  lobeOpacity: number;
  /** Show wireframe on 3D Radiation Lobe */
  lobeWireframe: boolean;
  /** Show orthogonal E-Field (Cyan) & H-Field (Amber) sinusoidal wave vectors */
  showEHFieldVectors: boolean;
  /** Show 3D CAD Dimension Callout lines & labels on the antenna */
  showDimensions3D: boolean;
  /** Show Anechoic Chamber Polar Floor Grid */
  showPolarGrid: boolean;
  /** Slowly auto-rotate camera around the antenna */
  autoRotateCamera: boolean;
}
