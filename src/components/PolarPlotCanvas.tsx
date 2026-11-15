import React, { useEffect, useRef } from 'react';
import { AntennaCalculationResult, AntennaParams, Language } from '../types/antenna';
import { evaluateDirectionalPatternVec } from '../engine/antennaCalculator';

interface PolarPlotCanvasProps {
  lang: Language;
  params: AntennaParams;
  calc: AntennaCalculationResult;
}

export const PolarPlotCanvas: React.FC<PolarPlotCanvasProps> = ({ lang, params, calc }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 260;
    const height = 216;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const maxR = 78;

    // Concentric dB circles (0 dB, -3 dB, -10 dB, -20 dB)
    const rings = [
      { ratio: 1.0, label: '0dB' },
      { ratio: 0.78, label: '-3dB', highlight: true },
      { ratio: 0.5, label: '-10dB' },
      { ratio: 0.25, label: '-20dB' },
    ];

    rings.forEach((ring) => {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * ring.ratio, 0, Math.PI * 2);
      ctx.strokeStyle = ring.highlight ? 'rgba(16, 185, 129, 0.35)' : '#1E293B';
      ctx.lineWidth = ring.highlight ? 1.2 : 1;
      if (ring.highlight) ctx.setLineDash([3, 3]);
      else ctx.setLineDash([]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = ring.highlight ? '#10B981' : '#64748B';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(ring.label, cx + 3, cy - maxR * ring.ratio + 9);
    });

    // Radial spokes every 30 deg
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = ((deg - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rad) * maxR, cy + Math.sin(rad) * maxR);
      ctx.strokeStyle = deg % 90 === 0 ? '#334155' : '#162032';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (deg % 45 === 0) {
        const labelR = maxR + 14;
        const lx = cx + Math.cos(rad) * labelR;
        const ly = cy + Math.sin(rad) * labelR;
        ctx.fillStyle = deg === 0 ? '#00E5FF' : '#94A3B8';
        ctx.font = deg === 0 ? 'bold 10px "JetBrains Mono", monospace' : '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${deg}°`, lx, ly);
      }
    }

    // Highlight -3dB HPBW Sector Arc for directional antennas
    if (calc.hpbwEDeg < 180) {
      const halfBeamRad = ((calc.hpbwEDeg / 2) * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR * 0.78, -Math.PI / 2 - halfBeamRad, -Math.PI / 2 + halfBeamRad);
      ctx.closePath();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.10)';
      ctx.fill();
    }

    // Plot H-Plane (Azimuth XZ) in Cyan (#00E5FF)
    const steps = 180;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const dx = Math.sin(angle);
      const dz = Math.cos(angle);
      const amp = evaluateDirectionalPatternVec(params.antennaType, params, dx, 0, dz);
      const db = 20 * Math.log10(Math.max(0.05, amp));
      const normR = Math.max(0.05, (db + 26) / 26) * maxR;

      const plotAngle = angle - Math.PI / 2;
      const px = cx + Math.cos(plotAngle) * normR;
      const py = cy + Math.sin(plotAngle) * normR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 229, 255, 0.14)';
    ctx.fill();
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Plot E-Plane (Elevation YZ) in Amber (#FFB300)
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const dy = Math.sin(angle);
      const dz = Math.cos(angle);
      const amp = evaluateDirectionalPatternVec(params.antennaType, params, 0, dy, dz);
      const db = 20 * Math.log10(Math.max(0.05, amp));
      const normR = Math.max(0.05, (db + 26) / 26) * maxR;

      const plotAngle = angle - Math.PI / 2;
      const px = cx + Math.cos(plotAngle) * normR;
      const py = cy + Math.sin(plotAngle) * normR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 179, 0, 0.09)';
    ctx.fill();
    ctx.strokeStyle = '#FFB300';
    ctx.lineWidth = 1.75;
    ctx.setLineDash([4, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [params, calc]);

  return (
    <div className="flex flex-col items-center w-full">
      <canvas ref={canvasRef} className="w-[260px] h-[216px]" />
      <div className="flex items-center justify-center gap-3.5 text-[10px] font-mono-num pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-[#00E5FF] inline-block" />
          <span className="text-[#CBD5E1]">H ({calc.hpbwHDeg.toFixed(0)}°)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-[#FFB300] inline-block" />
          <span className="text-[#CBD5E1]">E ({calc.hpbwEDeg.toFixed(0)}°)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10B981]/50 inline-block" />
          <span className="text-[#10B981]">
            {lang === 'id' ? 'Lebar -3dB' : '-3dB HPBW'}
          </span>
        </div>
      </div>
    </div>
  );
};
