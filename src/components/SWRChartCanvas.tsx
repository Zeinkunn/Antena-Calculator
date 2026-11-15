import React, { useEffect, useRef } from 'react';
import { AntennaCalculationResult, AntennaParams, Language } from '../types/antenna';

interface SWRChartCanvasProps {
  lang: Language;
  params: AntennaParams;
  calc: AntennaCalculationResult;
}

export const SWRChartCanvas: React.FC<SWRChartCanvasProps> = ({ lang, params, calc }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 290;
    const height = 165;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padL = 30;
    const padR = 10;
    const padT = 12;
    const padB = 24;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const curve = calc.swrCurve;
    if (curve.length < 2) return;

    const minF = curve[0].freqMHz;
    const maxF = curve[curve.length - 1].freqMHz;
    const maxVswrPlot = 5.0;

    const freqToX = (f: number) => padL + ((f - minF) / Math.max(0.001, maxF - minF)) * plotW;
    const vswrToY = (v: number) => {
      const clamped = Math.max(1.0, Math.min(maxVswrPlot, v));
      return padT + plotH - ((clamped - 1.0) / (maxVswrPlot - 1.0)) * plotH;
    };

    // Shaded VSWR <= 2.0 Passband region
    const y20 = vswrToY(2.0);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(padL, y20, plotW, padT + plotH - y20);

    // Horizontal grid lines for VSWR 1.0, 1.5, 2.0, 3.0, 5.0
    [1.0, 1.5, 2.0, 3.0, 5.0].forEach((lvl) => {
      const y = vswrToY(lvl);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.strokeStyle = lvl === 2.0 ? 'rgba(16, 185, 129, 0.5)' : '#162032';
      ctx.setLineDash(lvl === 2.0 ? [4, 3] : []);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = lvl === 2.0 ? '#10B981' : '#64748B';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${lvl.toFixed(1)}`, padL - 5, y);
    });

    // Plot VSWR Curve
    ctx.beginPath();
    curve.forEach((pt, idx) => {
      const x = freqToX(pt.freqMHz);
      const y = vswrToY(pt.vswr);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Resonant Design Frequency f0 marker
    const xRes = freqToX(params.frequencyMHz);
    ctx.beginPath();
    ctx.moveTo(xRes, padT);
    ctx.lineTo(xRes, padT + plotH);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Active Operating Frequency Marker dot
    const xOp = Math.max(padL, Math.min(padL + plotW, freqToX(params.operatingFreqMHz)));
    const yOp = vswrToY(calc.activeVswr);

    ctx.beginPath();
    ctx.arc(xOp, yOp, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = calc.activeVswr <= 2.0 ? '#10B981' : '#FF3366';
    ctx.fill();
    ctx.strokeStyle = '#080C14';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // X-Axis Frequency Labels
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${minF.toFixed(1)}`, padL, height - 8);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00E5FF';
    ctx.fillText(`f₀=${params.frequencyMHz.toFixed(1)} MHz`, padL + plotW / 2, height - 8);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`${maxF.toFixed(1)}`, padL + plotW, height - 8);
  }, [params, calc]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="w-[290px] h-[165px]" />
      <div className="w-full flex items-center justify-between text-[11px] font-mono-num px-1 mt-1">
        <span className="text-[#94A3B8]">
          {lang === 'id' ? 'Lebar Pita (VSWR<2):' : '2:1 Bandwidth:'}{' '}
          <strong className="text-[#10B981]">
            {calc.bandwidthMHz.toFixed(1)} MHz ({calc.bandwidthPercent.toFixed(1)}%)
          </strong>
        </span>
        <span className="text-[#94A3B8]">
          S₁₁:{' '}
          <strong className={calc.activeS11Db <= -9.5 ? 'text-[#00E5FF]' : 'text-[#FFB300]'}>
            {calc.activeS11Db.toFixed(1)} dB
          </strong>
        </span>
      </div>
    </div>
  );
};
