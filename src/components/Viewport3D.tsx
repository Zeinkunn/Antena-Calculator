import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  AntennaCalculationResult,
  AntennaParams,
  Language,
  VisualSimulationConfig,
} from '../types/antenna';
import { buildAntenna3D } from '../three/builders/antennaBuilders';
import { SignalBoomEffectController } from '../three/effects/SignalBoomEffect';
import {
  Compass,
  Eye,
  Layers,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface Viewport3DProps {
  lang: Language;
  params: AntennaParams;
  calc: AntennaCalculationResult;
  visConfig: VisualSimulationConfig;
  onUpdateVisConfig: (patch: Partial<VisualSimulationConfig>) => void;
  burstTriggerCount: number;
  onTriggerBurst: () => void;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  lang,
  params,
  calc,
  visConfig,
  onUpdateVisConfig,
  burstTriggerCount,
  onTriggerBurst,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const antennaHolderRef = useRef<THREE.Group | null>(null);
  const dimensionsHolderRef = useRef<THREE.Group | null>(null);
  const polarFloorRef = useRef<THREE.Group | null>(null);
  const effectCtrlRef = useRef<SignalBoomEffectController | null>(null);
  const visConfigRef = useRef<VisualSimulationConfig>(visConfig);

  useEffect(() => {
    visConfigRef.current = visConfig;
    if (effectCtrlRef.current) {
      effectCtrlRef.current.syncVisibility(visConfig);
    }
    if (dimensionsHolderRef.current) {
      dimensionsHolderRef.current.visible = visConfig.showDimensions3D;
    }
    if (polarFloorRef.current) {
      polarFloorRef.current.visible = visConfig.showPolarGrid;
    }
    if (controlsRef.current) {
      controlsRef.current.autoRotate = visConfig.autoRotateCamera;
    }
  }, [visConfig]);

  useEffect(() => {
    if (burstTriggerCount > 0 && effectCtrlRef.current) {
      effectCtrlRef.current.triggerBoomBurst();
    }
  }, [burstTriggerCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#060911');
    scene.fog = new THREE.FogExp2('#060911', 0.036);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      140
    );
    camera.position.set(6.2, 3.6, 6.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 26;
    controls.minDistance = 1.6;
    controls.autoRotate = visConfigRef.current.autoRotateCamera;
    controls.autoRotateSpeed = 0.9;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);

    const rimCyanLight = new THREE.PointLight(0x00e5ff, 3.4, 20);
    rimCyanLight.position.set(-6, 4, 6);
    scene.add(rimCyanLight);

    const warmFillLight = new THREE.PointLight(0xffb300, 2.2, 20);
    warmFillLight.position.set(6, -3, -5);
    scene.add(warmFillLight);

    const polarFloor = new THREE.Group();
    polarFloor.position.set(0, -1.75, 0);

    const polarGrid = new THREE.PolarGridHelper(
      8.0,
      16,
      8,
      64,
      0x1e293b,
      0x0f172a
    );
    polarFloor.add(polarGrid);

    const zAxisPts = [new THREE.Vector3(0, 0.01, -8.0), new THREE.Vector3(0, 0.01, 8.0)];
    const zAxisLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(zAxisPts),
      new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45 })
    );
    const xAxisPts = [new THREE.Vector3(-8.0, 0.01, 0), new THREE.Vector3(8.0, 0.01, 0)];
    const xAxisLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(xAxisPts),
      new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.4 })
    );
    polarFloor.add(zAxisLine, xAxisLine);
    scene.add(polarFloor);
    polarFloorRef.current = polarFloor;

    const antennaHolder = new THREE.Group();
    const dimensionsHolder = new THREE.Group();
    scene.add(antennaHolder);
    scene.add(dimensionsHolder);
    antennaHolderRef.current = antennaHolder;
    dimensionsHolderRef.current = dimensionsHolder;

    const effectCtrl = new SignalBoomEffectController();
    scene.add(effectCtrl.rootGroup);
    effectCtrlRef.current = effectCtrl;

    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, clock.getDelta());
      controls.update();
      if (effectCtrlRef.current) {
        effectCtrlRef.current.update(dt, visConfigRef.current);
      }
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const antennaHolder = antennaHolderRef.current;
    const dimensionsHolder = dimensionsHolderRef.current;
    const effectCtrl = effectCtrlRef.current;
    if (!antennaHolder || !dimensionsHolder || !effectCtrl) return;

    while (antennaHolder.children.length > 0) {
      antennaHolder.remove(antennaHolder.children[0]);
    }
    while (dimensionsHolder.children.length > 0) {
      dimensionsHolder.remove(dimensionsHolder.children[0]);
    }

    const built = buildAntenna3D(params, calc);
    antennaHolder.add(built.meshGroup);
    dimensionsHolder.add(built.dimensionsGroup);
    dimensionsHolder.visible = visConfigRef.current.showDimensions3D;

    effectCtrl.rebuild(params, calc, built, visConfigRef.current);
  }, [params, calc, visConfig.lobeWireframe]);

  const setCameraPreset = (preset: 'iso' | 'top' | 'side' | 'front') => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    ctrl.target.set(0, 0, 0);
    switch (preset) {
      case 'iso':
        cam.position.set(6.2, 3.6, 6.8);
        break;
      case 'top':
        cam.position.set(0.01, 9.5, 0.01);
        break;
      case 'side':
        cam.position.set(9.2, 0.4, 0);
        break;
      case 'front':
        cam.position.set(0, 0.6, 8.8);
        break;
    }
    ctrl.update();
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#060911] select-none overflow-hidden z-0">
      {/* 100% Full-Screen 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Bottom-Center Floating Action Dock: Crisp single-line nowrap typography */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[96vw]">
        <div className="h-12 bg-[#0B101B]/88 backdrop-blur-2xl border border-white/10 rounded-2xl px-3 shadow-[0_16px_48px_rgba(0,0,0,0.75)] flex items-center gap-2 whitespace-nowrap">
          {/* Play/Pause & Signal Boom CTA */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onUpdateVisConfig({ isPlaying: !visConfig.isPlaying })}
              className="h-8 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-[#F1F5F9] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              {visConfig.isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-[#FFB300] shrink-0" />
                  <span>{lang === 'id' ? 'Jeda' : 'Pause'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                  <span>{lang === 'id' ? 'Putar' : 'Play'}</span>
                </>
              )}
            </button>

            <button
              onClick={onTriggerBurst}
              className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#10B981] text-[#080C14] font-display font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-[0_0_16px_rgba(0,229,255,0.35)] hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'id' ? 'Boom Sinyal' : 'Boom Pulse'}</span>
            </button>
          </div>

          <div className="h-5 w-[1px] bg-white/10 shrink-0" />

          {/* 3D Layer Toggles */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() =>
                onUpdateVisConfig({ showSignalBoom: !visConfig.showSignalBoom })
              }
              className={`h-8 px-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                visConfig.showSignalBoom
                  ? 'bg-[#00E5FF]/15 text-[#00E5FF]'
                  : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-white/5'
              }`}
            >
              <Radio className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'id' ? 'Gelombang' : 'Waves'}</span>
            </button>

            <button
              onClick={() =>
                onUpdateVisConfig({ showRadiationLobe: !visConfig.showRadiationLobe })
              }
              className={`h-8 px-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                visConfig.showRadiationLobe
                  ? 'bg-[#FF3366]/15 text-[#FF3366]'
                  : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'id' ? 'Kubah 3D' : '3D Lobe'}</span>
            </button>

            <button
              onClick={() =>
                onUpdateVisConfig({
                  showEHFieldVectors: !visConfig.showEHFieldVectors,
                })
              }
              className={`h-8 px-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                visConfig.showEHFieldVectors
                  ? 'bg-[#FFB300]/15 text-[#FFB300]'
                  : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-white/5'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>E/H</span>
            </button>

            <button
              onClick={() =>
                onUpdateVisConfig({ showDimensions3D: !visConfig.showDimensions3D })
              }
              className={`h-8 px-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                visConfig.showDimensions3D
                  ? 'bg-[#10B981]/15 text-[#10B981]'
                  : 'text-[#64748B] hover:text-[#94A3B8] hover:bg-white/5'
              }`}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>{lang === 'id' ? 'Ukuran 3D' : 'Dimensions'}</span>
            </button>
          </div>

          <div className="h-5 w-[1px] bg-white/10 shrink-0" />

          {/* Camera Angle Presets */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setCameraPreset('iso')}
              className="h-8 px-2 text-xs font-mono-num text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 rounded-lg whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              3D
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className="h-8 px-2 text-xs font-mono-num text-[#94A3B8] hover:text-[#00E5FF] hover:bg-white/5 rounded-lg whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              {lang === 'id' ? 'Atas' : 'Top'}
            </button>
            <button
              onClick={() => setCameraPreset('side')}
              className="h-8 px-2 text-xs font-mono-num text-[#94A3B8] hover:text-[#FFB300] hover:bg-white/5 rounded-lg whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              {lang === 'id' ? 'Samping' : 'Side'}
            </button>
            <button
              onClick={() => setCameraPreset('front')}
              className="h-8 px-2 text-xs font-mono-num text-[#94A3B8] hover:text-[#10B981] hover:bg-white/5 rounded-lg whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              +Z
            </button>
            <button
              onClick={() =>
                onUpdateVisConfig({ autoRotateCamera: !visConfig.autoRotateCamera })
              }
              className={`h-8 w-8 flex items-center justify-center rounded-lg shrink-0 transition cursor-pointer ${
                visConfig.autoRotateCamera
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF]'
                  : 'text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/5'
              }`}
              title={lang === 'id' ? 'Putar Kamera Otomatis' : 'Auto-Rotate Camera'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom-Right Author Credit (Minimal Text Only) */}
      <a
        href="https://github.com/Zeinkunn"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-20 pointer-events-auto hidden lg:flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#CBD5E1] transition group whitespace-nowrap"
        title="GitHub @Zeinkunn"
      >
        <span>{lang === 'id' ? 'Dibuat oleh' : 'Built by'}</span>
        <span className="font-display font-semibold text-[#94A3B8] group-hover:text-[#00E5FF] transition">
          Zein (@Zeinkunn)
        </span>
      </a>
    </div>
  );
};
