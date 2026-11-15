import * as THREE from 'three';
import {
  AntennaCalculationResult,
  AntennaParams,
  VisualSimulationConfig,
} from '../../types/antenna';
import { evaluateDirectionalPatternVec } from '../../engine/antennaCalculator';
import { BuiltAntenna3D } from '../builders/antennaBuilders';
import { createLabelSprite, createPointCallout } from '../builders/dimensionHelper';

/**
 * Maps normalized pattern amplitude [0..1] to an RF Spectrum Heatmap color
 * (Blue -> Cyan -> Emerald -> Amber -> Coral/Magenta at peak)
 */
function amplitudeToHeatmapColor(normAmp: number, targetColor: THREE.Color) {
  const t = Math.max(0, Math.min(1, normAmp));
  if (t < 0.25) {
    const k = t / 0.25;
    targetColor.setRGB(0.08 * (1 - k) + 0.0 * k, 0.22 * (1 - k) + 0.75 * k, 0.75 * (1 - k) + 1.0 * k);
  } else if (t < 0.55) {
    const k = (t - 0.25) / 0.3;
    targetColor.setRGB(0.0 * (1 - k) + 0.06 * k, 0.75 * (1 - k) + 0.85 * k, 1.0 * (1 - k) + 0.5 * k);
  } else if (t < 0.8) {
    const k = (t - 0.55) / 0.25;
    targetColor.setRGB(0.06 * (1 - k) + 1.0 * k, 0.85 * (1 - k) + 0.72 * k, 0.5 * (1 - k) + 0.0 * k);
  } else {
    const k = (t - 0.8) / 0.2;
    targetColor.setRGB(1.0, 0.72 * (1 - k) + 0.2 * k, 0.0 * (1 - k) + 0.45 * k);
  }
}

interface WavefrontRingItem {
  line: THREE.LineLoop;
  baseDirs: THREE.Vector3[];
  plane: 'horizontal' | 'vertical' | 'cone';
  phaseOffset: number;
}

interface BoomHaloItem {
  mesh: THREE.Mesh;
  baseScale: number;
  phaseDelay: number;
  zPos: number;
}

export class SignalBoomEffectController {
  public readonly rootGroup = new THREE.Group();
  private lobeGroup = new THREE.Group();
  private signalBoomGroup = new THREE.Group();
  private ehVectorsGroup = new THREE.Group();

  private wavefrontRings: WavefrontRingItem[] = [];
  private boomHalos: BoomHaloItem[] = [];

  // Particle system for directional signal boom stream
  private particlePoints?: THREE.Points;
  private particlePositions!: Float32Array;
  private particleDirs!: Float32Array;
  private particlePhases!: Float32Array;
  private particleSpeeds!: Float32Array;
  private readonly PARTICLE_COUNT = 520;

  // Dynamic E-Field and H-Field wave lines
  private eFieldLine?: THREE.Line;
  private hFieldLine?: THREE.Line;
  private eFieldGeo?: THREE.BufferGeometry;
  private hFieldGeo?: THREE.BufferGeometry;
  private readonly WAVE_SAMPLES = 90;

  // Burst shockwave state when user clicks "Trigger Signal Boom"
  private burstProgress = -1; // -1 = inactive, 0..1 = expanding shockwave
  private burstShellMesh?: THREE.Mesh;

  private currentParams?: AntennaParams;
  private currentCalc?: AntennaCalculationResult;
  private currentBuilt?: BuiltAntenna3D;
  private elapsedTime = 0;

  constructor() {
    this.rootGroup.add(this.lobeGroup);
    this.rootGroup.add(this.signalBoomGroup);
    this.rootGroup.add(this.ehVectorsGroup);
  }

  /**
   * Triggers an energetic Signal Boom Shockwave burst
   */
  public triggerBoomBurst() {
    this.burstProgress = 0.001;
  }

  /**
   * Rebuilds the 3D Volumetric Lobe, Signal Boom Wavefront Rings, Boom Excitation Halos, and E/H Field geometry
   * whenever antenna type or physical parameters change.
   */
  public rebuild(
    params: AntennaParams,
    calc: AntennaCalculationResult,
    built: BuiltAntenna3D,
    visConfig: VisualSimulationConfig
  ) {
    this.currentParams = params;
    this.currentCalc = calc;
    this.currentBuilt = built;

    this.clearGroup(this.lobeGroup);
    this.clearGroup(this.signalBoomGroup);
    this.clearGroup(this.ehVectorsGroup);
    this.wavefrontRings = [];
    this.boomHalos = [];

    // Max visual radius of the 3D coverage dome (scales dynamically with Gain dBi & TX Power dBm)
    const txBoost = Math.max(-0.45, Math.min(0.85, ((params.txPowerDbm ?? 20) - 20) * 0.045));
    const maxRadius = 2.65 + Math.min(2.65, Math.max(0, (calc.gainDbi - 2) * 0.11 + txBoost));

    // =========================================================================
    // 1. 3D VOLUMETRIC RADIATION PATTERN LOBE (Heatmap Surface + Wireframe)
    // =========================================================================
    const latBands = 56;
    const lonBands = 84;
    const lobeGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const tmpColor = new THREE.Color();

    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat * Math.PI) / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= lonBands; lon++) {
        const phi = (lon * 2 * Math.PI) / lonBands;
        const dx = sinTheta * Math.sin(phi);
        const dy = cosTheta;
        const dz = sinTheta * Math.cos(phi);

        const amp = evaluateDirectionalPatternVec(params.antennaType, params, dx, dy, dz);
        const r = amp * maxRadius;

        positions.push(dx * r, dy * r, dz * r);
        amplitudeToHeatmapColor(amp, tmpColor);
        colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
      }
    }

    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const first = lat * (lonBands + 1) + lon;
        const second = first + lonBands + 1;
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    lobeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lobeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    lobeGeo.setIndex(indices);
    lobeGeo.computeVertexNormals();

    const lobeMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: visConfig.lobeOpacity,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const lobeMesh = new THREE.Mesh(lobeGeo, lobeMat);
    lobeMesh.name = 'lobeSurface';
    this.lobeGroup.add(lobeMesh);

    if (visConfig.lobeWireframe) {
      const wireMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        wireframe: true,
        transparent: true,
        opacity: Math.min(1, visConfig.lobeOpacity * 0.7),
        depthWrite: false,
      });
      const wireMesh = new THREE.Mesh(lobeGeo, wireMat);
      this.lobeGroup.add(wireMesh);
    }

    // Add Principal E-Plane & H-Plane Cross-Section Contour Rib Lines on the Lobe
    const hPlanePts: THREE.Vector3[] = [];
    const ePlanePts: THREE.Vector3[] = [];
    const sliceSteps = 120;
    for (let i = 0; i <= sliceSteps; i++) {
      const ang = (i / sliceSteps) * Math.PI * 2;
      // Horizontal XZ cut (Azimuth)
      const hx = Math.sin(ang);
      const hz = Math.cos(ang);
      const hAmp = evaluateDirectionalPatternVec(params.antennaType, params, hx, 0, hz);
      hPlanePts.push(new THREE.Vector3(hx * hAmp * maxRadius * 1.01, 0, hz * hAmp * maxRadius * 1.01));

      // Vertical YZ cut (Elevation)
      const ey = Math.sin(ang);
      const ez = Math.cos(ang);
      const eAmp = evaluateDirectionalPatternVec(params.antennaType, params, 0, ey, ez);
      ePlanePts.push(new THREE.Vector3(0, ey * eAmp * maxRadius * 1.01, ez * eAmp * maxRadius * 1.01));
    }

    const hContour = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(hPlanePts),
      new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.75 })
    );
    const eContour = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ePlanePts),
      new THREE.LineBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.75 })
    );
    this.lobeGroup.add(hContour, eContour);

    // =========================================================================
    // 1B. REAL COVERAGE RANGE RINGS & 3D DISTANCE CALLOUTS (km) ON THE 3D DOME
    // =========================================================================
    const maxKm = calc.linkBudget.maxCoverageRangeKm;
    const strongKm = calc.linkBudget.strongCoverageRangeKm;
    const secKm = calc.linkBudget.secondaryCoverageRangeKm;
    const targetKm = params.linkDistanceKm || 12;

    const formatKm = (km: number) =>
      km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;

    // Ground Radar Range Rings in km (at y = -1.64) showing 50%, 70.7% (-3dB), and 100% Max Coverage
    const ringFractions = [
      { frac: 0.5, label: `${formatKm(maxKm * 0.5)} (50%)`, color: 0x00e5ff, hex: '#00E5FF' },
      { frac: 0.707, label: `${formatKm(strongKm)} (-3dB)`, color: 0x10b981, hex: '#10B981' },
      { frac: 1.0, label: `${formatKm(maxKm)} (Maks)`, color: 0xff3366, hex: '#FF3366' },
    ];

    ringFractions.forEach(({ frac, label, color, hex }, idx) => {
      const rRing = maxRadius * frac;
      const pts: THREE.Vector3[] = [];
      const segs = 96;
      for (let s = 0; s <= segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.sin(a) * rRing, -1.64, Math.cos(a) * rRing));
      }
      const ringLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: idx === 2 ? 0.55 : 0.35,
        })
      );
      this.lobeGroup.add(ringLine);

      // Place compact km ring marker along the diagonal radar axis
      const angleRad = Math.PI * 0.22 + idx * 0.14;
      const badge = createLabelSprite(label, undefined, hex, 0.52);
      badge.position.set(
        Math.sin(angleRad) * rRing,
        -1.52,
        Math.cos(angleRad) * rRing
      );
      this.lobeGroup.add(badge);
    });

    // Main Lobe Peak Coverage Callout on the 3D Dome Surface
    if (built.isOmnidirectional) {
      // Omnidirectional Dome: Peak Horizon Rim on +X and +Z
      const hAmpX = evaluateDirectionalPatternVec(params.antennaType, params, 1, 0, 0);
      const peakX = hAmpX * maxRadius;
      const halfPowerAngle = ((calc.hpbwEDeg * 0.5) * Math.PI) / 180;
      const hpY = Math.sin(halfPowerAngle);
      const hpX = Math.cos(halfPowerAngle);
      const hpAmp = evaluateDirectionalPatternVec(params.antennaType, params, hpX, hpY, 0);

      this.lobeGroup.add(
        createPointCallout(
          new THREE.Vector3(peakX, 0, 0),
          new THREE.Vector3(0.55, 0.48, 0),
          `Jangkauan Maks: ${formatKm(maxKm)}`,
          `Radius 360° • +${calc.gainDbi.toFixed(1)} dBi (EIRP +${calc.linkBudget.eirpDbm.toFixed(1)} dBm)`,
          '#FF3366',
          0.66
        ),
        createPointCallout(
          new THREE.Vector3(hpX * hpAmp * maxRadius, hpY * hpAmp * maxRadius, 0),
          new THREE.Vector3(0.48, 0.42, 0),
          `Zona Kuat (-3dB): ${formatKm(strongKm)}`,
          `Sinyal Stabil • Sudut Elevasi ${calc.hpbwEDeg.toFixed(0)}°`,
          '#10B981',
          0.62
        )
      );

      // Target Link Distance Beacon on +Z axis
      const targetRatio = Math.max(0.22, Math.min(1.12, targetKm / Math.max(0.1, maxKm)));
      const targetZ = targetRatio * peakX;
      const beaconMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.022, 12, 28),
        new THREE.MeshBasicMaterial({ color: 0xffb300 })
      );
      beaconMesh.rotation.x = Math.PI / 2;
      beaconMesh.position.set(0, 0, targetZ);
      this.lobeGroup.add(beaconMesh);

      this.lobeGroup.add(
        createPointCallout(
          new THREE.Vector3(0, 0, targetZ),
          new THREE.Vector3(-0.45, 0.45, 0.25),
          `Target Uji RX: ${formatKm(targetKm)}`,
          `Signal ${calc.linkBudget.rxPowerDbm.toFixed(1)} dBm • SNR +${calc.linkBudget.snrMarginDb.toFixed(1)} dB`,
          '#FFB300',
          0.62
        )
      );
    } else {
      // Directional Dome: Peak Tip along +Z Boresight
      const peakAmp = evaluateDirectionalPatternVec(params.antennaType, params, 0, 0, 1);
      const peakZ = peakAmp * maxRadius;

      // Half-power (-3dB) shoulder point on the 3D dome
      const halfBeamRad = (Math.min(60, calc.hpbwHDeg * 0.5) * Math.PI) / 180;
      const shX = Math.sin(halfBeamRad);
      const shZ = Math.cos(halfBeamRad);
      const shAmp = evaluateDirectionalPatternVec(params.antennaType, params, shX, 0, shZ);

      // Back lobe point along -Z
      const backAmp = evaluateDirectionalPatternVec(params.antennaType, params, 0, 0, -1);
      const backZ = -backAmp * maxRadius;

      // Target Link Distance Beacon along +Z Boresight
      const targetRatio = Math.max(0.24, Math.min(1.12, targetKm / Math.max(0.1, maxKm)));
      const targetZ = targetRatio * peakZ;
      const beaconMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.024, 12, 28),
        new THREE.MeshBasicMaterial({ color: 0xffb300 })
      );
      beaconMesh.position.set(0, 0, targetZ);
      this.lobeGroup.add(beaconMesh);

      this.lobeGroup.add(
        createPointCallout(
          new THREE.Vector3(0, 0, peakZ),
          new THREE.Vector3(0.25, 0.58, 0.35),
          `Jangkauan Maks: ${formatKm(maxKm)}`,
          `Puncak Kubah +Z (+${calc.gainDbi.toFixed(1)} dBi • EIRP +${calc.linkBudget.eirpDbm.toFixed(1)} dBm)`,
          '#FF3366',
          0.68
        ),
        createPointCallout(
          new THREE.Vector3(shX * shAmp * maxRadius, 0, shZ * shAmp * maxRadius),
          new THREE.Vector3(0.55, 0.38, 0),
          `Zona Kuat (-3dB): ${formatKm(strongKm)}`,
          `Lebar Berkas ${calc.hpbwEDeg.toFixed(0)}° × ${calc.hpbwHDeg.toFixed(0)}°`,
          '#10B981',
          0.62
        ),
        createPointCallout(
          new THREE.Vector3(0, 0, targetZ),
          new THREE.Vector3(-0.55, -0.42, 0),
          `Target Uji RX: ${formatKm(targetKm)}`,
          `Signal ${calc.linkBudget.rxPowerDbm.toFixed(1)} dBm • SNR +${calc.linkBudget.snrMarginDb.toFixed(1)} dB`,
          '#FFB300',
          0.62
        ),
        createPointCallout(
          new THREE.Vector3(0, 0, backZ),
          new THREE.Vector3(-0.45, 0.42, -0.35),
          `Sisi Belakang: ${formatKm(secKm)}`,
          `Redaman F/B -${calc.frontToBackDb.toFixed(0)} dB`,
          '#00E5FF',
          0.56
        )
      );
    }

    // Burst Shockwave Mesh (cloned from lobeGeo so shockwave matches exact antenna radiation shape!)
    const burstMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.burstShellMesh = new THREE.Mesh(lobeGeo.clone(), burstMat);
    this.signalBoomGroup.add(this.burstShellMesh);

    // =========================================================================
    // 2. SIGNAL BOOM ANIMATION (Boom Element Halos + Expanding Wavefront Rings + Particles)
    // =========================================================================
    // 2A. Boom Excitation Halos along Yagi Directors / Helical Turns / Dish Aperture
    built.boomNodes.forEach((node) => {
      const ringColor =
        node.role === 'reflector'
          ? 0xff3366
          : node.role === 'driven'
          ? 0x00e5ff
          : 0x10b981;
      const haloGeo = new THREE.RingGeometry(
        Math.max(0.14, node.width * 0.28),
        Math.max(0.2, node.width * 0.34),
        36
      );
      const haloMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.copy(node.position);
      if (built.isOmnidirectional) {
        haloMesh.rotation.x = Math.PI / 2;
      }
      this.signalBoomGroup.add(haloMesh);
      this.boomHalos.push({
        mesh: haloMesh,
        baseScale: 1.0,
        phaseDelay: node.phaseDelay,
        zPos: node.position.z,
      });
    });

    // 2B. Expanding Directional Wavefront Pulse Rings (Horizontal & Elevation Wavefronts)
    const numWaveRings = 7;
    const ringSegs = 96;
    for (let rIdx = 0; rIdx < numWaveRings; rIdx++) {
      // Horizontal XZ Wavefront Ring
      const hDirs: THREE.Vector3[] = [];
      const hDummyPts: THREE.Vector3[] = [];
      for (let s = 0; s < ringSegs; s++) {
        const a = (s / ringSegs) * Math.PI * 2;
        const dx = Math.sin(a);
        const dz = Math.cos(a);
        const amp = evaluateDirectionalPatternVec(params.antennaType, params, dx, 0, dz);
        hDirs.push(new THREE.Vector3(dx * amp * maxRadius * 1.25, 0, dz * amp * maxRadius * 1.25));
        hDummyPts.push(new THREE.Vector3());
      }
      const hLineGeo = new THREE.BufferGeometry().setFromPoints(hDummyPts);
      const hLineMat = new THREE.LineBasicMaterial({
        color: rIdx % 2 === 0 ? 0x00e5ff : 0x10b981,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });
      const hLoop = new THREE.LineLoop(hLineGeo, hLineMat);
      this.signalBoomGroup.add(hLoop);
      this.wavefrontRings.push({
        line: hLoop,
        baseDirs: hDirs,
        plane: 'horizontal',
        phaseOffset: rIdx / numWaveRings,
      });

      // Vertical YZ Wavefront Ring
      const vDirs: THREE.Vector3[] = [];
      const vDummyPts: THREE.Vector3[] = [];
      for (let s = 0; s < ringSegs; s++) {
        const a = (s / ringSegs) * Math.PI * 2;
        const dy = Math.sin(a);
        const dz = Math.cos(a);
        const amp = evaluateDirectionalPatternVec(params.antennaType, params, 0, dy, dz);
        vDirs.push(new THREE.Vector3(0, dy * amp * maxRadius * 1.25, dz * amp * maxRadius * 1.25));
        vDummyPts.push(new THREE.Vector3());
      }
      const vLineGeo = new THREE.BufferGeometry().setFromPoints(vDummyPts);
      const vLineMat = new THREE.LineBasicMaterial({
        color: 0xffb300,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
      });
      const vLoop = new THREE.LineLoop(vLineGeo, vLineMat);
      this.signalBoomGroup.add(vLoop);
      this.wavefrontRings.push({
        line: vLoop,
        baseDirs: vDirs,
        plane: 'vertical',
        phaseOffset: (rIdx + 0.5) / numWaveRings,
      });
    }

    // 2C. Directional Signal Boom Photon Stream Particles
    this.particlePositions = new Float32Array(this.PARTICLE_COUNT * 3);
    this.particleDirs = new Float32Array(this.PARTICLE_COUNT * 3);
    this.particlePhases = new Float32Array(this.PARTICLE_COUNT);
    this.particleSpeeds = new Float32Array(this.PARTICLE_COUNT);
    const particleColors = new Float32Array(this.PARTICLE_COUNT * 3);

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      // Sample direction biased toward stronger radiation lobes
      let dx = 0;
      let dy = 0;
      let dz = 1;
      let amp = 0.1;

      for (let attempt = 0; attempt < 6; attempt++) {
        const u = Math.random() * 2 - 1;
        const phi = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        dx = s * Math.cos(phi);
        dy = u;
        dz = s * Math.sin(phi);
        amp = evaluateDirectionalPatternVec(params.antennaType, params, dx, dy, dz);
        if (Math.random() < amp * amp + 0.08) break;
      }

      const reach = amp * maxRadius * 1.38;
      this.particleDirs[i * 3] = dx * reach;
      this.particleDirs[i * 3 + 1] = dy * reach;
      this.particleDirs[i * 3 + 2] = dz * reach;
      this.particlePhases[i] = Math.random();
      this.particleSpeeds[i] = 0.35 + amp * 0.45;

      amplitudeToHeatmapColor(amp, tmpColor);
      particleColors[i * 3] = tmpColor.r;
      particleColors[i * 3 + 1] = tmpColor.g;
      particleColors[i * 3 + 2] = tmpColor.b;
    }

    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    partGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const partMat = new THREE.PointsMaterial({
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particlePoints = new THREE.Points(partGeo, partMat);
    this.signalBoomGroup.add(this.particlePoints);

    // =========================================================================
    // 3. ORTHOGONAL E-FIELD (Cyan) & H-FIELD (Amber) PROPAGATION WAVE VECTORS
    // =========================================================================
    const ePts = new Array(this.WAVE_SAMPLES).fill(0).map(() => new THREE.Vector3());
    const hPts = new Array(this.WAVE_SAMPLES).fill(0).map(() => new THREE.Vector3());

    this.eFieldGeo = new THREE.BufferGeometry().setFromPoints(ePts);
    this.hFieldGeo = new THREE.BufferGeometry().setFromPoints(hPts);

    this.eFieldLine = new THREE.Line(
      this.eFieldGeo,
      new THREE.LineBasicMaterial({ color: 0x00e5ff, linewidth: 2 })
    );
    this.hFieldLine = new THREE.Line(
      this.hFieldGeo,
      new THREE.LineBasicMaterial({ color: 0xffb300, linewidth: 2 })
    );
    this.ehVectorsGroup.add(this.eFieldLine, this.hFieldLine);

    const eLabel = createLabelSprite('E-Field (V/m)', 'Electric Wave', '#00E5FF', 0.68);
    eLabel.position.set(0, 0.85, 3.6);
    const hLabel = createLabelSprite('H-Field (A/m)', 'Magnetic Wave', '#FFB300', 0.68);
    hLabel.position.set(0.85, 0, 3.6);
    this.ehVectorsGroup.add(eLabel, hLabel);

    this.syncVisibility(visConfig);
  }

  /**
   * Updates visibility and opacity without rebuilding geometry
   */
  public syncVisibility(visConfig: VisualSimulationConfig) {
    this.lobeGroup.visible = visConfig.showRadiationLobe;
    this.signalBoomGroup.visible = visConfig.showSignalBoom;
    this.ehVectorsGroup.visible = visConfig.showEHFieldVectors;

    const lobeSurface = this.lobeGroup.getObjectByName('lobeSurface') as THREE.Mesh | undefined;
    if (lobeSurface && lobeSurface.material instanceof THREE.MeshStandardMaterial) {
      lobeSurface.material.opacity = visConfig.lobeOpacity;
    }
  }

  /**
   * Per-frame 60 FPS electromagnetic wave and Signal Boom animation update
   */
  public update(deltaSeconds: number, visConfig: VisualSimulationConfig) {
    if (!this.currentParams || !this.currentBuilt) return;

    if (visConfig.isPlaying) {
      this.elapsedTime += deltaSeconds * visConfig.waveSpeed;
    }

    const t = this.elapsedTime;
    const powerScale = visConfig.signalPowerIntensity || 1.0;

    // 1. Animate Boom Excitation Halos (sequential traveling wave down the boom!)
    for (const halo of this.boomHalos) {
      const wave = 0.5 + 0.5 * Math.sin(t * 5.2 - halo.phaseDelay * 2.2);
      const boost = this.burstProgress > 0 ? 1.45 : 1.0;
      const s = (0.85 + 0.45 * wave * powerScale) * boost;
      halo.mesh.scale.set(s, s, 1);
      const mat = halo.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.2 + 0.68 * wave) * Math.min(1.2, powerScale);
    }

    // 2. Animate Expanding Directional Wavefront Rings
    for (const wf of this.wavefrontRings) {
      const cycle = (t * 0.42 + wf.phaseOffset) % 1.0;
      const posAttr = wf.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      const easeRadius = Math.pow(cycle, 0.85) * powerScale;

      for (let i = 0; i < wf.baseDirs.length; i++) {
        const dir = wf.baseDirs[i];
        posAttr.setXYZ(i, dir.x * easeRadius, dir.y * easeRadius, dir.z * easeRadius);
      }
      posAttr.needsUpdate = true;

      const mat = wf.line.material as THREE.LineBasicMaterial;
      // Fade in near antenna, fade out smoothly at far field edge
      const fade = Math.sin(cycle * Math.PI);
      mat.opacity = fade * (wf.plane === 'horizontal' ? 0.78 : 0.46);
    }

    // 3. Animate Photon / Signal Boom Particle Stream
    if (this.particlePoints) {
      const posAttr = this.particlePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      const origin = this.currentBuilt.feedPoint;

      for (let i = 0; i < this.PARTICLE_COUNT; i++) {
        const p = (this.particlePhases[i] + t * this.particleSpeeds[i]) % 1.0;
        const dx = this.particleDirs[i * 3];
        const dy = this.particleDirs[i * 3 + 1];
        const dz = this.particleDirs[i * 3 + 2];

        posAttr.setXYZ(
          i,
          origin.x + dx * p * powerScale,
          origin.y + dy * p * powerScale,
          origin.z + dz * p * powerScale
        );
      }
      posAttr.needsUpdate = true;
    }

    // 4. Animate Burst Shockwave Shell when user triggers "Signal Boom Burst"
    if (this.burstShellMesh) {
      const mat = this.burstShellMesh.material as THREE.MeshBasicMaterial;
      if (this.burstProgress >= 0) {
        this.burstProgress += deltaSeconds * 0.95;
        if (this.burstProgress >= 1.0) {
          this.burstProgress = -1;
          mat.opacity = 0;
        } else {
          const s = 0.15 + this.burstProgress * 1.45;
          this.burstShellMesh.scale.set(s, s, s);
          mat.opacity = (1 - this.burstProgress) * 0.85;
        }
      }
    }

    // 5. Animate Orthogonal E-Field & H-Field Wave Vectors along propagation axis (+Z)
    if (this.eFieldGeo && this.hFieldGeo && visConfig.showEHFieldVectors) {
      const ePos = this.eFieldGeo.getAttribute('position') as THREE.BufferAttribute;
      const hPos = this.hFieldGeo.getAttribute('position') as THREE.BufferAttribute;
      const isCircular = this.currentParams.antennaType === 'helical';
      const handedSign = this.currentParams.helicalHandedness === 'LHCP' ? -1 : 1;
      const startZ = this.currentBuilt.isOmnidirectional ? 0.25 : 0.4;
      const waveLenZ = 4.2;
      const amp = 0.52 * powerScale;

      for (let i = 0; i < this.WAVE_SAMPLES; i++) {
        const frac = i / (this.WAVE_SAMPLES - 1);
        const z = startZ + frac * waveLenZ;
        const phase = frac * Math.PI * 5 - t * 6.5;
        const envelope = Math.sin(Math.min(1, frac * 3.5) * (Math.PI / 2));

        if (isCircular) {
          // Corkscrew circular polarization for Helical antenna
          const ex = Math.cos(handedSign * phase) * amp * envelope;
          const ey = Math.sin(handedSign * phase) * amp * envelope;
          const hx = -ey * 0.85;
          const hy = ex * 0.85;
          ePos.setXYZ(i, ex, ey, z);
          hPos.setXYZ(i, hx, hy, z);
        } else {
          // Linear orthogonal E (vertical Y) & H (horizontal X) waves
          const val = Math.sin(phase) * amp * envelope;
          ePos.setXYZ(i, 0, val, z);
          hPos.setXYZ(i, val * 0.85, 0, z);
        }
      }
      ePos.needsUpdate = true;
      hPos.needsUpdate = true;
    }
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }
  }
}
