import * as THREE from 'three';
import {
  AntennaCalculationResult,
  AntennaParams,
} from '../../types/antenna';
import { formatCompactLength } from '../../engine/antennaCalculator';
import {
  createDimensionCallout,
  createLabelSprite,
  createPointCallout,
} from './dimensionHelper';

export interface BoomExcitationNode {
  position: THREE.Vector3;
  width: number;
  phaseDelay: number;
  role: 'reflector' | 'driven' | 'director' | 'aperture';
}

export interface BuiltAntenna3D {
  meshGroup: THREE.Group;
  dimensionsGroup: THREE.Group;
  feedPoint: THREE.Vector3;
  boomStart: THREE.Vector3;
  boomEnd: THREE.Vector3;
  boomNodes: BoomExcitationNode[];
  isOmnidirectional: boolean;
}

/**
 * Shared physical materials for realistic RF hardware rendering
 */
function createHardwareMaterials() {
  return {
    copper: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E07A3C'),
      metalness: 0.85,
      roughness: 0.22,
    }),
    brightBrass: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#F5B841'),
      metalness: 0.88,
      roughness: 0.18,
    }),
    aluminum: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#CBD5E1'),
      metalness: 0.82,
      roughness: 0.26,
    }),
    darkAnodized: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1E293B'),
      metalness: 0.65,
      roughness: 0.4,
    }),
    insulatorDelrin: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0F172A'),
      metalness: 0.2,
      roughness: 0.6,
    }),
    drivenGlow: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#00E5FF'),
      emissive: new THREE.Color('#00E5FF'),
      emissiveIntensity: 0.42,
      metalness: 0.7,
      roughness: 0.2,
    }),
    reflectorTint: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#F43F5E'),
      emissive: new THREE.Color('#F43F5E'),
      emissiveIntensity: 0.18,
      metalness: 0.8,
      roughness: 0.25,
    }),
    pcbSubstrate: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#065F46'),
      metalness: 0.1,
      roughness: 0.35,
      transmission: 0.15,
      transparent: true,
      opacity: 0.94,
    }),
    coaxJacket: new THREE.MeshStandardMaterial({
      color: new THREE.Color('#090D16'),
      metalness: 0.3,
      roughness: 0.7,
    }),
  };
}

/**
 * Builds the 3D parametric antenna model and comprehensive 3D CAD dimension overlays
 * (per-element lengths, element-to-element spacings, cumulative boom coordinates, and hardware specs).
 */
export function buildAntenna3D(
  params: AntennaParams,
  calc: AntennaCalculationResult
): BuiltAntenna3D {
  const meshGroup = new THREE.Group();
  const dimensionsGroup = new THREE.Group();
  const mats = createHardwareMaterials();

  const lambdaM = calc.wavelengthMeters;
  const LAMBDA_SCENE = 3.2;

  const boomNodes: BoomExcitationNode[] = [];
  let feedPoint = new THREE.Vector3(0, 0, 0);
  let boomStart = new THREE.Vector3(0, 0, 0);
  let boomEnd = new THREE.Vector3(0, 0, 2.5);
  let isOmnidirectional = false;

  switch (params.antennaType) {
    case 'dipole': {
      isOmnidirectional = true;
      const totalMeters = calc.cutSheet[0]?.valueMeters || lambdaM * 0.475;
      const armMeters = calc.cutSheet[1]?.valueMeters || totalMeters * 0.49;
      const gapMeters = calc.cutSheet[3]?.valueMeters || lambdaM * 0.008;

      const totalScene = (totalMeters / lambdaM) * LAMBDA_SCENE * 1.45;
      const gapScene = 0.14;
      const armScene = (totalScene - gapScene) / 2;
      const rodRadius = Math.max(
        0.032,
        Math.min(0.08, (params.conductorDiameterMm / 1000 / lambdaM) * LAMBDA_SCENE * 2.5)
      );

      // Upper Arm (Hot / Center conductor) along +Y
      const upperGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, armScene, 24);
      const upperMesh = new THREE.Mesh(upperGeo, mats.copper);
      upperMesh.position.set(0, gapScene / 2 + armScene / 2, 0);
      meshGroup.add(upperMesh);

      // Lower Arm (Cold / Shield) along -Y
      const lowerMesh = new THREE.Mesh(upperGeo, mats.copper);
      lowerMesh.position.set(0, -(gapScene / 2 + armScene / 2), 0);
      meshGroup.add(lowerMesh);

      // End caps
      const capGeo = new THREE.SphereGeometry(rodRadius * 1.25, 16, 16);
      const topCap = new THREE.Mesh(capGeo, mats.brightBrass);
      topCap.position.set(0, totalScene / 2, 0);
      const botCap = new THREE.Mesh(capGeo, mats.brightBrass);
      botCap.position.set(0, -totalScene / 2, 0);
      meshGroup.add(topCap, botCap);

      // Center Balun Box
      const balunGeo = new THREE.BoxGeometry(0.26, 0.24, 0.22);
      const balunMesh = new THREE.Mesh(balunGeo, mats.insulatorDelrin);
      meshGroup.add(balunMesh);

      // Glowing RF Feed Ring at center
      const feedRingGeo = new THREE.TorusGeometry(0.14, 0.025, 12, 32);
      const feedRing = new THREE.Mesh(feedRingGeo, mats.drivenGlow);
      feedRing.rotation.x = Math.PI / 2;
      meshGroup.add(feedRing);

      // Coaxial Feedline extending horizontally backward (-Z)
      const coaxCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, -0.11),
        new THREE.Vector3(0, -0.15, -0.65),
        new THREE.Vector3(0, -0.85, -1.1),
        new THREE.Vector3(0, -1.6, -1.2),
      ]);
      const coaxGeo = new THREE.TubeGeometry(coaxCurve, 24, 0.035, 12, false);
      meshGroup.add(new THREE.Mesh(coaxGeo, mats.coaxJacket));

      boomNodes.push({
        position: new THREE.Vector3(0, 0, 0),
        width: totalScene,
        phaseDelay: 0,
        role: 'driven',
      });

      // Comprehensive 3D Dimensions for Dipole
      dimensionsGroup.add(
        createDimensionCallout(
          new THREE.Vector3(0, -totalScene / 2, 0),
          new THREE.Vector3(0, totalScene / 2, 0),
          new THREE.Vector3(0.78, 0, 0),
          `L_total = ${formatCompactLength(totalMeters)}`,
          `0.475 λ Total Span (VF=${params.velocityFactor})`,
          '#00E5FF',
          0.74
        ),
        createDimensionCallout(
          new THREE.Vector3(0, gapScene / 2, 0),
          new THREE.Vector3(0, totalScene / 2, 0),
          new THREE.Vector3(-0.68, 0, 0),
          `Arm 1 (Hot) = ${formatCompactLength(armMeters)}`,
          `0.238 λ Upper Radiator`,
          '#FFB300',
          0.68
        ),
        createDimensionCallout(
          new THREE.Vector3(0, -totalScene / 2, 0),
          new THREE.Vector3(0, -gapScene / 2, 0),
          new THREE.Vector3(-0.68, 0, 0),
          `Arm 2 (Gnd) = ${formatCompactLength(armMeters)}`,
          `0.238 λ Lower Radiator`,
          '#10B981',
          0.68
        ),
        createPointCallout(
          new THREE.Vector3(0, 0, 0.12),
          new THREE.Vector3(0, 0.25, 0.72),
          `Feed Gap = ${formatCompactLength(gapMeters)}`,
          `Balun 1:1 • Z = 72.8 Ω • Ø ${params.conductorDiameterMm.toFixed(1)}mm`,
          '#FF3366',
          0.65
        )
      );
      break;
    }

    case 'groundplane': {
      isOmnidirectional = true;
      const vertMeters = calc.cutSheet[0]?.valueMeters || lambdaM * 0.238;
      const radMeters = calc.cutSheet[1]?.valueMeters || lambdaM * 0.255;
      const spanMeters = calc.cutSheet[2]?.valueMeters || radMeters * 1.414;
      const droopDeg = params.gpRadialAngleDeg ?? 45;
      const droopRad = (droopDeg * Math.PI) / 180;

      const scaleFactor = LAMBDA_SCENE * 1.55;
      const vertLen = (vertMeters / lambdaM) * scaleFactor;
      const radLen = (radMeters / lambdaM) * scaleFactor;
      const rodR = 0.036;

      // Vertical quarter-wave whip (+Y)
      const whipGeo = new THREE.CylinderGeometry(rodR * 0.75, rodR, vertLen, 20);
      const whipMesh = new THREE.Mesh(whipGeo, mats.copper);
      whipMesh.position.set(0, vertLen / 2 + 0.08, 0);
      meshGroup.add(whipMesh);

      const tipCap = new THREE.Mesh(
        new THREE.SphereGeometry(rodR * 1.3, 14, 14),
        mats.drivenGlow
      );
      tipCap.position.set(0, vertLen + 0.08, 0);
      meshGroup.add(tipCap);

      // SO-239 / N-Female Brass Base Flange
      const flangeGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.07, 24);
      const flangeMesh = new THREE.Mesh(flangeGeo, mats.brightBrass);
      meshGroup.add(flangeMesh);

      const insulatorCone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.13, 0.12, 20),
        mats.drivenGlow
      );
      insulatorCone.position.set(0, 0.06, 0);
      meshGroup.add(insulatorCone);

      // 4 Drooping Radials at 45, 135, 225, 315 deg around Y
      const radialTipPositions: THREE.Vector3[] = [];
      for (let i = 0; i < 4; i++) {
        const az = (i * Math.PI) / 2 + Math.PI / 4;
        const radialPivot = new THREE.Group();
        radialPivot.rotation.y = az;

        const endX = Math.cos(droopRad) * radLen;
        const endY = -Math.sin(droopRad) * radLen;
        const startPt = new THREE.Vector3(0.16, -0.02, 0);
        const endPt = new THREE.Vector3(0.16 + endX, -0.02 + endY, 0);

        const curve = new THREE.LineCurve3(startPt, endPt);
        const tubeGeo = new THREE.TubeGeometry(curve, 8, rodR * 0.85, 12, false);
        const radMesh = new THREE.Mesh(tubeGeo, mats.aluminum);
        radialPivot.add(radMesh);

        const endBall = new THREE.Mesh(
          new THREE.SphereGeometry(rodR * 1.15, 12, 12),
          mats.brightBrass
        );
        endBall.position.copy(endPt);
        radialPivot.add(endBall);

        meshGroup.add(radialPivot);

        // Compute world tip position for callouts
        radialTipPositions.push(
          new THREE.Vector3(
            Math.cos(az) * (0.16 + endX),
            -0.02 + endY,
            -Math.sin(az) * (0.16 + endX)
          )
        );
      }

      // Support Mast underneath
      const mastGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.4, 16);
      const mastMesh = new THREE.Mesh(mastGeo, mats.darkAnodized);
      mastMesh.position.set(0, -0.74, 0);
      meshGroup.add(mastMesh);

      boomNodes.push({
        position: new THREE.Vector3(0, 0.2, 0),
        width: vertLen,
        phaseDelay: 0,
        role: 'driven',
      });

      dimensionsGroup.add(
        createDimensionCallout(
          new THREE.Vector3(0, 0.08, 0),
          new THREE.Vector3(0, vertLen + 0.08, 0),
          new THREE.Vector3(0.65, 0, 0),
          `Whip L = ${formatCompactLength(vertMeters)}`,
          `0.238 λ Vertical Radiator (Ø ${params.conductorDiameterMm.toFixed(1)}mm)`,
          '#00E5FF',
          0.7
        ),
        createDimensionCallout(
          new THREE.Vector3(0.11, -0.02, -0.11),
          radialTipPositions[0],
          new THREE.Vector3(0.32, 0.28, 0),
          `Radial R1..R4 = ${formatCompactLength(radMeters)}`,
          `0.255 λ × 4 Rods (90° Cross Spacing)`,
          '#10B981',
          0.68
        ),
        createDimensionCallout(
          radialTipPositions[0],
          radialTipPositions[2],
          new THREE.Vector3(0, -0.42, 0),
          `Footprint Ø = ${formatCompactLength(spanMeters)}`,
          `Tip-to-Tip Horizontal Span`,
          '#FFB300',
          0.68
        ),
        createPointCallout(
          new THREE.Vector3(0, 0.05, 0.18),
          new THREE.Vector3(-0.65, 0.25, 0.55),
          `Droop θ = ${droopDeg}° → Z = ${calc.impedanceOhms.toFixed(0)} Ω`,
          `SO-239 Coax Feedpoint`,
          '#FF3366',
          0.64
        )
      );
      break;
    }

    case 'jpole': {
      isOmnidirectional = true;
      const longMeters = calc.cutSheet[0]?.valueMeters || 0.712 * lambdaM;
      const radMeters = calc.cutSheet[1]?.valueMeters || 0.474 * lambdaM;
      const stubMeters = calc.cutSheet[2]?.valueMeters || 0.238 * lambdaM;
      const gapMeters = calc.cutSheet[3]?.valueMeters || 0.03 * lambdaM;
      const tapMeters = calc.cutSheet[4]?.valueMeters || 0.034 * lambdaM;

      const totalSceneH = 3.35;
      const scaleToScene = totalSceneH / longMeters;
      const stubSceneH = stubMeters * scaleToScene;
      const radSceneH = radMeters * scaleToScene;
      // Exaggerate horizontal gap slightly in 3D scene so the J-stub & tap bridge are clearly visible
      const gapScene = Math.max(0.28, Math.min(0.56, (gapMeters / lambdaM) * 8.5));
      const tapSceneH = Math.max(0.2, tapMeters * scaleToScene * 1.35);

      const yBottom = -totalSceneH * 0.44;
      const yStubTop = yBottom + stubSceneH;
      const yLongTop = yBottom + totalSceneH;
      const xLong = gapScene / 2;
      const xStub = -gapScene / 2;
      const pipeR = 0.042;

      feedPoint = new THREE.Vector3(0, yBottom + tapSceneH, 0);

      // 1. Long Vertical Copper Pipe (3/4 λ total: bottom 1/4 λ stub + upper 1/2 λ radiator)
      const longGeo = new THREE.CylinderGeometry(pipeR, pipeR, totalSceneH, 24);
      const longMesh = new THREE.Mesh(longGeo, mats.copper);
      longMesh.position.set(xLong, yBottom + totalSceneH / 2, 0);
      meshGroup.add(longMesh);

      // Top brass cap on main radiator
      const topCap = new THREE.Mesh(
        new THREE.SphereGeometry(pipeR * 1.25, 16, 16),
        mats.brightBrass
      );
      topCap.position.set(xLong, yLongTop, 0);
      meshGroup.add(topCap);

      // 2. Short Parallel Matching Stub Pipe (1/4 λ)
      const stubGeo = new THREE.CylinderGeometry(pipeR, pipeR, stubSceneH, 24);
      const stubMesh = new THREE.Mesh(stubGeo, mats.brightBrass);
      stubMesh.position.set(xStub, yBottom + stubSceneH / 2, 0);
      meshGroup.add(stubMesh);

      const stubCap = new THREE.Mesh(
        new THREE.SphereGeometry(pipeR * 1.25, 16, 16),
        mats.brightBrass
      );
      stubCap.position.set(xStub, yStubTop, 0);
      meshGroup.add(stubCap);

      // 3. Bottom Shorting Bar / Copper Tee-Elbow Bridge
      const shortBarGeo = new THREE.BoxGeometry(gapScene + pipeR * 2.8, pipeR * 2.4, pipeR * 2.4);
      const shortBarMesh = new THREE.Mesh(shortBarGeo, mats.copper);
      shortBarMesh.position.set(0, yBottom, 0);
      meshGroup.add(shortBarMesh);

      // Upper insulator spacer between stub and main pipe (Delrin stabilizer)
      const spacerGeo = new THREE.BoxGeometry(gapScene, 0.045, 0.055);
      const spacerMesh = new THREE.Mesh(spacerGeo, mats.insulatorDelrin);
      spacerMesh.position.set(0, yStubTop - 0.08, 0);
      meshGroup.add(spacerMesh);

      // 4. 50-Ohm Adjustable Feed Tap Clamps & Glowing Excitation Bridge
      const tapY = yBottom + tapSceneH;
      const clampGeo = new THREE.CylinderGeometry(pipeR * 1.45, pipeR * 1.45, 0.08, 20);
      const clampLong = new THREE.Mesh(clampGeo, mats.drivenGlow);
      clampLong.position.set(xLong, tapY, 0);
      const clampStub = new THREE.Mesh(clampGeo, mats.drivenGlow);
      clampStub.position.set(xStub, tapY, 0);
      meshGroup.add(clampLong, clampStub);

      const tapBridge = new THREE.Mesh(
        new THREE.BoxGeometry(gapScene, 0.035, 0.045),
        mats.insulatorDelrin
      );
      tapBridge.position.set(0, tapY, 0.05);
      meshGroup.add(tapBridge);

      const feedRing = new THREE.Mesh(
        new THREE.TorusGeometry(gapScene * 0.62, 0.02, 12, 32),
        mats.drivenGlow
      );
      feedRing.position.set(0, tapY, 0);
      meshGroup.add(feedRing);

      // Coaxial cable + 4-turn Choke Balun below feed tap
      for (let c = 0; c < 4; c++) {
        const chokeTurn = new THREE.Mesh(
          new THREE.TorusGeometry(0.11, 0.022, 10, 24),
          mats.coaxJacket
        );
        chokeTurn.position.set(xLong + 0.14, tapY - 0.16 - c * 0.045, 0.08);
        meshGroup.add(chokeTurn);
      }

      // 5. Lower Metallic Support Mast bolted below DC-grounded shorting bar
      const mastGeo = new THREE.CylinderGeometry(0.052, 0.052, 1.15, 18);
      const mastMesh = new THREE.Mesh(mastGeo, mats.darkAnodized);
      mastMesh.position.set(xLong, yBottom - 0.58, 0);
      meshGroup.add(mastMesh);

      boomNodes.push(
        {
          position: new THREE.Vector3(xLong, yStubTop + radSceneH * 0.35, 0),
          width: radSceneH,
          phaseDelay: 0,
          role: 'driven',
        },
        {
          position: new THREE.Vector3(0, tapY, 0),
          width: stubSceneH,
          phaseDelay: 0.15,
          role: 'director',
        }
      );

      // 3D CAD Dimension Callouts for J-Pole
      dimensionsGroup.add(
        createDimensionCallout(
          new THREE.Vector3(xLong, yBottom, 0),
          new THREE.Vector3(xLong, yLongTop, 0),
          new THREE.Vector3(0.75, 0, 0),
          `L_long (3/4λ) = ${formatCompactLength(longMeters)}`,
          `${(longMeters / lambdaM).toFixed(3)} λ Total Batang Utama`,
          '#00E5FF',
          0.66
        ),
        createDimensionCallout(
          new THREE.Vector3(xLong, yStubTop, 0),
          new THREE.Vector3(xLong, yLongTop, 0),
          new THREE.Vector3(0.36, 0, 0),
          `L_rad (1/2λ) = ${formatCompactLength(radMeters)}`,
          `${(radMeters / lambdaM).toFixed(3)} λ Radiator Aktif`,
          '#10B981',
          0.62
        ),
        createDimensionCallout(
          new THREE.Vector3(xStub, yBottom, 0),
          new THREE.Vector3(xStub, yStubTop, 0),
          new THREE.Vector3(-0.62, 0, 0),
          `L_stub (1/4λ) = ${formatCompactLength(stubMeters)}`,
          `${(stubMeters / lambdaM).toFixed(3)} λ Matching Stub`,
          '#FFB300',
          0.64
        ),
        createDimensionCallout(
          new THREE.Vector3(xStub, yStubTop, 0),
          new THREE.Vector3(xLong, yStubTop, 0),
          new THREE.Vector3(0, 0.32, 0),
          `Spasi Stub = ${formatCompactLength(gapMeters)}`,
          `Celah S_gap (${(gapMeters / lambdaM).toFixed(3)} λ)`,
          '#A855F7',
          0.6
        ),
        createPointCallout(
          new THREE.Vector3(xStub, tapY, 0.06),
          new THREE.Vector3(-0.68, -0.26, 0.35),
          `Tap 50Ω (H_tap) = ${formatCompactLength(tapMeters)}`,
          `Dari dasar Shorting Bar (${(tapMeters / lambdaM).toFixed(3)} λ)`,
          '#FF3366',
          0.62
        )
      );
      break;
    }

    case 'fiberglass': {
      isOmnidirectional = true;
      const nSec = Math.max(2, Math.min(12, Math.round(params.collinearSectionCount || 4)));
      const radomeMeters = calc.cutSheet[0]?.valueMeters || 2.2 * lambdaM;
      const secMeters = calc.cutSheet[1]?.valueMeters || 0.465 * lambdaM;
      const coilHeightMeters = calc.cutSheet[2]?.valueMeters || 0.085 * lambdaM;
      const baseMeters = calc.cutSheet[3]?.valueMeters || 0.238 * lambdaM;

      const totalSceneH = 3.65;
      const yBottom = -1.65;
      const ferruleH = 0.42;
      const radomeSceneH = totalSceneH - ferruleH;
      const yFerruleTop = yBottom + ferruleH;
      const yRadomeTop = yBottom + totalSceneH;

      feedPoint = new THREE.Vector3(0, yFerruleTop + 0.15, 0);

      // 1. Chromed Brass Base Mounting Ferrule & N-Female Connector
      const ferruleGeo = new THREE.CylinderGeometry(0.115, 0.12, ferruleH, 28);
      const ferruleMesh = new THREE.Mesh(ferruleGeo, mats.aluminum);
      ferruleMesh.position.set(0, yBottom + ferruleH / 2, 0);
      meshGroup.add(ferruleMesh);

      const nConnMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.14, 20),
        mats.brightBrass
      );
      nConnMesh.position.set(0, yBottom - 0.07, 0);
      meshGroup.add(nConnMesh);

      // U-Bolt Mast Brackets & Offset Support Mast Pipe
      for (const clampY of [yBottom + 0.12, yBottom + 0.3]) {
        const bracket = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.055, 0.18),
          mats.darkAnodized
        );
        bracket.position.set(-0.12, clampY, 0);
        meshGroup.add(bracket);
      }
      const sideMast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 1.35, 18),
        mats.darkAnodized
      );
      sideMast.position.set(-0.24, yBottom - 0.18, 0);
      meshGroup.add(sideMast);

      // 2. Semi-Transparent Fiberglass Radome Tube (X-Ray Cutaway so internal phased array is clearly visible!)
      const radomeOuterR = 0.105;
      const radomeMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#E2E8F0'),
        metalness: 0.05,
        roughness: 0.18,
        transmission: 0.55,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
      });
      const radomeGeo = new THREE.CylinderGeometry(
        radomeOuterR * 0.88,
        radomeOuterR,
        radomeSceneH,
        32,
        1,
        true
      );
      const radomeMesh = new THREE.Mesh(radomeGeo, radomeMat);
      radomeMesh.position.set(0, yFerruleTop + radomeSceneH / 2, 0);
      meshGroup.add(radomeMesh);

      // Aerodynamic Top Weather Cap
      const topCapGeo = new THREE.SphereGeometry(radomeOuterR * 0.9, 24, 16);
      const topCapMesh = new THREE.Mesh(topCapGeo, mats.insulatorDelrin);
      topCapMesh.position.set(0, yRadomeTop, 0);
      meshGroup.add(topCapMesh);

      // 3. Internal Stacked Collinear Copper Radiator Sections + Helical Phasing Coils
      const usableInnerH = radomeSceneH - 0.16;
      const baseInnerH = usableInnerH * 0.12;
      const unitSpanH = (usableInnerH - baseInnerH) / nSec;
      const secInnerH = unitSpanH * 0.74;
      const coilInnerH = unitSpanH * 0.26;

      // Bottom λ/4 Feed Rod
      const baseRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.026, baseInnerH, 16),
        mats.copper
      );
      baseRod.position.set(0, yFerruleTop + baseInnerH / 2, 0);
      meshGroup.add(baseRod);

      const feedGlowRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.075, 0.016, 12, 24),
        mats.drivenGlow
      );
      feedGlowRing.rotation.x = Math.PI / 2;
      feedGlowRing.position.set(0, yFerruleTop + 0.05, 0);
      meshGroup.add(feedGlowRing);

      let cursorY = yFerruleTop + baseInnerH;

      for (let i = 0; i < nSec; i++) {
        // Helical λ/4 Phasing Coil between sections
        const coilStartY = cursorY;
        const coilEndY = cursorY + coilInnerH;
        const coilPoints: THREE.Vector3[] = [];
        const coilTurns = 4.5;
        const coilSamples = 36;
        for (let s = 0; s <= coilSamples; s++) {
          const t = s / coilSamples;
          const angle = t * coilTurns * Math.PI * 2;
          coilPoints.push(
            new THREE.Vector3(
              Math.cos(angle) * 0.048,
              coilStartY + t * coilInnerH,
              Math.sin(angle) * 0.048
            )
          );
        }
        const coilCurve = new THREE.CatmullRomCurve3(coilPoints);
        const coilMesh = new THREE.Mesh(
          new THREE.TubeGeometry(coilCurve, 36, 0.011, 8, false),
          mats.brightBrass
        );
        meshGroup.add(coilMesh);

        // Internal Delrin coil form/insulator
        const coilForm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.022, coilInnerH * 0.9, 12),
          mats.insulatorDelrin
        );
        coilForm.position.set(0, coilStartY + coilInnerH / 2, 0);
        meshGroup.add(coilForm);

        // Half-wave (λ/2) Collinear Copper Section Rod
        const secStartY = coilEndY;
        const secEndY = secStartY + secInnerH;
        const secMidY = (secStartY + secEndY) / 2;

        const secRod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.028, secInnerH, 18),
          mats.copper
        );
        secRod.position.set(0, secMidY, 0);
        meshGroup.add(secRod);

        // Glowing phase ring on each collinear section
        const secRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.062, 0.01, 10, 24),
          mats.drivenGlow
        );
        secRing.rotation.x = Math.PI / 2;
        secRing.position.set(0, secMidY, 0);
        meshGroup.add(secRing);

        boomNodes.push({
          position: new THREE.Vector3(0, secMidY, 0),
          width: secInnerH,
          phaseDelay: i * 0.08, // All collinear sections radiate in phase!
          role: i === 0 ? 'driven' : 'director',
        });

        // Show per-section callouts (for first 3 sections and top section if nSec > 4)
        if (nSec <= 5 || i < 2 || i === nSec - 1) {
          const sideSign = i % 2 === 0 ? 1 : -1;
          dimensionsGroup.add(
            createPointCallout(
              new THREE.Vector3(sideSign * 0.03, secMidY, 0),
              new THREE.Vector3(sideSign * 0.62, 0, 0),
              `Seksi S${i + 1}: ${formatCompactLength(secMeters)}`,
              `0.465 λ Radiator • Se-Fase #${i + 1}`,
              '#10B981',
              0.56
            )
          );
        }

        if (i === 0) {
          dimensionsGroup.add(
            createDimensionCallout(
              new THREE.Vector3(0, coilStartY, 0),
              new THREE.Vector3(0, coilEndY, 0),
              new THREE.Vector3(-0.68, 0, 0),
              `Phasing Coil = ${formatCompactLength(coilHeightMeters)}`,
              `Pembalik Fase λ/4 (${nSec}× Kumparan)`,
              '#FFB300',
              0.58
            )
          );
        }

        cursorY = secEndY;
      }

      // Total Fiberglass Radome Height Callout & Base Feed Callout
      dimensionsGroup.add(
        createDimensionCallout(
          new THREE.Vector3(0, yBottom, 0),
          new THREE.Vector3(0, yRadomeTop, 0),
          new THREE.Vector3(0.95, 0, 0),
          `Total Radome = ${formatCompactLength(radomeMeters)}`,
          `${nSec} Seksi Collinear (${(radomeMeters / lambdaM).toFixed(2)} λ)`,
          '#00E5FF',
          0.66
        ),
        createPointCallout(
          new THREE.Vector3(0, yBottom + ferruleH * 0.5, 0.12),
          new THREE.Vector3(-0.68, -0.22, 0.35),
          `Base Feed λ/4 = ${formatCompactLength(baseMeters)}`,
          `Ferrule Logam & Konektor N-Female 50Ω`,
          '#FF3366',
          0.6
        )
      );
      break;
    }

    case 'yagi': {
      isOmnidirectional = false;
      const N = Math.max(3, Math.min(14, Math.round(params.yagiElementCount || 6)));
      const elements = calc.cutSheet.slice(1); // [REF, DRV, D1, D2, ... DN]
      const totalBoomMeters = calc.totalLengthMeters;

      const boomLambda = totalBoomMeters / lambdaM;
      const visualScale = Math.min(LAMBDA_SCENE, 4.5 / Math.max(0.8, boomLambda));
      const totalBoomScene = boomLambda * visualScale;
      const zOffsetStart = -totalBoomScene * 0.44;

      boomStart = new THREE.Vector3(0, 0, zOffsetStart);
      boomEnd = new THREE.Vector3(0, 0, zOffsetStart + totalBoomScene);

      // Square Aluminum Boom along Z axis
      const boomOverhang = 0.22;
      const boomGeo = new THREE.BoxGeometry(0.085, 0.085, totalBoomScene + boomOverhang);
      const boomMesh = new THREE.Mesh(boomGeo, mats.aluminum);
      boomMesh.position.set(0, 0, zOffsetStart + totalBoomScene / 2);
      meshGroup.add(boomMesh);

      // Vertical Mast clamp at balance point
      const mastGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 16);
      const mastMesh = new THREE.Mesh(mastGeo, mats.darkAnodized);
      mastMesh.position.set(0, -0.76, 0);
      meshGroup.add(mastMesh);

      const zSceneCoords: number[] = [];
      const posMetersList: number[] = [];

      elements.forEach((el, idx) => {
        const posM = el.positionMeters ?? 0;
        const zPos = zOffsetStart + (posM / lambdaM) * visualScale;
        const elSpanScene = (el.valueMeters / lambdaM) * visualScale;

        zSceneCoords.push(zPos);
        posMetersList.push(posM);

        const isReflector = idx === 0;
        const isDriven = idx === 1;

        if (isDriven) {
          feedPoint = new THREE.Vector3(0, 0, zPos);
        }

        // Insulator Saddle Clamp on Boom
        const clampGeo = new THREE.BoxGeometry(0.16, 0.13, 0.13);
        const clampMesh = new THREE.Mesh(
          clampGeo,
          isDriven ? mats.drivenGlow : mats.insulatorDelrin
        );
        clampMesh.position.set(0, 0, zPos);
        meshGroup.add(clampMesh);

        if (isDriven) {
          const tubeR = 0.032;
          const halfSpan = elSpanScene / 2;
          const leftGeo = new THREE.CylinderGeometry(tubeR, tubeR, halfSpan - 0.06, 16);
          leftGeo.rotateZ(Math.PI / 2);
          const leftMesh = new THREE.Mesh(leftGeo, mats.copper);
          leftMesh.position.set(-(halfSpan / 2 + 0.03), 0, zPos);

          const rightMesh = new THREE.Mesh(leftGeo, mats.copper);
          rightMesh.position.set(halfSpan / 2 + 0.03, 0, zPos);
          meshGroup.add(leftMesh, rightMesh);

          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.12, 0.024, 12, 24),
            mats.drivenGlow
          );
          ring.position.set(0, 0, zPos);
          meshGroup.add(ring);
        } else {
          const rodR = isReflector ? 0.03 : 0.025;
          const elGeo = new THREE.CylinderGeometry(rodR, rodR, elSpanScene, 16);
          elGeo.rotateZ(Math.PI / 2);
          const elMesh = new THREE.Mesh(
            elGeo,
            isReflector ? mats.reflectorTint : mats.brightBrass
          );
          elMesh.position.set(0, 0, zPos);
          meshGroup.add(elMesh);
        }

        boomNodes.push({
          position: new THREE.Vector3(0, 0, zPos),
          width: elSpanScene,
          phaseDelay: idx * 0.32,
          role: isReflector ? 'reflector' : isDriven ? 'driven' : 'director',
        });

        // -----------------------------------------------------------------
        // 1. PER-ELEMENT LENGTH & BOOM POSITION CALLOUT FOR EVERY ELEMENT!
        // Alternating left (-X) and right (+X) tips with vertical stagger
        // so every element (REF, DRV, D1, D2, D3, D4...) is clearly readable!
        // -----------------------------------------------------------------
        const sideSign = idx % 2 === 0 ? -1 : 1;
        const tipX = sideSign * (elSpanScene / 2);
        const yStagger = idx % 4 < 2 ? 0.38 : 0.68;
        const badgeColor = isReflector
          ? '#FF3366'
          : isDriven
          ? '#00E5FF'
          : '#10B981';

        dimensionsGroup.add(
          createPointCallout(
            new THREE.Vector3(tipX, 0, zPos),
            new THREE.Vector3(sideSign * 0.34, yStagger, 0),
            `${el.symbol}: ${formatCompactLength(el.valueMeters)}`,
            `${el.lambdaFraction} • Kumulatif ${formatCompactLength(posM)}`,
            badgeColor,
            0.58
          )
        );
      });

      // -----------------------------------------------------------------
      // 2. ELEMENT-TO-ELEMENT SPACING CALLOUTS ALONG THE BOOM (REF↔DRV, DRV↔D1, D1↔D2...)
      // -----------------------------------------------------------------
      for (let i = 0; i < elements.length - 1; i++) {
        const zA = zSceneCoords[i];
        const zB = zSceneCoords[i + 1];
        const spacingM = posMetersList[i + 1] - posMetersList[i];
        const spacingLambda = spacingM / lambdaM;
        const symA = elements[i].symbol;
        const symB = elements[i + 1].symbol;

        // If elements > 8, show REF↔DRV, DRV↔D1, D1↔D2, and the front spacing to keep spacing ticks ultra-clean
        if (elements.length <= 8 || i <= 2 || i === elements.length - 2) {
          const yStep = i % 2 === 0 ? -0.32 : -0.58;
          dimensionsGroup.add(
            createDimensionCallout(
              new THREE.Vector3(0, 0, zA),
              new THREE.Vector3(0, 0, zB),
              new THREE.Vector3(0, yStep, 0),
              `${symA}↔${symB}: +${formatCompactLength(spacingM)}`,
              `Spasi ${spacingLambda.toFixed(3)} λ • Pos ${formatCompactLength(posMetersList[i + 1])}`,
              '#FFB300',
              0.56
            )
          );
        }
      }

      // -----------------------------------------------------------------
      // 3. TOTAL BOOM LENGTH CALLOUT AT BOTTOM
      // -----------------------------------------------------------------
      dimensionsGroup.add(
        createDimensionCallout(
          new THREE.Vector3(0, 0, zOffsetStart),
          new THREE.Vector3(0, 0, zOffsetStart + totalBoomScene),
          new THREE.Vector3(0, -0.96, 0),
          `Total Boom = ${formatCompactLength(totalBoomMeters)}`,
          `${N} Elemen (${boomLambda.toFixed(2)} λ) • Ø El ${params.conductorDiameterMm.toFixed(1)}mm`,
          '#00E5FF',
          0.66
        )
      );
      break;
    }

    case 'dish': {
      isOmnidirectional = false;
      const dLambda = params.dishDiameterLambda || 6;
      const fdRatio = params.dishFdRatio || 0.4;
      const diaMeters = calc.cutSheet[0]?.valueMeters || dLambda * lambdaM;
      const focalMeters = calc.cutSheet[1]?.valueMeters || diaMeters * fdRatio;
      const depthMeters =
        calc.cutSheet[2]?.valueMeters || (diaMeters * diaMeters) / (16 * focalMeters);
      const feedDiaMeters = calc.cutSheet[3]?.valueMeters || 0.72 * lambdaM;
      const strutLenMeters = Math.hypot(diaMeters * 0.46, focalMeters - depthMeters * 0.85);

      const dishRadiusScene = Math.min(2.15, Math.max(1.05, 0.9 + Math.log10(dLambda) * 0.95));
      const dishDiaScene = dishRadiusScene * 2;
      const focalScene = dishDiaScene * fdRatio;
      const depthScene = (dishDiaScene * dishDiaScene) / (16 * focalScene);

      const vertexZ = -0.65;
      const rimZ = vertexZ + depthScene;
      const focusZ = vertexZ + focalScene;

      feedPoint = new THREE.Vector3(0, 0, focusZ);
      boomStart = new THREE.Vector3(0, 0, vertexZ);
      boomEnd = new THREE.Vector3(0, 0, focusZ + 0.5);

      const lathePoints: THREE.Vector2[] = [];
      const segments = 32;
      for (let i = 0; i <= segments; i++) {
        const r = (i / segments) * dishRadiusScene;
        const z = (r * r) / (4 * focalScene);
        lathePoints.push(new THREE.Vector2(r, z));
      }
      const dishGeo = new THREE.LatheGeometry(lathePoints, 48);
      dishGeo.rotateX(Math.PI / 2);
      const dishMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#CBD5E1'),
        metalness: 0.78,
        roughness: 0.28,
        side: THREE.DoubleSide,
      });
      const dishMesh = new THREE.Mesh(dishGeo, dishMat);
      dishMesh.position.set(0, 0, vertexZ);
      meshGroup.add(dishMesh);

      const wireMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#00E5FF'),
        wireframe: true,
        transparent: true,
        opacity: 0.16,
      });
      const dishWire = new THREE.Mesh(dishGeo, wireMat);
      dishWire.position.set(0, 0, vertexZ + 0.004);
      meshGroup.add(dishWire);

      const rimTorus = new THREE.Mesh(
        new THREE.TorusGeometry(dishRadiusScene, 0.035, 16, 64),
        mats.darkAnodized
      );
      rimTorus.position.set(0, 0, rimZ);
      meshGroup.add(rimTorus);

      let firstRimPt = new THREE.Vector3();
      let firstFocusPt = new THREE.Vector3();

      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const rimPt = new THREE.Vector3(
          Math.cos(angle) * dishRadiusScene * 0.92,
          Math.sin(angle) * dishRadiusScene * 0.92,
          vertexZ + ((dishRadiusScene * 0.92) ** 2) / (4 * focalScene)
        );
        const focusTarget = new THREE.Vector3(
          Math.cos(angle) * 0.12,
          Math.sin(angle) * 0.12,
          focusZ
        );
        if (i === 0) {
          firstRimPt = rimPt;
          firstFocusPt = focusTarget;
        }
        const strutCurve = new THREE.LineCurve3(rimPt, focusTarget);
        const strutGeo = new THREE.TubeGeometry(strutCurve, 4, 0.022, 8, false);
        meshGroup.add(new THREE.Mesh(strutGeo, mats.darkAnodized));
      }

      const hornGeo = new THREE.CylinderGeometry(0.11, 0.2, 0.28, 24);
      hornGeo.rotateX(Math.PI / 2);
      const hornMesh = new THREE.Mesh(hornGeo, mats.copper);
      hornMesh.position.set(0, 0, focusZ);
      meshGroup.add(hornMesh);

      const focusGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 16, 16),
        mats.drivenGlow
      );
      focusGlow.position.set(0, 0, focusZ - 0.1);
      meshGroup.add(focusGlow);

      const hubMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.42, 0.25, 24).rotateX(Math.PI / 2),
        mats.darkAnodized
      );
      hubMesh.position.set(0, 0, vertexZ - 0.14);
      meshGroup.add(hubMesh);

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.12, 1.4, 16),
        mats.darkAnodized
      );
      pedestal.position.set(0, -0.75, vertexZ - 0.18);
      meshGroup.add(pedestal);

      for (let i = 0; i < 5; i++) {
        boomNodes.push({
          position: new THREE.Vector3(0, 0, vertexZ + i * 0.42),
          width: dishDiaScene * 0.9,
          phaseDelay: i * 0.22,
          role: i === 0 ? 'reflector' : 'aperture',
        });
      }

      dimensionsGroup.add(
        createDimensionCallout(
          new THREE.Vector3(0, -dishRadiusScene, rimZ),
          new THREE.Vector3(0, dishRadiusScene, rimZ),
          new THREE.Vector3(dishRadiusScene + 0.42, 0, 0),
          `D = ${formatCompactLength(diaMeters)}`,
          `Aperture (${dLambda.toFixed(1)} λ)`,
          '#00E5FF',
          0.68
        ),
        createDimensionCallout(
          new THREE.Vector3(0, 0, vertexZ),
          new THREE.Vector3(0, 0, focusZ),
          new THREE.Vector3(0, dishRadiusScene + 0.36, 0),
          `Focal f = ${formatCompactLength(focalMeters)}`,
          `f/D = ${fdRatio.toFixed(2)} (${(focalMeters / lambdaM).toFixed(2)} λ)`,
          '#FFB300',
          0.68
        ),
        createDimensionCallout(
          new THREE.Vector3(0, -dishRadiusScene, vertexZ),
          new THREE.Vector3(0, -dishRadiusScene, rimZ),
          new THREE.Vector3(0, -0.42, 0),
          `Depth d = ${formatCompactLength(depthMeters)}`,
          `d = D² / 16f`,
          '#10B981',
          0.64
        ),
        createPointCallout(
          new THREE.Vector3(0, 0.16, focusZ),
          new THREE.Vector3(-0.65, 0.55, 0.25),
          `Feed Horn Ø = ${formatCompactLength(feedDiaMeters)}`,
          `4× Strut L = ${formatCompactLength(strutLenMeters)}`,
          '#FF3366',
          0.62
        ),
        createPointCallout(
          firstRimPt.clone().add(firstFocusPt).multiplyScalar(0.5),
          new THREE.Vector3(0.55, 0.35, 0),
          `Strut = ${formatCompactLength(strutLenMeters)}`,
          `Feed Support Arm`,
          '#94A3B8',
          0.56
        )
      );
      break;
    }

    case 'helical': {
      isOmnidirectional = false;
      const turns = Math.max(3, Math.min(20, Math.round(params.helicalTurns || 8)));
      const spacingLambda = params.helicalSpacingLambda || 0.24;
      const isRHCP = params.helicalHandedness !== 'LHCP';

      const coilDiaM = calc.cutSheet[0]?.valueMeters || (lambdaM * 1.02) / Math.PI;
      const spacingM = calc.cutSheet[1]?.valueMeters || spacingLambda * lambdaM;
      const axialLenM = calc.cutSheet[2]?.valueMeters || turns * spacingM;
      const wireLenM = calc.cutSheet[3]?.valueMeters || turns * lambdaM * 1.05;
      const refDiaM = calc.cutSheet[4]?.valueMeters || 0.95 * lambdaM;

      const totalLambdaLen = turns * spacingLambda;
      const visualScale = Math.min(LAMBDA_SCENE, 3.8 / Math.max(1.0, totalLambdaLen));
      const coilRadiusScene = Math.max(0.28, (coilDiaM / lambdaM / 2) * visualScale * 1.35);
      const axialLenScene = totalLambdaLen * visualScale;
      const turnStepScene = axialLenScene / turns;
      const zStart = -axialLenScene * 0.4;

      feedPoint = new THREE.Vector3(coilRadiusScene, 0, zStart + 0.06);
      boomStart = new THREE.Vector3(0, 0, zStart);
      boomEnd = new THREE.Vector3(0, 0, zStart + axialLenScene);

      const refRadius = coilRadiusScene * 2.55;
      const refDiscGeo = new THREE.CylinderGeometry(refRadius, refRadius, 0.05, 48);
      refDiscGeo.rotateX(Math.PI / 2);
      const refDisc = new THREE.Mesh(refDiscGeo, mats.aluminum);
      refDisc.position.set(0, 0, zStart - 0.025);
      meshGroup.add(refDisc);

      const acrylicMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#38BDF8'),
        transmission: 0.65,
        transparent: true,
        opacity: 0.45,
        roughness: 0.15,
      });
      const coreRod = new THREE.Mesh(
        new THREE.CylinderGeometry(
          coilRadiusScene * 0.22,
          coilRadiusScene * 0.22,
          axialLenScene + 0.1,
          20
        ).rotateX(Math.PI / 2),
        acrylicMat
      );
      coreRod.position.set(0, 0, zStart + axialLenScene / 2);
      meshGroup.add(coreRod);

      const pts: THREE.Vector3[] = [];
      const steps = turns * 32;
      const sign = isRHCP ? 1 : -1;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = sign * t * turns * Math.PI * 2;
        const x = Math.cos(angle) * coilRadiusScene;
        const y = Math.sin(angle) * coilRadiusScene;
        const z = zStart + t * axialLenScene;
        pts.push(new THREE.Vector3(x, y, z));
      }
      const helixCurve = new THREE.CatmullRomCurve3(pts);
      const helixGeo = new THREE.TubeGeometry(helixCurve, steps, 0.032, 12, false);
      const helixMesh = new THREE.Mesh(helixGeo, mats.copper);
      meshGroup.add(helixMesh);

      const feedSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 16, 16),
        mats.drivenGlow
      );
      feedSphere.position.copy(pts[0]);
      meshGroup.add(feedSphere);

      for (let i = 0; i < turns; i++) {
        const zTurn = zStart + ((i + 0.5) / turns) * axialLenScene;
        boomNodes.push({
          position: new THREE.Vector3(0, 0, zTurn),
          width: coilRadiusScene * 2.2,
          phaseDelay: i * 0.25,
          role: i === 0 ? 'driven' : 'director',
        });
      }

      dimensionsGroup.add(
        createDimensionCallout(
          new THREE.Vector3(0, 0, zStart),
          new THREE.Vector3(0, 0, zStart + axialLenScene),
          new THREE.Vector3(0, -(refRadius + 0.32), 0),
          `L_axial = ${formatCompactLength(axialLenM)}`,
          `${turns} Turns (${params.helicalHandedness}) • Total Kawat = ${formatCompactLength(wireLenM)}`,
          '#00E5FF',
          0.66
        ),
        createDimensionCallout(
          new THREE.Vector3(0, coilRadiusScene, zStart + turnStepScene),
          new THREE.Vector3(0, coilRadiusScene, zStart + turnStepScene * 2),
          new THREE.Vector3(0, 0.46, 0),
          `Turn Pitch S = ${formatCompactLength(spacingM)}`,
          `Jarak Antar-Lilitan (${spacingLambda.toFixed(2)} λ)`,
          '#10B981',
          0.64
        ),
        createDimensionCallout(
          new THREE.Vector3(0, -coilRadiusScene, zStart + axialLenScene),
          new THREE.Vector3(0, coilRadiusScene, zStart + axialLenScene),
          new THREE.Vector3(coilRadiusScene + 0.48, 0, 0),
          `Coil Ø = ${formatCompactLength(coilDiaM)}`,
          `Keliling C = ${formatCompactLength(coilDiaM * Math.PI)} (1.02 λ)`,
          '#FFB300',
          0.64
        ),
        createDimensionCallout(
          new THREE.Vector3(-refRadius, 0, zStart),
          new THREE.Vector3(refRadius, 0, zStart),
          new THREE.Vector3(0, refRadius + 0.34, 0),
          `Reflector Ø = ${formatCompactLength(refDiaM)}`,
          `0.95 λ Ground Shield • λ/4 Match 52 Ω`,
          '#FF3366',
          0.62
        )
      );
      break;
    }

    case 'patch': {
      isOmnidirectional = false;
      const wMeters = calc.cutSheet[0]?.valueMeters || lambdaM * 0.38;
      const lMeters = calc.cutSheet[1]?.valueMeters || lambdaM * 0.29;
      const insetMeters = calc.cutSheet[2]?.valueMeters || lMeters * 0.29;
      const gndMeters = calc.cutSheet[3]?.valueMeters || lambdaM * 0.55;

      const scale = LAMBDA_SCENE * 1.45;
      const patchW = Math.max(0.9, (wMeters / lambdaM) * scale);
      const patchL = Math.max(0.7, (lMeters / lambdaM) * scale);
      const subW = patchW * 1.45;
      const subL = patchL * 1.48;
      const subThick = Math.max(
        0.08,
        Math.min(
          0.22,
          ((params.patchSubstrateHeightMm || 1.6) / 1000 / lambdaM) * scale * 4
        )
      );

      const gndGeo = new THREE.BoxGeometry(subW, subL, 0.025);
      const gndMesh = new THREE.Mesh(gndGeo, mats.brightBrass);
      gndMesh.position.set(0, 0, -subThick / 2 - 0.012);
      meshGroup.add(gndMesh);

      const subGeo = new THREE.BoxGeometry(subW, subL, subThick);
      const subMesh = new THREE.Mesh(subGeo, mats.pcbSubstrate);
      meshGroup.add(subMesh);

      const insetDepth = patchL * 0.295;
      const feedLineWidth = patchW * 0.11;
      const notchGap = feedLineWidth * 0.65;

      const patchShape = new THREE.Shape();
      const hw = patchW / 2;
      const hl = patchL / 2;
      const nHalf = feedLineWidth / 2 + notchGap;

      patchShape.moveTo(-hw, -hl);
      patchShape.lineTo(-nHalf, -hl);
      patchShape.lineTo(-nHalf, -hl + insetDepth);
      patchShape.lineTo(-feedLineWidth / 2, -hl + insetDepth);
      patchShape.lineTo(-feedLineWidth / 2, -subL / 2);
      patchShape.lineTo(feedLineWidth / 2, -subL / 2);
      patchShape.lineTo(feedLineWidth / 2, -hl + insetDepth);
      patchShape.lineTo(nHalf, -hl + insetDepth);
      patchShape.lineTo(nHalf, -hl);
      patchShape.lineTo(hw, -hl);
      patchShape.lineTo(hw, hl);
      patchShape.lineTo(-hw, hl);
      patchShape.closePath();

      const extrudeGeo = new THREE.ExtrudeGeometry(patchShape, {
        depth: 0.022,
        bevelEnabled: false,
      });
      const patchMesh = new THREE.Mesh(extrudeGeo, mats.copper);
      patchMesh.position.set(0, 0, subThick / 2);
      meshGroup.add(patchMesh);

      const edgeGeo = new THREE.BoxGeometry(patchW, 0.035, 0.035);
      const topFringe = new THREE.Mesh(edgeGeo, mats.drivenGlow);
      topFringe.position.set(0, hl, subThick / 2 + 0.02);
      const botFringe = new THREE.Mesh(edgeGeo, mats.drivenGlow);
      botFringe.position.set(0, -hl, subThick / 2 + 0.02);
      meshGroup.add(topFringe, botFringe);

      const smaMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.28, 16),
        mats.brightBrass
      );
      smaMesh.position.set(0, -subL / 2 - 0.14, 0);
      meshGroup.add(smaMesh);

      boomStart = new THREE.Vector3(0, 0, 0);
      boomEnd = new THREE.Vector3(0, 0, 2.2);
      boomNodes.push({
        position: new THREE.Vector3(0, 0, subThick / 2 + 0.05),
        width: patchW,
        phaseDelay: 0,
        role: 'driven',
      });

      dimensionsGroup.add(
        createDimensionCallout(
          new THREE.Vector3(-hw, hl, subThick / 2),
          new THREE.Vector3(hw, hl, subThick / 2),
          new THREE.Vector3(0, 0.45, 0),
          `Patch W = ${formatCompactLength(wMeters)}`,
          `Radiating Width (${(wMeters / lambdaM).toFixed(3)} λ₀)`,
          '#00E5FF',
          0.66
        ),
        createDimensionCallout(
          new THREE.Vector3(hw, -hl, subThick / 2),
          new THREE.Vector3(hw, hl, subThick / 2),
          new THREE.Vector3(0.55, 0, 0),
          `Patch L = ${formatCompactLength(lMeters)}`,
          `Resonant Length (λ_eff / 2)`,
          '#FFB300',
          0.66
        ),
        createDimensionCallout(
          new THREE.Vector3(-nHalf, -hl, subThick / 2),
          new THREE.Vector3(-nHalf, -hl + insetDepth, subThick / 2),
          new THREE.Vector3(-0.62, 0, 0.15),
          `Inset y₀ = ${formatCompactLength(insetMeters)}`,
          `50 Ω Impedance Match Notch`,
          '#10B981',
          0.62
        ),
        createDimensionCallout(
          new THREE.Vector3(-subW / 2, -subL / 2, -subThick / 2),
          new THREE.Vector3(subW / 2, -subL / 2, -subThick / 2),
          new THREE.Vector3(0, -0.45, 0),
          `Ground PCB = ${formatCompactLength(gndMeters)}`,
          `Substrat εr=${params.patchDielectricEr} • h=${params.patchSubstrateHeightMm}mm`,
          '#FF3366',
          0.62
        )
      );
      break;
    }

    case 'biquad': {
      isOmnidirectional = false;
      const sideM = calc.cutSheet[0]?.valueMeters || lambdaM * 0.246;
      const spanM = calc.cutSheet[1]?.valueMeters || sideM * Math.SQRT2 * 2;
      const spaceM = calc.cutSheet[2]?.valueMeters || lambdaM * 0.125;
      const wireTotalM = calc.cutSheet[3]?.valueMeters || sideM * 8;

      const scale = LAMBDA_SCENE * 1.15;
      const sideScene = (sideM / lambdaM) * scale;
      const diagHalf = (sideScene * Math.SQRT2) / 2;
      const spaceScene = Math.max(0.34, (spaceM / lambdaM) * scale);

      const refZ = -0.25;
      const quadZ = refZ + spaceScene;

      const refW = diagHalf * 2.5;
      const refH = diagHalf * 4.4;
      const refPlate = new THREE.Mesh(
        new THREE.BoxGeometry(refW, refH, 0.04),
        mats.aluminum
      );
      refPlate.position.set(0, 0, refZ);
      meshGroup.add(refPlate);

      const biquadPts = [
        new THREE.Vector3(0, 0.04, quadZ),
        new THREE.Vector3(diagHalf, diagHalf, quadZ),
        new THREE.Vector3(0, diagHalf * 2, quadZ),
        new THREE.Vector3(-diagHalf, diagHalf, quadZ),
        new THREE.Vector3(0, 0, quadZ),
        new THREE.Vector3(diagHalf, -diagHalf, quadZ),
        new THREE.Vector3(0, -diagHalf * 2, quadZ),
        new THREE.Vector3(-diagHalf, -diagHalf, quadZ),
        new THREE.Vector3(0, -0.04, quadZ),
      ];

      for (let i = 0; i < biquadPts.length - 1; i++) {
        const seg = new THREE.LineCurve3(biquadPts[i], biquadPts[i + 1]);
        const segGeo = new THREE.TubeGeometry(seg, 6, 0.032, 12, false);
        meshGroup.add(new THREE.Mesh(segGeo, mats.copper));

        const corner = new THREE.Mesh(
          new THREE.SphereGeometry(0.036, 12, 12),
          mats.brightBrass
        );
        corner.position.copy(biquadPts[i]);
        meshGroup.add(corner);
      }

      const feedTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, spaceScene + 0.25, 16).rotateX(
          Math.PI / 2
        ),
        mats.copper
      );
      feedTube.position.set(0, 0, refZ + spaceScene / 2 - 0.1);
      meshGroup.add(feedTube);

      const feedGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 16, 16),
        mats.drivenGlow
      );
      feedGlow.position.set(0, 0, quadZ);
      meshGroup.add(feedGlow);

      boomStart = new THREE.Vector3(0, 0, refZ);
      boomEnd = new THREE.Vector3(0, 0, quadZ + 2.0);
      boomNodes.push(
        {
          position: new THREE.Vector3(0, 0, refZ),
          width: refW,
          phaseDelay: 0,
          role: 'reflector',
        },
        {
          position: new THREE.Vector3(0, 0, quadZ),
          width: diagHalf * 2.5,
          phaseDelay: 0.2,
          role: 'driven',
        }
      );

      dimensionsGroup.add(
        createDimensionCallout(
          new THREE.Vector3(0, -diagHalf * 2, quadZ),
          new THREE.Vector3(0, diagHalf * 2, quadZ),
          new THREE.Vector3(refW / 2 + 0.38, 0, 0),
          `Span = ${formatCompactLength(spanM)}`,
          `Total Diagonal Loop (${(spanM / lambdaM).toFixed(2)} λ)`,
          '#00E5FF',
          0.66
        ),
        createDimensionCallout(
          new THREE.Vector3(0, diagHalf * 2, quadZ),
          new THREE.Vector3(-diagHalf, diagHalf, quadZ),
          new THREE.Vector3(-0.35, 0.35, 0.15),
          `Sisi L_side = ${formatCompactLength(sideM)}`,
          `8× Sisi @ 90° (0.246 λ / Sisi)`,
          '#FFB300',
          0.64
        ),
        createDimensionCallout(
          new THREE.Vector3(0, diagHalf * 2, refZ),
          new THREE.Vector3(0, diagHalf * 2, quadZ),
          new THREE.Vector3(0, 0.44, 0),
          `Standoff h = ${formatCompactLength(spaceM)}`,
          `Jarak Quad↔Reflector (0.125 λ)`,
          '#10B981',
          0.64
        ),
        createDimensionCallout(
          new THREE.Vector3(-refW / 2, -refH / 2, refZ),
          new THREE.Vector3(refW / 2, -refH / 2, refZ),
          new THREE.Vector3(0, -0.38, 0),
          `Reflector = ${formatCompactLength(0.76 * lambdaM)} × ${formatCompactLength(0.92 * lambdaM)}`,
          `Total Kawat = ${formatCompactLength(wireTotalM)}`,
          '#FF3366',
          0.62
        )
      );
      break;
    }

    case 'horn': {
      isOmnidirectional = false;
      const apALambda = params.hornApertureALambda || 2.6;
      const hornLenLambda = params.hornLengthLambda || 2.8;

      const apAMeters = calc.cutSheet[0]?.valueMeters || apALambda * lambdaM;
      const apBMeters = apAMeters * 0.75;
      const flareLenMeters = calc.cutSheet[1]?.valueMeters || hornLenLambda * lambdaM;
      const wgAMeters = calc.cutSheet[2]?.valueMeters || 0.72 * lambdaM;
      const wgBMeters = wgAMeters * 0.5;
      const probeMeters = calc.cutSheet[3]?.valueMeters || 0.235 * lambdaM;

      const scale = Math.min(LAMBDA_SCENE * 0.7, 2.8 / Math.max(1.2, hornLenLambda));
      const throatW = Math.max(0.45, 0.72 * scale * 1.2);
      const throatH = throatW * 0.5;
      const mouthW = Math.max(0.95, apALambda * scale);
      const mouthH = mouthW * 0.75;
      const flareLen = Math.max(1.1, hornLenLambda * scale);
      const wgLen = 0.65;

      const zThroat = -flareLen * 0.35;
      const zMouth = zThroat + flareLen;

      const wgGeo = new THREE.BoxGeometry(throatW, throatH, wgLen);
      const wgMesh = new THREE.Mesh(wgGeo, mats.brightBrass);
      wgMesh.position.set(0, 0, zThroat - wgLen / 2);
      meshGroup.add(wgMesh);

      const flangeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(throatW + 0.16, throatH + 0.16, 0.06),
        mats.copper
      );
      flangeMesh.position.set(0, 0, zThroat);
      meshGroup.add(flangeMesh);

      const coaxMount = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.22, 16),
        mats.drivenGlow
      );
      coaxMount.position.set(0, throatH / 2 + 0.11, zThroat - wgLen * 0.45);
      meshGroup.add(coaxMount);

      const hw0 = throatW / 2;
      const hh0 = throatH / 2;
      const hw1 = mouthW / 2;
      const hh1 = mouthH / 2;

      const vertices = new Float32Array([
        -hw0, hh0, zThroat, hw0, hh0, zThroat, hw1, hh1, zMouth,
        -hw0, hh0, zThroat, hw1, hh1, zMouth, -hw1, hh1, zMouth,
        -hw0, -hh0, zThroat, hw1, -hh1, zMouth, hw0, -hh0, zThroat,
        -hw0, -hh0, zThroat, -hw1, -hh1, zMouth, hw1, -hh1, zMouth,
        hw0, -hh0, zThroat, hw1, hh1, zMouth, hw0, hh0, zThroat,
        hw0, -hh0, zThroat, hw1, -hh1, zMouth, hw1, hh1, zMouth,
        -hw0, -hh0, zThroat, -hw0, hh0, zThroat, -hw1, hh1, zMouth,
        -hw0, -hh0, zThroat, -hw1, hh1, zMouth, -hw1, -hh1, zMouth,
      ]);

      const hornGeo = new THREE.BufferGeometry();
      hornGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      hornGeo.computeVertexNormals();

      const hornMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#D97736'),
        metalness: 0.85,
        roughness: 0.22,
        side: THREE.DoubleSide,
      });
      meshGroup.add(new THREE.Mesh(hornGeo, hornMat));

      const rimPts = [
        new THREE.Vector3(-hw1, -hh1, zMouth),
        new THREE.Vector3(hw1, -hh1, zMouth),
        new THREE.Vector3(hw1, hh1, zMouth),
        new THREE.Vector3(-hw1, hh1, zMouth),
        new THREE.Vector3(-hw1, -hh1, zMouth),
      ];
      const rimLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(rimPts),
        new THREE.LineBasicMaterial({ color: 0x00e5ff })
      );
      meshGroup.add(rimLine);

      boomStart = new THREE.Vector3(0, 0, zThroat);
      boomEnd = new THREE.Vector3(0, 0, zMouth);

      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        boomNodes.push({
          position: new THREE.Vector3(0, 0, zThroat + t * flareLen),
          width: throatW + t * (mouthW - throatW),
          phaseDelay: i * 0.2,
          role: i === 0 ? 'driven' : 'aperture',
        });
      }

      dimensionsGroup.add(
        createDimensionCallout(
          new THREE.Vector3(-hw1, hh1, zMouth),
          new THREE.Vector3(hw1, hh1, zMouth),
          new THREE.Vector3(0, 0.42, 0),
          `Aperture A = ${formatCompactLength(apAMeters)}`,
          `H-Plane Width (${apALambda.toFixed(1)} λ)`,
          '#00E5FF',
          0.66
        ),
        createDimensionCallout(
          new THREE.Vector3(hw1, -hh1, zMouth),
          new THREE.Vector3(hw1, hh1, zMouth),
          new THREE.Vector3(0.45, 0, 0),
          `Aperture B = ${formatCompactLength(apBMeters)}`,
          `E-Plane Height (${(apALambda * 0.75).toFixed(1)} λ)`,
          '#10B981',
          0.64
        ),
        createDimensionCallout(
          new THREE.Vector3(0, -hh1, zThroat),
          new THREE.Vector3(0, -hh1, zMouth),
          new THREE.Vector3(0, -0.45, 0),
          `Flare L = ${formatCompactLength(flareLenMeters)}`,
          `Axial Length (${hornLenLambda.toFixed(1)} λ)`,
          '#FFB300',
          0.64
        ),
        createPointCallout(
          new THREE.Vector3(0, throatH / 2 + 0.16, zThroat - wgLen * 0.45),
          new THREE.Vector3(-0.55, 0.45, -0.25),
          `Probe = ${formatCompactLength(probeMeters)} (0.235λ)`,
          `Waveguide a×b = ${formatCompactLength(wgAMeters)}×${formatCompactLength(wgBMeters)}`,
          '#FF3366',
          0.62
        )
      );
      break;
    }
  }

  return {
    meshGroup,
    dimensionsGroup,
    feedPoint,
    boomStart,
    boomEnd,
    boomNodes,
    isOmnidirectional,
  };
}
