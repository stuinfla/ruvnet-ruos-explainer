import * as THREE from './vendor/three.module.js';

function labelTexture(lines, options = {}) {
  const width = options.width || 1024;
  const height = options.height || 640;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const bg = options.background || '#10242b';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = options.accent || '#4be3c8';
  ctx.fillRect(0, 0, width, 12);
  ctx.font = `${options.titleSize || 48}px Inter, Arial, sans-serif`;
  ctx.fillText(options.title || 'ruOS', 46, 68);
  ctx.font = `${options.bodySize || 34}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textBaseline = 'top';
  lines.forEach((line, index) => {
    ctx.fillStyle = line.color || (index === lines.length - 1 ? '#f5eedf' : '#9bb5bb');
    ctx.fillText(line.text, line.x || 46, line.y || 116 + index * 48);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.userData = { canvas, ctx, width, height, options };
  return texture;
}

function roleTexture(index) {
  const c=document.createElement('canvas');c.width=480;c.height=270;const x=c.getContext('2d');const color=index===1?'#ffd18b':'#6befd3';
  x.fillStyle='#10242f';x.fillRect(0,0,480,270);x.fillStyle=color;x.fillRect(0,0,480,9);x.strokeStyle=color;x.lineWidth=10;x.lineCap='round';
  if(index===0){x.beginPath();x.ellipse(240,107,102,57,0,0,Math.PI*2);x.stroke();x.beginPath();x.arc(240,107,24,0,Math.PI*2);x.stroke();}
  else if(index===1){x.beginPath();x.moveTo(208,40);x.lineTo(208,160);x.lineTo(238,127);x.lineTo(267,174);x.lineTo(288,161);x.lineTo(259,113);x.lineTo(303,109);x.closePath();x.stroke();}
  else{x.beginPath();x.arc(240,77,31,0,Math.PI*2);x.stroke();x.beginPath();x.arc(240,161,63,Math.PI,0);x.stroke();}
  x.fillStyle='#eafaf6';x.font='600 54px sans-serif';x.textAlign='center';x.fillText(['Observe','Act','You'][index],240,238);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function paintTexture(texture, lines) {
  const { canvas, ctx, width, height, options } = texture.userData;
  ctx.fillStyle = options.background || '#10242b'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = options.accent || '#4be3c8'; ctx.fillRect(0, 0, width, 12);
  ctx.font = `${options.titleSize || 48}px Inter, Arial, sans-serif`; ctx.fillText(options.title || 'ruOS', 46, 68);
  ctx.font = `${options.bodySize || 34}px ui-monospace, SFMono-Regular, Menlo, monospace`; ctx.textBaseline = 'top';
  lines.forEach((line, index) => { ctx.fillStyle = line.color || (index === lines.length - 1 ? '#f5eedf' : '#9bb5bb'); ctx.fillText(line.text, line.x || 46, line.y || 116 + index * 48); });
  texture.needsUpdate = true;
}

function roundedPanel(width, height, depth, material, radius = 0.16) {
  const shape = new THREE.Shape();
  const x = -width / 2; const y = -height / 2;
  shape.moveTo(x + radius, y); shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.02, bevelSegments: 2 });
  geometry.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geometry, material);
}

function edgeLoop(width, height, z, color = 0x4be3c8) {
  const points = [
    new THREE.Vector3(-width / 2, -height / 2, z), new THREE.Vector3(width / 2, -height / 2, z),
    new THREE.Vector3(width / 2, height / 2, z), new THREE.Vector3(-width / 2, height / 2, z),
    new THREE.Vector3(-width / 2, -height / 2, z)
  ];
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
}

function trail(points, color) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.012, 5, false), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }));
}

export async function mount(host, { label = 'ruOS' } = {}) {
  if (!host) throw new Error('hero3d.mount requires a host element');
  if (host.dataset.renderer === 'three-webgl') return host.__ruosHero?.destroy?.();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (error) {
    host.dataset.renderer = 'fallback';
    throw error;
  }
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 100);
  camera.position.set(0, 0.15, 12);
  camera.lookAt(0, 0, 0);
  const root = new THREE.Group();
  scene.add(root);
  const chrome = new THREE.MeshStandardMaterial({ color: 0x2a454d, metalness: 0.78, roughness: 0.2 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x153039, metalness: 0.35, roughness: 0.16, transmission: 0.12, transparent: true, opacity: 0.98, clearcoat: 0.9 });
  const mint = new THREE.MeshBasicMaterial({ color: 0x4be3c8, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending });
  const frame = roundedPanel(7.25, 4.55, 0.48, chrome, 0.25);
  frame.position.z = -0.2;
  root.add(frame);
  const display = roundedPanel(6.75, 4.05, 0.055, glass, 0.17);
  display.position.z = 0.02;
  root.add(display);
  root.add(edgeLoop(6.82, 4.12, 0.07));
  const screenStates = {
    observe: [{ text: 'You + your assistant', y: 142, color: '#f5eedf' }, { text: 'SCREEN PICTURE', y: 252, color: '#c6d8d5' }, { text: 'research-note.md', y: 362, color: '#ffd18b' }],
    act: [{ text: 'You + your assistant', y: 142, color: '#f5eedf' }, { text: 'ASSISTANT ACTION', y: 252, color: '#ffd18b' }, { text: 'result unknown', y: 362, color: '#c6d8d5' }],
    verify: [{ text: 'You + your assistant', y: 142, color: '#f5eedf' }, { text: 'FRESH PICTURE', y: 252, color: '#c6d8d5' }, { text: 'Saved · confirmed', y: 362, color: '#4be3c8' }]
  };
  const screenTexture = labelTexture(screenStates.observe, { title: 'research-note.md', titleSize: 52, bodySize: 60 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.45, 3.75), new THREE.MeshBasicMaterial({ map: screenTexture, transparent: true }));
  screen.position.z = 0.07;
  root.add(screen);
  const windows = [];
  const windowData = [
    { title: 'SCREEN PICTURE', lines: [{ text: 'observe' }, { text: 'new picture', color: '#4be3c8' }], pos: [-3.3, 2.25, 0.8], rot: 0.08, scale: 0.56 },
    { title: 'ASSISTANT ACTION', lines: [{ text: 'act' }, { text: 'check next', color: '#ffd18b' }], pos: [3.5, -1.35, 0.8], rot: -0.1, scale: 0.62 },
    { title: 'HUMAN VIEW', lines: [{ text: 'watch or take over' }, { text: 'shared screen', color: '#4be3c8' }], pos: [3.5, 1.7, 0.8], rot: -0.13, scale: 0.5 }
  ];
  windowData.forEach((data, index) => {
    const panel = roundedPanel(3.3, 1.9, 0.08, new THREE.MeshStandardMaterial({ color: 0x101e26, metalness: 0.5, roughness: 0.26 }), 0.12);
    const texture = roleTexture(index);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.14, 1.74), new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
    panel.add(face); face.position.z = 0.11; panel.position.set(...data.pos); panel.rotation.z = data.rot; panel.scale.setScalar(data.scale);
    root.add(panel); windows.push({ panel, base: panel.position.clone(), phase: index * 1.8 });
  });
  const cursorShape = new THREE.Shape();
  cursorShape.moveTo(0, 0); cursorShape.lineTo(0, -0.8); cursorShape.lineTo(0.22, -0.59); cursorShape.lineTo(0.39, -0.92); cursorShape.lineTo(0.55, -0.83); cursorShape.lineTo(0.36, -0.51); cursorShape.lineTo(0.7, -0.49); cursorShape.closePath();
  const cursor = new THREE.Mesh(new THREE.ShapeGeometry(cursorShape), new THREE.MeshBasicMaterial({ color: 0xffd18b }));
  cursor.scale.setScalar(0.36); cursor.position.set(0.8, -0.65, 0.32); root.add(cursor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.55, 0.018, 8, 96), new THREE.MeshBasicMaterial({ color: 0x4be3c8, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending }));
  ring.rotation.x = Math.PI / 2.05; ring.position.y = -2.48; ring.position.z = -0.45; root.add(ring);
  root.add(trail([new THREE.Vector3(-4.1, -1.8, -0.4), new THREE.Vector3(-2.7, -1.2, 0), new THREE.Vector3(-1.4, -1.7, 0.2), new THREE.Vector3(-0.4, -1.05, 0.28)], 0x4be3c8));
  root.add(trail([new THREE.Vector3(1.5, 1.7, -0.5), new THREE.Vector3(2.5, 1.3, 0), new THREE.Vector3(3.8, 1.8, 0.25)], 0xffd18b));
  scene.add(new THREE.HemisphereLight(0x9af5e5, 0x18333b, 2.6));
  const key = new THREE.PointLight(0x4be3c8, 18, 15); key.position.set(-3, 3, 5); scene.add(key);
  const fill = new THREE.PointLight(0xffc27a, 11, 14); fill.position.set(4, -1, 4); scene.add(fill);
  const rim = new THREE.PointLight(0x5a9cff, 8, 12); rim.position.set(0, -3, -2); scene.add(rim);
  const reducedQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)'); let reduced = Boolean(reducedQuery?.matches);
  let userPaused = false; let visible = true; let disposed = false; let frameId = 0; let last = performance.now(); let elapsed = 0; let pointerX = 0; let pointerY = 0; let lastPhase = 'observe'; let rendered = false;
  const baseTiltX = 0.035; const baseTiltY = -0.14; root.rotation.set(baseTiltX, baseTiltY, 0);
  const resize = () => { const width = Math.max(1, host.clientWidth || 620); const height = Math.max(1, host.clientHeight || 580); const aspect = width / height; const compact = aspect <= 0.95; const span = compact ? 5.15 : 5; camera.left = -span * aspect; camera.right = span * aspect; camera.top = span * 0.82; camera.bottom = -span * 0.82; camera.updateProjectionMatrix(); root.scale.setScalar(compact ? 0.85 : 1); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2)); renderer.setSize(width, height, false); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const visibility = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: 0.02 }); visibility.observe(host);
  const onPointer = event => { const rect = host.getBoundingClientRect(); pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2; pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2; };
  const onMotion = event => { userPaused = Boolean(event.detail?.paused); };
  const onReducedMotion = event => { reduced = event.matches; };
  const onDocumentVisibility = () => { visible = !document.hidden; };
  host.addEventListener('pointermove', onPointer); window.addEventListener('ruos:motion', onMotion); host.replaceChildren(renderer.domElement); host.dataset.renderer = 'three-webgl'; host.dataset.phase = 'observe'; host.dataset.frames = '0';
  reducedQuery?.addEventListener?.('change', onReducedMotion); document.addEventListener('visibilitychange', onDocumentVisibility);
  const animate = now => {
    if (disposed) return;
    frameId = requestAnimationFrame(animate);
    const delta = Math.min(0.05, (now - last) / 1000); last = now;
    const idle = userPaused || reduced || !visible || document.hidden;
    if (!idle) elapsed += delta;
    const phase = elapsed % 7; const state = phase < 2.25 ? 'observe' : phase < 4.65 ? 'act' : 'verify'; host.dataset.phase = state;
    if (state !== lastPhase) { paintTexture(screenTexture, screenStates[state]); lastPhase = state; }
    if (!idle) { const targetX = baseTiltX - pointerY * 0.08; const targetY = baseTiltY + pointerX * 0.11; root.rotation.y += (targetY - root.rotation.y) * 0.04; root.rotation.x += (targetX - root.rotation.x) * 0.04; root.position.y = Math.sin(elapsed * 0.65) * 0.045; ring.rotation.z = elapsed * 0.045; cursor.position.x = state === 'act' ? 0.2 + Math.sin(phase * 2) * 0.12 : 0.82; cursor.position.y = -1.2; windows.forEach(item => { item.panel.position.y = item.base.y + Math.sin(elapsed * 0.7 + item.phase) * 0.06; }); renderer.render(scene, camera); rendered = true; host.dataset.frames = String(Number(host.dataset.frames || 0) + 1); } else if (!rendered) { renderer.render(scene, camera); rendered = true; host.dataset.frames = String(Number(host.dataset.frames || 0) + 1); }
  };
  animate(performance.now());
  const destroy = () => { disposed = true; cancelAnimationFrame(frameId); observer.disconnect(); visibility.disconnect(); host.removeEventListener('pointermove', onPointer); window.removeEventListener('ruos:motion', onMotion); reducedQuery?.removeEventListener?.('change', onReducedMotion); document.removeEventListener('visibilitychange', onDocumentVisibility); scene.traverse(object => { object.geometry?.dispose?.(); if (Array.isArray(object.material)) object.material.forEach(material => material.dispose()); else object.material?.dispose?.(); }); renderer.dispose(); host.dataset.renderer = 'fallback'; };
  host.__ruosHero = { destroy };
  window.addEventListener('pagehide', destroy, { once: true });
  return { destroy, renderer, scene };
}
