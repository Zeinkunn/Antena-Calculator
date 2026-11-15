import * as THREE from 'three';

/**
 * Creates a razor-sharp high-DPI 3D billboard Sprite label for CAD dimensions, element sizes, and inter-element spacings
 */
export function createLabelSprite(
  text: string,
  subtext?: string,
  borderColor = '#00E5FF',
  scale = 0.72
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Measure text dynamically so the pill fits the text tightly without wasted width or clipping
  ctx.font = '700 30px "JetBrains Mono", monospace';
  const mainMetrics = ctx.measureText(text);
  let maxTextW = mainMetrics.width;

  if (subtext) {
    ctx.font = '500 22px "JetBrains Mono", monospace';
    const subMetrics = ctx.measureText(subtext);
    maxTextW = Math.max(maxTextW, subMetrics.width);
  }

  const padX = 28;
  const width = Math.max(220, Math.ceil(maxTextW + padX * 2 + 24));
  const height = subtext ? 116 : 76;

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  const pad = 6;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const r = 14;

  // Crisp dark glass CAD pill background
  ctx.fillStyle = 'rgba(8, 12, 20, 0.92)';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(pad + w - r, pad);
  ctx.quadraticCurveTo(pad + w, pad, pad + w, pad + r);
  ctx.lineTo(pad + w, pad + h - r);
  ctx.quadraticCurveTo(pad + w, pad + h, pad + w - r, pad + h);
  ctx.lineTo(pad + r, pad + h);
  ctx.quadraticCurveTo(pad, pad + h, pad, pad + h - r);
  ctx.lineTo(pad, pad + r);
  ctx.quadraticCurveTo(pad, pad, pad + r, pad);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left color indicator bar
  ctx.fillStyle = borderColor;
  ctx.fillRect(pad + 10, pad + 12, 5, h - 24);

  // Main text
  ctx.font = '700 28px "JetBrains Mono", monospace';
  ctx.fillStyle = '#F8FAFC';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad + 24, subtext ? pad + h * 0.36 : pad + h * 0.52);

  if (subtext) {
    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillStyle = borderColor;
    ctx.fillText(subtext, pad + 24, pad + h * 0.72);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  const aspect = width / height;
  const baseH = subtext ? 0.28 : 0.2;
  sprite.scale.set(scale * baseH * aspect, scale * baseH, 1);
  sprite.renderOrder = 999;
  return sprite;
}

/**
 * Creates a 3D CAD dimension callout line between point A and point B with end ticks and a floating label
 */
export function createDimensionCallout(
  pointA: THREE.Vector3,
  pointB: THREE.Vector3,
  offsetVec: THREE.Vector3,
  label: string,
  sublabel?: string,
  colorHex = '#00E5FF',
  labelScale = 0.72
): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color(colorHex);

  const start = pointA.clone().add(offsetVec);
  const end = pointB.clone().add(offsetVec);

  const lineMat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
  });

  // Main dimension line
  const mainGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
  const mainLine = new THREE.Line(mainGeo, lineMat);
  mainLine.renderOrder = 900;
  group.add(mainLine);

  // Extension lines from object to dimension line
  const extMat = new THREE.LineDashedMaterial({
    color,
    dashSize: 0.06,
    gapSize: 0.04,
    transparent: true,
    opacity: 0.5,
    depthTest: false,
  });

  const extAGeo = new THREE.BufferGeometry().setFromPoints([pointA, start]);
  const extALine = new THREE.Line(extAGeo, extMat);
  extALine.computeLineDistances();
  group.add(extALine);

  const extBGeo = new THREE.BufferGeometry().setFromPoints([pointB, end]);
  const extBLine = new THREE.Line(extBGeo, extMat);
  extBLine.computeLineDistances();
  group.add(extBLine);

  // Small end spheres as CAD terminators
  const dotGeo = new THREE.SphereGeometry(0.028, 10, 10);
  const dotMat = new THREE.MeshBasicMaterial({ color, depthTest: false });
  const dotA = new THREE.Mesh(dotGeo, dotMat);
  dotA.position.copy(start);
  const dotB = new THREE.Mesh(dotGeo, dotMat);
  dotB.position.copy(end);
  group.add(dotA, dotB);

  // Midpoint sprite label
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const labelOffset =
    offsetVec.length() > 0.01
      ? offsetVec.clone().normalize().multiplyScalar(0.16)
      : new THREE.Vector3(0, 0.16, 0);
  const sprite = createLabelSprite(label, sublabel, colorHex, labelScale);
  sprite.position.copy(mid).add(labelOffset);
  group.add(sprite);

  return group;
}

/**
 * Creates a direct 3D pointer leader line from a point on an element to a floating label
 */
export function createPointCallout(
  anchorPoint: THREE.Vector3,
  offsetVec: THREE.Vector3,
  label: string,
  sublabel?: string,
  colorHex = '#00E5FF',
  labelScale = 0.65
): THREE.Group {
  const group = new THREE.Group();
  const color = new THREE.Color(colorHex);
  const target = anchorPoint.clone().add(offsetVec);

  const lineMat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7,
    depthTest: false,
  });
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([anchorPoint, target]),
    lineMat
  );
  line.renderOrder = 900;
  group.add(line);

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.026, 8, 8),
    new THREE.MeshBasicMaterial({ color, depthTest: false })
  );
  dot.position.copy(anchorPoint);
  group.add(dot);

  const sprite = createLabelSprite(label, sublabel, colorHex, labelScale);
  sprite.position.copy(target);
  group.add(sprite);

  return group;
}
