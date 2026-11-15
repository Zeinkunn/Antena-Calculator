# RF-VNA 3D — Interactive 3D Antenna Simulator & RF Calculator

Single-Page Interactive 3D Antenna Simulator, Fabrication Cut Sheet Calculator, and Electromagnetic Signal Boom Visualizer built with **React**, **TypeScript**, **Three.js**, and **Tailwind CSS**.

## Features
- **8 Parametric 3D Antenna Models**:
  - Yagi-Uda Boom Array (with progressive DL6WU/NBS spacing & element length taper)
  - Half-Wave Dipole ($\lambda/2$)
  - Quarter-Wave Ground Plane Monopole ($\lambda/4$)
  - Parabolic Dish Reflector
  - Axial-Mode Helical Spiral
  - Microstrip Patch PCB Antenna
  - Biquad Loop with Reflector
  - Pyramidal Horn Waveguide
- **Real-Time 3D Electromagnetic Visualization**:
  - Signal Boom particle & wavefront pulse animation
  - 3D Far-Field Radiation Lobe (rainbow dBi gain heatmap)
  - Orthogonal E-Field & H-Field wave propagation vectors
  - Per-element length and progressive inter-element spacing CAD callouts in 3D
- **RF Telemetry & Link Budget**:
  - 2D E-Plane & H-Plane Polar Radiation Pattern
  - VSWR & Return Loss ($S_{11}$) Bandwidth Sweep
  - Friis Free-Space Path Loss (FSPL), EIRP, Fresnel Zone $F_1$, and Signal Strength (RSSI / SNR) Simulator
  - Exportable Cut Sheet (CSV & Clipboard) and Bilingual UI (`ID` / `EN`)

## Quick Start

```bash
npm install
npm run dev
```

## Build for Production (Vercel / Static Hosting)

```bash
npm run build
```

---
Built by **Zein ([@Zeinkunn](https://github.com/Zeinkunn))**
