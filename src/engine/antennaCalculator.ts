import {
  AntennaCalculationResult,
  AntennaParams,
  AntennaType,
  CutSheetItem,
  LinkBudgetResult,
  SWRPoint,
} from '../types/antenna';

const SPEED_OF_LIGHT_M_PER_MHZ = 299.792458;

/**
 * Formats a length in meters into a human-friendly string with adaptive units (m, cm, mm)
 */
export function formatLength(meters: number, precision = 2): string {
  const abs = Math.abs(meters);
  if (abs >= 1.0) {
    return `${meters.toFixed(precision)} m (${(meters * 100).toFixed(1)} cm)`;
  }
  if (abs >= 0.1) {
    return `${(meters * 100).toFixed(precision)} cm (${(meters * 1000).toFixed(1)} mm)`;
  }
  return `${(meters * 1000).toFixed(precision)} mm`;
}

/**
 * Formats a compact length for 3D dimension badges and compact cells (mm for < 2m, m for >= 2m)
 */
export function formatCompactLength(meters: number): string {
  const abs = Math.abs(meters);
  if (abs >= 2.0) {
    return `${meters.toFixed(2)} m`;
  }
  return `${(meters * 1000).toFixed(1)} mm`;
}

/**
 * Evaluates normalized linear field/power directional gain pattern [0..1] in 3D spherical coordinates.
 * Coordinate system in Three.js scene:
 * - Y is UP (zenith: theta_y = 0, horizon: theta_y = PI/2)
 * - +Z is FORWARD BORESIGHT (boom axis for directional antennas)
 * - X is HORIZONTAL RIGHT
 *
 * Input angles:
 * @param dirX unit vector X
 * @param dirY unit vector Y
 * @param dirZ unit vector Z
 */
export function evaluateDirectionalPatternVec(
  type: AntennaType,
  params: AntennaParams,
  dirX: number,
  dirY: number,
  dirZ: number
): number {
  const len = Math.hypot(dirX, dirY, dirZ) || 1;
  const x = dirX / len;
  const y = dirY / len;
  const z = dirZ / len;

  switch (type) {
    case 'dipole': {
      // Vertical half-wave dipole along Y axis -> Doughnut in XZ plane
      const sinTheta = Math.sqrt(Math.max(0.0001, 1 - y * y));
      const num = Math.cos((Math.PI / 2) * y);
      const val = Math.abs(num / sinTheta);
      return Math.max(0.04, Math.min(1, val));
    }

    case 'groundplane': {
      // Monopole along +Y with drooping radials -> Omnidirectional in XZ with slight upward tilt + ground reflection lobes
      const sinTheta = Math.sqrt(Math.max(0.0001, 1 - y * y));
      const droopFactor = (params.gpRadialAngleDeg || 45) / 90;
      // Peak slightly above horizon, weaker below radials
      const elevationWeight =
        y >= -0.15
          ? Math.pow(sinTheta, 0.85) * (0.85 + 0.22 * Math.sin(Math.max(0, y) * Math.PI))
          : Math.pow(sinTheta, 1.6) * (0.35 + 0.25 * droopFactor);
      return Math.max(0.05, Math.min(1, elevationWeight));
    }

    case 'yagi': {
      // Boom along +Z axis. Elements parallel to X axis (Horizontal polarization).
      // cosAlpha is cosine of angle from +Z forward boom axis
      const N = Math.max(3, Math.min(15, params.yagiElementCount));
      const spacing = params.yagiDirectorSpacingLambda || 0.22;
      const forwardAngle = Math.acos(Math.max(-1, Math.min(1, z)));

      // Array factor approximation with side lobes & back lobe
      const k = 1.6 + (N - 3) * 0.48 * (spacing / 0.2);
      const mainLobe = z > 0 ? Math.pow(Math.max(0, z), k) : 0;
      const sideLobeOsc =
        0.16 *
        Math.abs(Math.sin(forwardAngle * (N * 0.72))) *
        Math.exp(-forwardAngle * 0.65);
      const backLobe =
        z < 0 ? (0.22 / Math.sqrt(N - 1.5)) * Math.pow(Math.abs(z), 2.8) : 0;

      // E-plane (X-Z) is slightly narrower than H-plane (Y-Z) due to dipole element factor
      const elementFactor = Math.sqrt(Math.max(0.15, 1 - 0.65 * x * x));
      const combined = (mainLobe + sideLobeOsc + backLobe) * elementFactor;
      return Math.max(0.04, Math.min(1, combined));
    }

    case 'dish': {
      // Parabolic dish pointing along +Z axis
      const dLambda = Math.max(1.5, params.dishDiameterLambda || 6);
      const forwardAngle = Math.acos(Math.max(-1, Math.min(1, z)));
      // Airy pattern approximation J1(u)/u
      const u = Math.PI * dLambda * Math.sin(forwardAngle) * 0.55;
      let main = 1.0;
      if (forwardAngle < Math.PI / 2) {
        if (Math.abs(u) > 0.01) {
          const sinc = Math.sin(u) / u;
          main = Math.pow(Math.abs(sinc), 1.45) * Math.pow(Math.max(0, z), 1.8);
        }
      } else {
        // Spillover & back lobe
        main = 0.05 * Math.pow(Math.abs(z), 3);
      }
      const sideRipple =
        z > -0.2
          ? 0.09 * Math.abs(Math.cos(forwardAngle * dLambda * 1.4)) * Math.exp(-forwardAngle * 1.4)
          : 0.03;
      return Math.max(0.03, Math.min(1, main + sideRipple));
    }

    case 'helical': {
      // Axial mode helical along +Z axis (circularly polarized symmetric beam)
      const turns = Math.max(3, params.helicalTurns || 8);
      const spacing = params.helicalSpacingLambda || 0.24;
      const forwardAngle = Math.acos(Math.max(-1, Math.min(1, z)));
      const sharpness = 2.2 + turns * spacing * 2.6;
      const mainLobe = z > 0 ? Math.pow(z, sharpness) : 0;
      const sideLobe =
        0.13 *
        Math.abs(Math.sin(forwardAngle * (turns * 0.55))) *
        Math.exp(-forwardAngle * 0.8);
      const backLobe = z < 0 ? 0.09 * Math.pow(Math.abs(z), 3.2) : 0;
      return Math.max(0.04, Math.min(1, mainLobe + sideLobe + backLobe));
    }

    case 'patch': {
      // Microstrip patch lying in X-Y plane, radiating forward along +Z hemisphere
      const er = params.patchDielectricEr || 4.4;
      const directivityBoost = 1.15 + 1.2 / Math.sqrt(er);
      if (z >= 0) {
        // Broad hemispherical beam with E-plane/H-plane asymmetry
        const ePlaneShape = Math.pow(Math.max(0.05, 1 - 0.45 * y * y), 0.9);
        const hPlaneShape = Math.pow(Math.max(0.05, 1 - 0.65 * x * x), 1.1);
        const forward = Math.pow(z, directivityBoost) * ePlaneShape * hPlaneShape;
        return Math.max(0.06, Math.min(1, forward + 0.06));
      } else {
        // Ground plane blocks back radiation strongly
        return Math.max(0.03, 0.09 * Math.pow(Math.abs(z), 2.4));
      }
    }

    case 'biquad': {
      // Biquad in front of reflector pointing along +Z
      // Wide H-plane, moderate E-plane (~60-70 deg HPBW), high F/B ratio
      if (z >= 0) {
        const main =
          Math.pow(z, 2.3) *
          Math.pow(Math.max(0.1, 1 - 0.55 * y * y), 1.2) *
          Math.pow(Math.max(0.1, 1 - 0.35 * x * x), 0.8);
        return Math.max(0.05, Math.min(1, main + 0.05));
      } else {
        return Math.max(0.03, 0.1 * Math.pow(Math.abs(z), 2.5));
      }
    }

    case 'horn': {
      // Pyramidal waveguide horn pointing along +Z
      const ap = Math.max(1.2, params.hornApertureALambda || 2.5);
      const forwardAngle = Math.acos(Math.max(-1, Math.min(1, z)));
      const sharpness = 2.0 + ap * 1.45;
      const main = z > 0 ? Math.pow(z, sharpness) : 0;
      const minorLobe =
        0.1 * Math.abs(Math.sin(forwardAngle * ap * 2.1)) * Math.exp(-forwardAngle * 1.1);
      const back = z < 0 ? 0.06 * Math.pow(Math.abs(z), 3.5) : 0;
      return Math.max(0.03, Math.min(1, main + minorLobe + back));
    }
  }
}

/**
 * Main calculation engine for physical dimensions, electrical performance, VSWR sweep, and Link Budget
 */
export function calculateAntenna(params: AntennaParams): AntennaCalculationResult {
  const fMHz = Math.max(1, params.frequencyMHz);
  const fOpMHz = Math.max(1, params.operatingFreqMHz || fMHz);
  const vf = Math.max(0.7, Math.min(1.0, params.velocityFactor || 0.95));

  const wavelengthMeters = SPEED_OF_LIGHT_M_PER_MHZ / fMHz;
  const effectiveWavelengthMeters = wavelengthMeters * vf;
  const halfWaveMeters = effectiveWavelengthMeters * 0.5;
  const quarterWaveMeters = effectiveWavelengthMeters * 0.25;

  // Wire diameter end-effect factor (k factor based on lambda / diameter ratio)
  const wireDiaMeters = Math.max(0.0005, (params.conductorDiameterMm || 4) / 1000);
  const slenderness = wavelengthMeters / wireDiaMeters;
  const endEffectK = Math.max(0.92, Math.min(0.98, 1 - 0.045 / Math.log10(Math.max(10, slenderness))));

  let gainDbi = 2.15;
  let hpbwEDeg = 78;
  let hpbwHDeg = 360;
  let frontToBackDb = 0;
  let impedanceOhms = 73;
  let bandwidthPercent = 8.0;
  let totalLengthMeters = halfWaveMeters;
  let polarization = { id: 'Linear Vertikal', en: 'Vertical Linear' };
  let patternType = { id: 'Omnidirectional (Toroidal 360°)', en: 'Omnidirectional (360° Toroidal)' };
  const cutSheet: CutSheetItem[] = [];
  const formulas: AntennaCalculationResult['formulas'] = [];

  switch (params.antennaType) {
    case 'dipole': {
      const totalDipoleLen = 0.5 * wavelengthMeters * vf * endEffectK;
      const feedGap = Math.min(0.015, wavelengthMeters * 0.008);
      const singleArmLen = (totalDipoleLen - feedGap) / 2;

      gainDbi = 2.15;
      hpbwEDeg = 78.0;
      hpbwHDeg = 360.0;
      frontToBackDb = 0.0;
      impedanceOhms = 72.8;
      bandwidthPercent = 9.5;
      totalLengthMeters = totalDipoleLen;
      polarization = { id: 'Linear (Sesuai Orientasi Kawat)', en: 'Linear (Aligned with Wire Axis)' };
      patternType = { id: 'Omnidirectional Toroidal 360°', en: '360° Toroidal Omnidirectional' };

      cutSheet.push(
        {
          key: 'total-len',
          name: { id: 'Panjang Total Dipole (L)', en: 'Total Dipole Span (L)' },
          symbol: 'L_total',
          valueMeters: totalDipoleLen,
          lambdaFraction: `${(0.5 * vf * endEffectK).toFixed(3)} λ`,
          notes: {
            id: 'Panjang ujung-ke-ujung dengan koreksi faktor kecepatan & efek ujung',
            en: 'Tip-to-tip resonant length corrected for VF & wire diameter end-effect',
          },
          highlightColor: '#00E5FF',
        },
        {
          key: 'arm-top',
          name: { id: 'Lengan Konduktor 1 (Hot / Inti Koaks)', en: 'Radiating Arm 1 (Coax Center)' },
          symbol: 'L_arm1',
          valueMeters: singleArmLen,
          lambdaFraction: `${(singleArmLen / wavelengthMeters).toFixed(3)} λ`,
          notes: {
            id: 'Dihubungkan ke konduktor tengah kabel koaksial melalui Balun 1:1',
            en: 'Connected to coaxial center conductor via 1:1 current balun',
          },
          highlightColor: '#FFB300',
        },
        {
          key: 'arm-bot',
          name: { id: 'Lengan Konduktor 2 (Ground / Braid)', en: 'Radiating Arm 2 (Coax Shield)' },
          symbol: 'L_arm2',
          valueMeters: singleArmLen,
          lambdaFraction: `${(singleArmLen / wavelengthMeters).toFixed(3)} λ`,
          notes: {
            id: 'Dihubungkan ke serabut ground koaksial (simetris dengan Lengan 1)',
            en: 'Connected to coaxial shield braid (identical to Arm 1)',
          },
          highlightColor: '#10B981',
        },
        {
          key: 'feed-gap',
          name: { id: 'Celah Isolator Tengah (Feed Gap)', en: 'Center Insulator Feed Gap' },
          symbol: 'g_feed',
          valueMeters: feedGap,
          lambdaFraction: '0.008 λ',
          notes: {
            id: 'Jarak isolasi antar pangkal kedua lengan pada blok terminal',
            en: 'Insulated separation between inner arm terminals',
          },
        }
      );

      formulas.push(
        {
          title: { id: 'Panjang Resonansi Dipole λ/2', en: 'Half-Wave Dipole Resonant Length' },
          equation: 'L = 0.5 × (c / f) × VF × k_end ≈ 142.5 / f(MHz)',
          explanation: {
            id: 'Efek kapasitansi ujung dan diameter konduktor memperpendek panjang resonansi elektrik sekitar 4–5% dibanding λ/2 ruang bebas.',
            en: 'Fringe capacitance at the wire tips shortens physical electrical resonance by 4–5% relative to free-space λ/2.',
          },
        },
        {
          title: { id: 'Pola Medan Jauh (Far-Field)', en: 'Far-Field Radiation Pattern' },
          equation: 'E(θ) = cos((π/2) cos θ) / sin θ',
          explanation: {
            id: 'Menghasilkan pancaran maksimum tegak lurus kawat (θ = 90°) dengan lebar berkas -3 dB sebesar 78°.',
            en: 'Produces maximum radiation broadside to the wire (θ = 90°) with a 78° half-power beamwidth.',
          },
        }
      );
      break;
    }

    case 'groundplane': {
      const angleDeg = Math.max(0, Math.min(70, params.gpRadialAngleDeg ?? 45));
      const verticalRadiator = 0.25 * wavelengthMeters * vf * endEffectK;
      const radialLength = 0.25 * wavelengthMeters * vf * 1.02; // Radials slightly longer (~0.255 lambda)

      // Impedance shifts from ~36 Ohms at 0 deg (flat) to ~50 Ohms at 42-45 deg droop
      impedanceOhms = 36 + 18 * Math.sin((angleDeg * Math.PI) / 180);
      gainDbi = 3.2 + 1.6 * Math.sin((angleDeg * Math.PI) / 180);
      hpbwEDeg = 52;
      hpbwHDeg = 360;
      frontToBackDb = 0;
      bandwidthPercent = 11.5;
      totalLengthMeters = verticalRadiator + radialLength * Math.sin((angleDeg * Math.PI) / 180);
      polarization = { id: 'Linear Vertikal', en: 'Vertical Linear' };
      patternType = { id: 'Omnidirectional Horizon Rendah', en: 'Low-Angle Omnidirectional' };

      cutSheet.push(
        {
          key: 'gp-vert',
          name: { id: ' cambuk Vertikal Utama (Driven Whip)', en: 'Vertical Driven Whip (1×)' },
          symbol: 'L_vert',
          valueMeters: verticalRadiator,
          lambdaFraction: `${(verticalRadiator / wavelengthMeters).toFixed(3)} λ`,
          notes: {
            id: 'Disolder tegak lurus pada pin tengah konektor SO-239 / N-Female',
            en: 'Soldered vertically to the center pin of SO-239 / N-type chassis connector',
          },
          highlightColor: '#00E5FF',
        },
        {
          key: 'gp-radial',
          name: { id: 'Elemen Radial Ground (4× Batang)', en: 'Ground Plane Radials (4× Rods)' },
          symbol: 'L_rad',
          valueMeters: radialLength,
          lambdaFraction: `${(radialLength / wavelengthMeters).toFixed(3)} λ`,
          notes: {
            id: `Dipasang menyilang 90° pada flensa ground dengan sudut tekuk ${angleDeg}° ke bawah`,
            en: `Mounted at 90° intervals around ground flange, drooped ${angleDeg}° downward`,
          },
          highlightColor: '#10B981',
        },
        {
          key: 'gp-footprint',
          name: { id: 'Diameter Proyeksi Bentangan Bawah', en: 'Horizontal Footprint Span' },
          symbol: 'D_span',
          valueMeters: 2 * radialLength * Math.cos((angleDeg * Math.PI) / 180),
          lambdaFraction: `${((2 * radialLength * Math.cos((angleDeg * Math.PI) / 180)) / wavelengthMeters).toFixed(2)} λ`,
          notes: {
            id: 'Lebar ruang horizontal yang dibutuhkan oleh bentangan 4 radial',
            en: 'Total horizontal clearance required across opposite radial tips',
          },
          highlightColor: '#FFB300',
        }
      );

      formulas.push({
        title: { id: 'Penyesuaian Impedansi Sudut Radial', en: 'Radial Droop Impedance Matching' },
        equation: 'Z_in(θ_droop) ≈ 36 Ω + 18 × sin(θ_droop) → 50 Ω @ 45°',
        explanation: {
          id: 'Menekuk ke-4 radial sebesar 45° mengubah antena menjadi dipole asimetris dengan impedansi titik catu tepat 50 Ω.',
          en: 'Drooping the four radials by 45° transitions the monopole toward an asymmetric dipole, raising feedpoint impedance to 50 Ω.',
        },
      });
      break;
    }

    case 'yagi': {
      const N = Math.max(3, Math.min(14, Math.round(params.yagiElementCount || 6)));
      // Progressive spacing scale relative to standard 0.20λ nominal factor
      const baseSpacingSetting = Math.max(0.14, Math.min(0.35, params.yagiDirectorSpacingLambda || 0.2));
      const spacingScale = baseSpacingSetting / 0.2;

      // Calibrated velocity & wire slenderness factor (exact 1.000 at default VF=0.95, 4mm rod)
      const diaRatio = Math.max(0.25, (params.conductorDiameterMm || 4) / 4);
      const vfWireScale = (vf / 0.95) * (1 - 0.008 * Math.log10(diaRatio));

      const numDirectors = N - 2;
      const reflToDrivenLambda = 0.18 * spacingScale;

      // Calculate progressive non-uniform spacings (DL6WU / NBS Tapered Yagi-Uda)
      // REF -> DRV = 0.180λ
      // DRV -> D1  = 0.195λ
      // D1  -> D2  = 0.210λ
      // D2  -> D3  = 0.225λ
      // D3  -> D4  = 0.240λ (+0.015λ per director up to 0.340λ asymptotic limit)
      const directorSpacingsLambda: number[] = [];
      let cumulativeLambda = reflToDrivenLambda;
      for (let i = 1; i <= numDirectors; i++) {
        const stepLambda = Math.min(0.34, 0.195 + 0.015 * (i - 1)) * spacingScale;
        directorSpacingsLambda.push(stepLambda);
        cumulativeLambda += stepLambda;
      }

      const boomLengthLambda = cumulativeLambda;
      const boomLengthMeters = boomLengthLambda * wavelengthMeters;

      // Progressive element length taper (DL6WU / NBS):
      // Reflector = 0.493λ, Driven = 0.471λ, Directors taper from 0.430λ (-0.008λ per director)
      const reflectorLen = 0.493 * wavelengthMeters * vfWireScale;
      const drivenLen = 0.471 * wavelengthMeters * vfWireScale;
      const drivenPosMeters = reflToDrivenLambda * wavelengthMeters;

      // Gain scales logarithmically with boom length in wavelengths
      gainDbi = 7.2 + 10 * Math.log10(Math.max(0.35, boomLengthLambda * 2.35));
      hpbwEDeg = Math.max(22, 68 / Math.sqrt(Math.max(0.6, boomLengthLambda * 1.9)));
      hpbwHDeg = Math.max(25, hpbwEDeg * 1.14);
      frontToBackDb = Math.min(28, 12 + numDirectors * 2.1);
      impedanceOhms = 50.0; // Assume folded dipole / gamma match to 50 Ohms
      bandwidthPercent = Math.max(2.8, 7.5 - numDirectors * 0.35);
      totalLengthMeters = boomLengthMeters;
      polarization = { id: 'Linear Terarah (Horizontal/Vertikal)', en: 'Directional Linear (H/V)' };
      patternType = { id: `End-Fire Directional Boom (${N} Elemen)`, en: `End-Fire Directional Array (${N} Elements)` };

      cutSheet.push(
        {
          key: 'yagi-boom',
          name: { id: 'Panjang Total Boom Utama', en: 'Total Active Boom Span' },
          symbol: 'L_boom',
          valueMeters: boomLengthMeters,
          lambdaFraction: `${boomLengthLambda.toFixed(3)} λ`,
          notes: {
            id: `Jarak kumulatif dari Reflektor (0.0 mm) ke Direktor ${numDirectors} (${formatCompactLength(boomLengthMeters)})`,
            en: `Cumulative span from Reflector (0.0 mm) to Director ${numDirectors} (${formatCompactLength(boomLengthMeters)})`,
          },
          highlightColor: '#94A3B8',
        },
        {
          key: 'yagi-ref',
          name: { id: 'Reflektor', en: 'Reflector' },
          symbol: 'REF',
          valueMeters: reflectorLen,
          lambdaFraction: `${(reflectorLen / wavelengthMeters).toFixed(3)} λ`,
          spacingFromPrevMeters: 0,
          spacingLambdaFraction: '0.000 λ',
          positionMeters: 0,
          notes: {
            id: 'Spasi dari Prev: 0.0 mm • Posisi Kumulatif: 0.0 mm (Pangkal Boom)',
            en: 'Spacing from Prev: 0.0 mm • Cumulative Pos: 0.0 mm (Rear Origin)',
          },
          highlightColor: '#FF3366',
        },
        {
          key: 'yagi-drv',
          name: { id: 'Elemen Driven', en: 'Driven Element' },
          symbol: 'DRV',
          valueMeters: drivenLen,
          lambdaFraction: `${(drivenLen / wavelengthMeters).toFixed(3)} λ`,
          spacingFromPrevMeters: drivenPosMeters,
          spacingLambdaFraction: `${reflToDrivenLambda.toFixed(3)} λ`,
          positionMeters: drivenPosMeters,
          notes: {
            id: `Spasi dari Reflektor: ${formatCompactLength(drivenPosMeters)} (${reflToDrivenLambda.toFixed(3)} λ) • Kumulatif: ${formatCompactLength(drivenPosMeters)}`,
            en: `Spacing from Reflector: ${formatCompactLength(drivenPosMeters)} (${reflToDrivenLambda.toFixed(3)} λ) • Cumulative: ${formatCompactLength(drivenPosMeters)}`,
          },
          highlightColor: '#00E5FF',
        }
      );

      let runningPosLambda = reflToDrivenLambda;
      for (let i = 1; i <= numDirectors; i++) {
        // Taper director lengths progressively: D1=0.430λ, D2=0.422λ, D3=0.414λ, D4=0.406λ...
        const taperFactor = Math.max(0.362, 0.43 - 0.008 * (i - 1)) * vfWireScale;
        const dirLen = taperFactor * wavelengthMeters;

        const stepLambda = directorSpacingsLambda[i - 1];
        const stepMeters = stepLambda * wavelengthMeters;
        runningPosLambda += stepLambda;
        const posMeters = runningPosLambda * wavelengthMeters;

        cutSheet.push({
          key: `yagi-d${i}`,
          name: { id: `Direktor ${i}`, en: `Director ${i}` },
          symbol: `D${i}`,
          valueMeters: dirLen,
          lambdaFraction: `${(dirLen / wavelengthMeters).toFixed(3)} λ`,
          spacingFromPrevMeters: stepMeters,
          spacingLambdaFraction: `${stepLambda.toFixed(3)} λ`,
          positionMeters: posMeters,
          notes: {
            id: `Spasi dari Prev: +${formatCompactLength(stepMeters)} (${stepLambda.toFixed(3)} λ) • Kumulatif: ${formatCompactLength(posMeters)}`,
            en: `Spacing from Prev: +${formatCompactLength(stepMeters)} (${stepLambda.toFixed(3)} λ) • Cumulative: ${formatCompactLength(posMeters)}`,
          },
          highlightColor: '#10B981',
        });
      }

      formulas.push(
        {
          title: {
            id: 'Spasi Antar-Elemen Progresif & Taper (DL6WU / NBS)',
            en: 'Progressive Inter-Element Spacing & Length Taper (DL6WU / NBS)',
          },
          equation: 'Δz_DRV = 0.180λ,  Δz_Dn = (0.195 + 0.015(n−1))λ,  L_Dn = (0.430 − 0.008(n−1))λ',
          explanation: {
            id: 'Jarak antar elemen Yagi-Uda tidak seragam: spasi dimulai rapat di dekat Driven (0.180λ dan 0.195λ) untuk coupling impedansi, lalu merenggang secara progresif (0.210λ, 0.225λ, 0.240λ...) seiring pemendekan panjang Direktor.',
            en: 'Real Yagi-Uda element spacings are non-uniform: tight near the Driven element (0.180λ & 0.195λ) for impedance coupling, then progressively widening (0.210λ, 0.225λ, 0.240λ...) as director lengths taper down.',
          },
        },
        {
          title: { id: 'Penguatan Yagi-Uda terhadap Panjang Boom (DL6WU)', en: 'Yagi-Uda Boom-Length Gain Scaling' },
          equation: 'G(dBi) ≈ 7.2 + 10 × log10(2.35 × L_boom / λ)',
          explanation: {
            id: 'Deretan Director bertindak sebagai pandu gelombang lambat (slow-wave structure) yang memfokuskan fase sinyal sepanjang boom.',
            en: 'Parasitic directors form a slow-wave structure that progressively focuses phase wavefronts along the boom.',
          },
        }
      );
      break;
    }

    case 'dish': {
      const dLambda = Math.max(1.5, Math.min(40, params.dishDiameterLambda || 6.0));
      const fdRatio = Math.max(0.25, Math.min(0.7, params.dishFdRatio || 0.4));
      const efficiency = Math.max(0.45, Math.min(0.8, params.dishEfficiency || 0.6));

      const diameterMeters = dLambda * wavelengthMeters;
      const focalLengthMeters = diameterMeters * fdRatio;
      const dishDepthMeters = (diameterMeters * diameterMeters) / (16 * focalLengthMeters);

      const linearGain = efficiency * Math.pow(Math.PI * dLambda, 2);
      gainDbi = 10 * Math.log10(Math.max(1.5, linearGain));
      hpbwEDeg = Math.max(1.2, 70 / dLambda);
      hpbwHDeg = hpbwEDeg;
      frontToBackDb = Math.min(45, gainDbi + 8);
      impedanceOhms = 50.0;
      bandwidthPercent = 18.0;
      totalLengthMeters = diameterMeters;
      polarization = { id: 'Tergantung Feed Horn (Linear / Circular)', en: 'Feed-Dependent (Linear or Circular)' };
      patternType = { id: 'Pencil-Beam Fokus Tinggi', en: 'High-Gain Collimated Pencil Beam' };

      cutSheet.push(
        {
          key: 'dish-dia',
          name: { id: 'Diameter Bukaan Parabola (D)', en: 'Parabolic Dish Diameter (D)' },
          symbol: 'D',
          valueMeters: diameterMeters,
          lambdaFraction: `${dLambda.toFixed(2)} λ`,
          notes: {
            id: 'Diameter bukaan mulut piringan reflektor dari tepi ke tepi',
            en: 'Rim-to-rim circular aperture diameter',
          },
          highlightColor: '#00E5FF',
        },
        {
          key: 'dish-focal',
          name: { id: 'Jarak Titik Fokus Feed Horn (f)', en: 'Prime-Focus Feed Distance (f)' },
          symbol: 'f',
          valueMeters: focalLengthMeters,
          lambdaFraction: `${(focalLengthMeters / wavelengthMeters).toFixed(2)} λ`,
          notes: {
            id: `Jarak dari titik tengah dasar parabola ke mulut Feed Horn (f/D = ${fdRatio.toFixed(2)})`,
            en: `Distance from dish vertex center to feed horn phase center (f/D = ${fdRatio.toFixed(2)})`,
          },
          highlightColor: '#FFB300',
        },
        {
          key: 'dish-depth',
          name: { id: 'Kedalaman Cekungan Parabola (d)', en: 'Dish Bowl Depth (d)' },
          symbol: 'd_depth',
          valueMeters: dishDepthMeters,
          lambdaFraction: `${(dishDepthMeters / wavelengthMeters).toFixed(3)} λ`,
          notes: {
            id: 'Rumus geometri paraboloid: d = D² / (16 × f)',
            en: 'Paraboloid vertex depth computed from d = D² / (16 × f)',
          },
          highlightColor: '#10B981',
        },
        {
          key: 'dish-feed',
          name: { id: 'Diameter Pandu Gelombang Feed Horn', en: 'Waveguide Feed Can Diameter' },
          symbol: 'D_feed',
          valueMeters: 0.72 * wavelengthMeters,
          lambdaFraction: '0.720 λ',
          notes: {
            id: 'Ukuran mulut silinder iluminator pada titik fokus utama',
            en: 'Circular waveguide feed horn aperture at focal point',
          },
        }
      );

      formulas.push(
        {
          title: { id: 'Gain Bukaan Parabola (Aperture Gain)', en: 'Parabolic Aperture Gain' },
          equation: 'G(dBi) = 10 × log10( η × (π × D / λ)² )',
          explanation: {
            id: `Dengan efisiensi iluminasi η = ${(efficiency * 100).toFixed(0)}% dan D = ${dLambda.toFixed(1)}λ, setiap penggandaan diameter D menaikkan Gain sebesar +6 dB.`,
            en: `With aperture efficiency η = ${(efficiency * 100).toFixed(0)}% and D = ${dLambda.toFixed(1)}λ, doubling dish diameter adds +6.0 dB of gain.`,
          },
        },
        {
          title: { id: 'Titik Fokus Paraboloid', en: 'Paraboloid Focal Length' },
          equation: 'f = D² / (16 × d)   |   HPBW ≈ 70° × (λ / D)',
          explanation: {
            id: 'Menentukan posisi tepat pemasangan LNB / Feed Horn agar seluruh pantulan sefase.',
            en: 'Determines the exact phase-center location for mounting the feed horn.',
          },
        }
      );
      break;
    }

    case 'helical': {
      const turns = Math.max(3, Math.min(20, Math.round(params.helicalTurns || 8)));
      const spacingLambda = Math.max(0.18, Math.min(0.3, params.helicalSpacingLambda || 0.24));
      const circumferenceLambda = 1.02; // Optimum Kraus axial mode

      const circumferenceMeters = circumferenceLambda * wavelengthMeters;
      const coilDiameterMeters = circumferenceMeters / Math.PI;
      const spacingMeters = spacingLambda * wavelengthMeters;
      const axialLengthMeters = turns * spacingMeters;
      const wireTurnLength = Math.hypot(circumferenceMeters, spacingMeters);
      const totalWireMeters = turns * wireTurnLength;
      const pitchAngleDeg = (Math.atan(spacingMeters / circumferenceMeters) * 180) / Math.PI;
      const reflectorDiaMeters = 0.95 * wavelengthMeters;

      // Empirical Kraus / Emerson realistic gain formula
      gainDbi = 8.3 + 10 * Math.log10(Math.max(0.5, turns * spacingLambda * 2.4));
      hpbwEDeg = Math.max(18, 52 / Math.sqrt(turns * spacingLambda));
      hpbwHDeg = hpbwEDeg;
      frontToBackDb = Math.min(25, 13 + turns * 0.8);
      impedanceOhms = 52.0; // Matched from ~140 Ohms via standard Kraus 1/4-wave microstrip matching tab
      bandwidthPercent = 28.0;
      totalLengthMeters = axialLengthMeters;
      polarization = {
        id: `Melingkar (${params.helicalHandedness} — Sudut Pitch ${pitchAngleDeg.toFixed(1)}°)`,
        en: `Circular (${params.helicalHandedness} — Pitch ${pitchAngleDeg.toFixed(1)}°)`,
      };
      patternType = { id: `Axial-Mode End-Fire (${turns} Lilitan)`, en: `Axial-Mode End-Fire (${turns} Turns)` };

      cutSheet.push(
        {
          key: 'hel-dia',
          name: { id: 'Diameter Tabung Lilitan Heliks (D)', en: 'Helix Coil Diameter (D)' },
          symbol: 'D_coil',
          valueMeters: coilDiameterMeters,
          lambdaFraction: `${(coilDiameterMeters / wavelengthMeters).toFixed(3)} λ`,
          notes: {
            id: 'Diameter silinder penyangga tempat kawat dililitkan (C ≈ 1.02λ)',
            en: 'Mandrel/former diameter so that 1 turn circumference C ≈ 1.02λ',
          },
          highlightColor: '#00E5FF',
        },
        {
          key: 'hel-space',
          name: { id: 'Jarak Antar-Lilitan (Turn Spacing S)', en: 'Turn-to-Turn Spacing (S)' },
          symbol: 'S',
          valueMeters: spacingMeters,
          lambdaFraction: `${spacingLambda.toFixed(3)} λ`,
          notes: {
            id: `Sudut kemiringan lilitan (Pitch Angle α) = ${pitchAngleDeg.toFixed(1)}°`,
            en: `Resulting helix pitch angle α = ${pitchAngleDeg.toFixed(1)}°`,
          },
          highlightColor: '#10B981',
        },
        {
          key: 'hel-axial',
          name: { id: `Panjang Total Boom Sumbu (${turns} Lilitan)`, en: `Total Axial Boom Length (${turns} Turns)` },
          symbol: 'L_axial',
          valueMeters: axialLengthMeters,
          lambdaFraction: `${( turns * spacingLambda ).toFixed(2)} λ`,
          notes: {
            id: 'Panjang total silinder dari pelat reflektor hingga ujung depan',
            en: 'Total axial length from ground reflector to front tip',
          },
          highlightColor: '#FFB300',
        },
        {
          key: 'hel-wire',
          name: { id: 'Total Panjang Kawat Tembaga Dibutuhkan', en: 'Total Unwound Copper Wire Length' },
          symbol: 'L_wire',
          valueMeters: totalWireMeters,
          lambdaFraction: `${(totalWireMeters / wavelengthMeters).toFixed(2)} λ`,
          notes: {
            id: 'Panjang kawat lurus sebelum dililitkan membentuk spiral',
            en: 'Straight wire length required before winding the helix',
          },
        },
        {
          key: 'hel-ref',
          name: { id: 'Diameter Pelat Reflektor Belakang', en: 'Rear Ground Reflector Disc Diameter' },
          symbol: 'D_ref',
          valueMeters: reflectorDiaMeters,
          lambdaFraction: '0.950 λ',
          notes: {
            id: 'Pelat logam bundar atau persegi minimal ≥ 0.85λ di pangkal antena',
            en: 'Circular or square metallic reflector shield ≥ 0.85λ at feed base',
          },
          highlightColor: '#FF3366',
        }
      );

      formulas.push({
        title: { id: 'Kondisi Axial-Mode Kraus (Polarisasi Melingkar)', en: 'Kraus Axial-Mode Helical Equations' },
        equation: 'C = π × D ≈ 1.0λ   |   S = C × tan(12.5°..14°) ≈ 0.24λ',
        explanation: {
          id: 'Impedansi alami heliks (~140 Ω) diturunkan menjadi 50 Ω menggunakan strip segitiga λ/4 (matching stub) pada 1/4 lilitan pertama.',
          en: 'Natural ~140 Ω terminal impedance is matched to 50 Ω coax using a λ/4 triangular microstrip ramp on the first quarter-turn.',
        },
      });
      break;
    }

    case 'patch': {
      const er = Math.max(1.5, Math.min(12.0, params.patchDielectricEr || 4.4));
      const hMeters = Math.max(0.0004, (params.patchSubstrateHeightMm || 1.6) / 1000);

      // Hammerstad & Jensen Microstrip Patch equations
      const patchWidth = (wavelengthMeters / 2) * Math.sqrt(2 / (er + 1));
      const ratioWH = Math.max(0.5, patchWidth / hMeters);
      const eReff =
        (er + 1) / 2 + ((er - 1) / 2) * Math.pow(1 + 12 / ratioWH, -0.5);

      const deltaL =
        0.412 *
        hMeters *
        ((eReff + 0.3) * (ratioWH + 0.264)) /
        ((eReff - 0.258) * (ratioWH + 0.8));

      const effectiveLength = wavelengthMeters / (2 * Math.sqrt(eReff));
      const patchLength = Math.max(0.002, effectiveLength - 2 * deltaL);
      // 50 Ohm inset feed notch depth y0
      const insetDepthY0 = patchLength * 0.295;
      const groundWidth = patchWidth + 6 * hMeters + 0.12 * wavelengthMeters;
      const groundLength = patchLength + 6 * hMeters + 0.12 * wavelengthMeters;

      gainDbi = 6.2 + 2.8 / Math.sqrt(er / 2.2);
      hpbwEDeg = 68;
      hpbwHDeg = 76;
      frontToBackDb = 16.5;
      impedanceOhms = 50.0; // At inset feed point y0
      bandwidthPercent = Math.max(1.8, 3.8 * (4.4 / er));
      totalLengthMeters = groundLength;
      polarization = { id: 'Linear Broadside (Tegak Lurus PCB)', en: 'Linear Broadside (Normal to PCB)' };
      patternType = { id: 'Hemispherical Directional Patch', en: 'Hemispherical Broadside Patch' };

      cutSheet.push(
        {
          key: 'patch-w',
          name: { id: 'Lebar Tembaga Patch (W)', en: 'Radiating Patch Width (W)' },
          symbol: 'W',
          valueMeters: patchWidth,
          lambdaFraction: `${(patchWidth / wavelengthMeters).toFixed(3)} λ₀`,
          notes: {
            id: 'Lebar sisi radiasi yang menentukan efisiensi pancaran dan impedansi tepi',
            en: 'Controls radiation efficiency and edge input resistance',
          },
          highlightColor: '#00E5FF',
        },
        {
          key: 'patch-l',
          name: { id: 'Panjang Resonansi Patch (L)', en: 'Resonant Patch Length (L)' },
          symbol: 'L',
          valueMeters: patchLength,
          lambdaFraction: `${(patchLength / wavelengthMeters).toFixed(3)} λ₀`,
          notes: {
            id: `Konstanta dielektrik efektif ε_reff = ${eReff.toFixed(2)}, koreksi tepi ΔL = ${(deltaL * 1000).toFixed(2)} mm`,
            en: `Effective permittivity ε_reff = ${eReff.toFixed(2)}, fringing extension ΔL = ${(deltaL * 1000).toFixed(2)} mm`,
          },
          highlightColor: '#FFB300',
        },
        {
          key: 'patch-inset',
          name: { id: 'Kedalaman Takikan Inset Feed 50 Ω (y₀)', en: '50 Ω Inset Feed Notch Depth (y₀)' },
          symbol: 'y₀',
          valueMeters: insetDepthY0,
          lambdaFraction: `${(insetDepthY0 / patchLength).toFixed(2)} L`,
          notes: {
            id: 'Jarak masuk jalur feed dari tepi patch agar impedansi turun dari ~240 Ω ke 50 Ω',
            en: 'Recessed feed distance from patch edge to match ~240 Ω edge impedance down to 50 Ω',
          },
          highlightColor: '#10B981',
        },
        {
          key: 'patch-gnd',
          name: { id: 'Ukuran Minimum Papan Ground PCB (Wg × Lg)', en: 'Minimum PCB Ground Plane Size' },
          symbol: 'L_gnd',
          valueMeters: groundLength,
          lambdaFraction: `${(groundLength / wavelengthMeters).toFixed(3)} λ₀`,
          notes: {
            id: `Dimensi substrat PCB disarankan: ${formatCompactLength(groundWidth)} × ${formatCompactLength(groundLength)}`,
            en: `Recommended substrate dimensions: ${formatCompactLength(groundWidth)} × ${formatCompactLength(groundLength)}`,
          },
        }
      );

      formulas.push({
        title: { id: 'Rumus Rongga Mikrostrip Hammerstad & Jensen', en: 'Hammerstad & Jensen Microstrip Cavity Model' },
        equation: 'W = (c / 2f)√(2/(εr+1))   |   L = (c / 2f√ε_reff) - 2ΔL',
        explanation: {
          id: 'Gelombang di dalam substrat PCB melambat sebesar faktor 1/√ε_reff sehingga ukuran fisik patch jauh lebih kecil dari λ/2 udara.',
          en: 'Waves inside the dielectric substrate slow down by 1/√ε_reff, shrinking the physical patch well below free-space λ/2.',
        },
      });
      break;
    }

    case 'biquad': {
      const sideLength = 0.246 * wavelengthMeters * vf;
      const totalSpanTipToTip = sideLength * Math.SQRT2 * 2;
      const wireTotalLen = sideLength * 8;
      const reflectorSpacing = 0.125 * wavelengthMeters;
      const reflectorHeight = 0.92 * wavelengthMeters;
      const reflectorWidth = 0.76 * wavelengthMeters;

      gainDbi = 11.2;
      hpbwEDeg = 58;
      hpbwHDeg = 66;
      frontToBackDb = 19.0;
      impedanceOhms = 52.0;
      bandwidthPercent = 14.0;
      totalLengthMeters = totalSpanTipToTip;
      polarization = { id: 'Linear (Tegak Lurus Sumbu Panjang Quad)', en: 'Linear (Orthogonal to Quad Axis)' };
      patternType = { id: 'Directional Aperture Loop', en: 'Directional Double-Quad Beam' };

      cutSheet.push(
        {
          key: 'biq-side',
          name: { id: 'Panjang Setiap Sisi Belah Ketupat (8× Sisi)', en: 'Quad Diamond Side Length (8× Sides)' },
          symbol: 'L_side',
          valueMeters: sideLength,
          lambdaFraction: '0.246 λ',
          notes: {
            id: 'Tekuk kawat 90° setiap kelipatan panjang ini untuk membentuk 2 belah ketupat kembar',
            en: 'Bend solid wire by 90° at every interval of L_side to form the figure-8 double quad',
          },
          highlightColor: '#00E5FF',
        },
        {
          key: 'biq-span',
          name: { id: 'Bentangan Diagonal Ujung-ke-Ujung', en: 'Total Outer Tip-to-Tip Span' },
          symbol: 'W_span',
          valueMeters: totalSpanTipToTip,
          lambdaFraction: `${(totalSpanTipToTip / wavelengthMeters).toFixed(3)} λ`,
          notes: {
            id: 'Panjang terluar elemen kawat biquad setelah ditekuk (2 × L_side × √2)',
            en: 'Outer diagonal span across both diamond loops (2 × L_side × √2)',
          },
          highlightColor: '#FFB300',
        },
        {
          key: 'biq-space',
          name: { id: 'Jarak Elemen Kawat ke Pelat Reflektor (h)', en: 'Standoff Spacing to Reflector (h)' },
          symbol: 'h_ref',
          valueMeters: reflectorSpacing,
          lambdaFraction: '0.125 λ',
          notes: {
            id: 'Jarak krusial λ/8 dari permukaan pelat reflektor ke bidang kawat biquad',
            en: 'Critical λ/8 separation between flat reflector sheet and wire quad plane',
          },
          highlightColor: '#10B981',
        },
        {
          key: 'biq-wire',
          name: { id: 'Total Kawat Tembaga Utuh (8 × Sisi)', en: 'Total Continuous Copper Wire Length' },
          symbol: 'L_wire',
          valueMeters: wireTotalLen,
          lambdaFraction: '1.968 λ',
          notes: {
            id: `Ukuran Pelat Reflektor: ${formatCompactLength(reflectorHeight)} × ${formatCompactLength(reflectorWidth)}`,
            en: `Reflector plate size: ${formatCompactLength(reflectorHeight)} × ${formatCompactLength(reflectorWidth)}`,
          },
        }
      );

      formulas.push({
        title: { id: 'Geometri Loop Biquad Resonansi', en: 'Biquad Double-Diamond Geometry' },
        equation: 'L_side = 0.246 × λ   |   W_span = 2√2 × L_side   |   h_reflector = 0.125 × λ',
        explanation: {
          id: 'Dua loop satu gelombang yang digabung paralel menurunkan impedansi ~100 Ω menjadi ~52 Ω yang langsung cocok dengan kabel koaksial 50 Ω.',
          en: 'Combining two full-wave loops in parallel halves their ~105 Ω individual impedance to a direct ~52 Ω match.',
        },
      });
      break;
    }

    case 'horn': {
      const apALambda = Math.max(1.2, Math.min(8.0, params.hornApertureALambda || 2.6));
      const apBLambda = apALambda * 0.75;
      const hornLenLambda = Math.max(1.2, Math.min(8.0, params.hornLengthLambda || 2.8));

      const wgWidthA = 0.72 * wavelengthMeters; // Rectangular waveguide broad wall a ≈ 0.72λ
      const wgHeightB = 0.36 * wavelengthMeters; // b = a/2
      const apertureA = apALambda * wavelengthMeters;
      const apertureB = apBLambda * wavelengthMeters;
      const hornAxiosLen = hornLenLambda * wavelengthMeters;
      const monopoleProbe = 0.235 * wavelengthMeters;

      const apertureEff = 0.52;
      const linearGain = (4 * Math.PI * apertureEff * (apertureA * apertureB)) / (wavelengthMeters * wavelengthMeters);
      gainDbi = 10 * Math.log10(Math.max(2, linearGain));
      hpbwEDeg = Math.max(10, 56 / apBLambda);
      hpbwHDeg = Math.max(12, 67 / apALambda);
      frontToBackDb = 26.0;
      impedanceOhms = 50.0;
      bandwidthPercent = 35.0;
      totalLengthMeters = hornAxiosLen + 0.55 * wavelengthMeters;
      polarization = { id: 'Linear Mode TE₁₀ (Sesuai Probe)', en: 'Linear TE₁₀ Waveguide Mode' };
      patternType = { id: 'Pyramidal Horn Aperture Beam', en: 'Low-Sidelobe Horn Aperture Beam' };

      cutSheet.push(
        {
          key: 'horn-ap-a',
          name: { id: 'Lebar Mulut Corong Depan H-Plane (A)', en: 'Front Horn Aperture Width H-Plane (A)' },
          symbol: 'A_ap',
          valueMeters: apertureA,
          lambdaFraction: `${apALambda.toFixed(2)} λ`,
          notes: {
            id: `Tinggi Bukaan E-Plane (B) = ${formatCompactLength(apertureB)} (${apBLambda.toFixed(2)} λ)`,
            en: `Vertical E-Plane Aperture Height (B) = ${formatCompactLength(apertureB)} (${apBLambda.toFixed(2)} λ)`,
          },
          highlightColor: '#00E5FF',
        },
        {
          key: 'horn-len',
          name: { id: 'Panjang Kerucut Corong (Axial Flare Length)', en: 'Pyramidal Flare Axial Length (L_flare)' },
          symbol: 'L_flare',
          valueMeters: hornAxiosLen,
          lambdaFraction: `${hornLenLambda.toFixed(2)} λ`,
          notes: {
            id: 'Panjang transisi miring dari leher pandu gelombang ke mulut corong depan',
            en: 'Axial distance from rectangular waveguide throat to front horn rim',
          },
          highlightColor: '#FFB300',
        },
        {
          key: 'horn-wg',
          name: { id: 'Dimensi Leher Waveguide (a × b)', en: 'Waveguide Throat Cavity Width (a)' },
          symbol: 'a_wg',
          valueMeters: wgWidthA,
          lambdaFraction: '0.720 λ',
          notes: {
            id: `Tinggi rongga b = ${formatCompactLength(wgHeightB)} (Mode dominan TE₁₀)`,
            en: `Cavity height b = ${formatCompactLength(wgHeightB)} (Dominant TE₁₀ waveguide mode)`,
          },
          highlightColor: '#10B981',
        },
        {
          key: 'horn-probe',
          name: { id: 'Panjang Pin Probe Koaksial Dalam (λ/4)', en: 'Internal Coaxial Launch Probe (λ/4)' },
          symbol: 'L_probe',
          valueMeters: monopoleProbe,
          lambdaFraction: '0.235 λ',
          notes: {
            id: `Berjarak λg/4 (${formatCompactLength(0.28 * wavelengthMeters)}) dari dinding belakang penutup waveguide`,
            en: `Spaced λg/4 (${formatCompactLength(0.28 * wavelengthMeters)}) from the rear waveguide shorting backplate`,
          },
        }
      );

      formulas.push({
        title: { id: 'Penguatan Corong Gelombang Mikro (Pyramidal Horn)', en: 'Pyramidal Horn Aperture Gain' },
        equation: 'G = (4π × η_ap × A × B) / λ²   (η_ap ≈ 0.51)',
        explanation: {
          id: 'Pelebaran bertahap dinding logam mencocokkan impedansi pandu gelombang TE₁₀ menuju impedansi ruang bebas 377 Ω tanpa pantulan.',
          en: 'Gradual tapering matches the TE₁₀ waveguide wave impedance smoothly to 377 Ω free space.',
        },
      });
      break;
    }
  }

  const gainDbd = gainDbi - 2.15;
  const linearGain = Math.pow(10, gainDbi / 10);
  const effectiveApertureM2 = (wavelengthMeters * wavelengthMeters * linearGain) / (4 * Math.PI);

  // Compute VSWR & Return Loss curve around resonant frequency fMHz
  // Q factor inversely proportional to fractional bandwidth
  const qFactor = 115 / Math.max(1.5, bandwidthPercent);
  const computeVswrAtFreq = (testFreqMHz: number) => {
    const detune = (testFreqMHz - fMHz) / fMHz;
    // Reactance X around resonance
    const xOhms = impedanceOhms * qFactor * (testFreqMHz / fMHz - fMHz / testFreqMHz);
    // Resistance shifts slightly with frequency
    const rOhms = impedanceOhms * (1 + 0.35 * detune);
    const z0 = 50.0;
    // Complex reflection coefficient Gamma = (Z - Z0) / (Z + Z0)
    const numReal = rOhms - z0;
    const numImag = xOhms;
    const denReal = rOhms + z0;
    const denImag = xOhms;
    const gammaMag = Math.min(
      0.98,
      Math.hypot(numReal, numImag) / Math.max(0.001, Math.hypot(denReal, denImag))
    );
    const vswr = (1 + gammaMag) / Math.max(0.02, 1 - gammaMag);
    const s11Db = 20 * Math.log10(Math.max(0.001, gammaMag));
    return { vswr: Math.min(15, vswr), s11Db: Math.max(-45, s11Db), xOhms };
  };

  const activePoint = computeVswrAtFreq(fOpMHz);
  const swrCurve: SWRPoint[] = [];
  const spanFactor = Math.max(0.12, Math.min(0.35, (bandwidthPercent / 100) * 2.4));
  const minSweep = fMHz * (1 - spanFactor);
  const maxSweep = fMHz * (1 + spanFactor);
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const sf = minSweep + ((maxSweep - minSweep) * i) / steps;
    const pt = computeVswrAtFreq(sf);
    swrCurve.push({
      freqMHz: sf,
      vswr: pt.vswr,
      s11Db: pt.s11Db,
    });
  }

  const bandwidthMHz = (fMHz * bandwidthPercent) / 100;

  // Friis Free-Space Link Budget Calculation
  const distKm = Math.max(0.01, params.linkDistanceKm || 5);
  const txPowerDbm = params.txPowerDbm ?? 20;
  const rxGainDbi = params.rxAntennaGainDbi ?? 2.15;
  const cableLossDb = params.cableLossDb ?? 1.5;

  // Mismatch loss due to active VSWR
  const gammaActive = (activePoint.vswr - 1) / (activePoint.vswr + 1);
  const mismatchLossDb = -10 * Math.log10(Math.max(0.05, 1 - gammaActive * gammaActive));

  // FSPL(dB) = 32.44 + 20 log10(f_MHz) + 20 log10(d_km)
  const fsplDb = 32.44 + 20 * Math.log10(fOpMHz) + 20 * Math.log10(distKm);
  const eirpDbm = txPowerDbm + gainDbi - cableLossDb - mismatchLossDb;
  const rxPowerDbm = eirpDbm - fsplDb + rxGainDbi;
  const fresnelRadiusMeters = 8.656 * Math.sqrt(distKm / (fOpMHz / 1000));
  const thermalNoiseFloorDbm = -104; // Typical 250 kHz digital receiver sensitivity floor
  const snrMarginDb = rxPowerDbm - thermalNoiseFloorDbm;

  let linkQuality: LinkBudgetResult['linkQuality'] = 'excellent';
  if (snrMarginDb < 3) linkQuality = 'no-link';
  else if (snrMarginDb < 12) linkQuality = 'marginal';
  else if (snrMarginDb < 22) linkQuality = 'good';

  return {
    wavelengthMeters,
    effectiveWavelengthMeters,
    quarterWaveMeters,
    halfWaveMeters,
    gainDbi,
    gainDbd,
    hpbwEDeg,
    hpbwHDeg,
    frontToBackDb,
    impedanceOhms,
    reactanceOhms: activePoint.xOhms,
    activeVswr: activePoint.vswr,
    activeS11Db: activePoint.s11Db,
    bandwidthPercent,
    bandwidthMHz,
    effectiveApertureM2,
    polarization,
    patternType,
    totalLengthMeters,
    cutSheet,
    formulas,
    swrCurve,
    linkBudget: {
      fsplDb,
      eirpDbm,
      rxPowerDbm,
      fresnelRadiusMeters,
      thermalNoiseFloorDbm,
      snrMarginDb,
      linkQuality,
    },
  };
}
