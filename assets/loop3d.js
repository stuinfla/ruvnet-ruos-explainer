import * as THREE from './vendor/three.module.js';

// ruOS loop: a deliberately small scene graph with a tactile, instrument-panel feel.
const INK = 0x050b13;
const DEEP = 0x0b1623;
const PANEL = 0x122439;
const MINT = 0x59f3d1;
const CYAN = 0x6dbbff;
const AMBER = 0xffc273;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function makeTextSprite(text, color = '#d8f6f0', size = 42, scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `600 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
  sprite.scale.set(3.2 * scale, 0.78 * scale, 1);
  return sprite;
}

function roundedPanel(width, height, depth, color, bevel = 0.12) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(bevel, width / 4, height / 4);
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y); shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r); shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 2, bevelSize: bevel * 0.45, bevelThickness: bevel * 0.45 });
  geometry.center();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.55 }));
}

function makeLine(points, color, radius = 0.025, opacity = 0.8) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const mesh = new THREE.Line(geometry, material);
  mesh.userData.radius = radius;
  return { mesh, points };
}

function pointOnPolyline(points, progress, target) {
  const count = points.length - 1;
  const scaled = clamp(progress, 0, 0.999999) * count;
  const index = Math.floor(scaled);
  return target.lerpVectors(points[index], points[index + 1], scaled - index);
}

function makeScreen() {
  const group = new THREE.Group();
  const bezel = roundedPanel(4.8, 2.82, 0.18, 0x0c1c2c, 0.16);
  group.add(bezel);
  const canvas = document.createElement('canvas');
  canvas.width = 900; canvas.height = 540;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 900, 540);
  grad.addColorStop(0, '#122b3d'); grad.addColorStop(1, '#07121e');
  let texture;
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 900, 540);
  ctx.strokeStyle = '#315068'; ctx.lineWidth = 3; ctx.strokeRect(32, 30, 836, 480);
  const paint = (index = 1) => {
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 900, 540);
    ctx.strokeStyle = '#315068'; ctx.lineWidth = 3; ctx.strokeRect(32, 30, 836, 480);
    const states = [
      ['SCREEN PICTURE  /  RESEARCH NOTE', 'research-note.md', 'UNSAVED', 'unknown → read'],
      ['ASSISTANT CHOOSES  /  ACTION SENT', 'research-note.md', 'ACTION SENT', 'unknown → click'],
      ['NEW PICTURE  /  VERIFY', 'research-note.md', 'SAVED', 'new picture → confirm']
    ];
    const state = states[index - 1] || states[0];
    ctx.fillStyle = '#aacbd7'; ctx.font = '500 40px sans-serif'; ctx.fillText('research-note.md', 60, 90);
    ctx.fillStyle = '#eafaf7'; ctx.font = '600 76px sans-serif'; ctx.fillText('A note. A real action.', 60, 210);
    ctx.fillStyle = '#436673'; [280, 315, 350].forEach((y,i)=>ctx.fillRect(60,y,550-i*70,9));
    const badges=['UNSAVED','RESULT UNKNOWN','SAVED'];
    ctx.fillStyle = index === 2 ? '#ffc273' : '#59f3d1'; ctx.font='700 56px sans-serif'; ctx.fillText(badges[index-1],60,460);
    ctx.fillStyle='#a7c6d2';ctx.font='32px sans-serif';ctx.fillText(index===2?'Ctrl+S sent':index===3?'Fresh picture checked':'Observe the screen',60,510);
    if (texture) texture.needsUpdate = true;
  };
  paint(1);
  texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.42, 2.48), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthTest: false }));
  screen.position.z = 0.34; screen.renderOrder = 10;
  group.add(screen);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.025), new THREE.MeshBasicMaterial({ color: MINT }));
  led.position.set(-1.75, -1.23, 0.1); group.add(led);
  return { group, paint };
}

export async function mount(host, { onPhase } = {}) {
  if (!host) throw new Error('loop3d.mount requires a host element');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Animated ruOS observe, act, verify control loop');
  host.appendChild(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (error) {
    canvas.remove();
    throw error;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  const scene = new THREE.Scene();
  renderer.setClearColor(INK, 0);
  const camera = new THREE.PerspectiveCamera(31, 2.2, 0.1, 60);
  camera.position.set(0, 4.5, 12); camera.lookAt(0, 0.45, 0);
  scene.add(new THREE.HemisphereLight(0x8fc5d0, 0x071019, 1.8));
  const key = new THREE.DirectionalLight(0x8ccfff, 3.2); key.position.set(-4, 8, 7); scene.add(key);
  const rim = new THREE.PointLight(MINT, 16, 12, 2); rim.position.set(0, 2.5, 1); scene.add(rim);

  const world = new THREE.Group(); scene.add(world);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(10, 64), new THREE.MeshStandardMaterial({ color: DEEP, roughness: 0.64, metalness: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.75; world.add(floor); floor.visible=false;
  const floorRing = new THREE.Mesh(new THREE.RingGeometry(5.7, 5.78, 96), new THREE.MeshBasicMaterial({ color: 0x214456, transparent: true, opacity: 0.65, side: THREE.DoubleSide }));
  floorRing.rotation.x = -Math.PI / 2; floorRing.position.y = -1.7; world.add(floorRing); floorRing.visible=false;

  const trackPoints = [new THREE.Vector3(-5.65, -0.45, 0.25), new THREE.Vector3(-3.5, -0.15, -0.35), new THREE.Vector3(0, 0.25, -0.62), new THREE.Vector3(3.5, -0.15, -0.35), new THREE.Vector3(5.65, -0.45, 0.25), new THREE.Vector3(3.4, -0.1, 1.05), new THREE.Vector3(0, 0.32, 1.28), new THREE.Vector3(-3.4, -0.1, 1.05)];
  const track = makeLine(trackPoints, CYAN, 0.035, 0.48); world.add(track.mesh);
  const halo = makeLine(trackPoints, MINT, 0.11, 0.06); world.add(halo.mesh);
  const phaseColors = [MINT, AMBER, CYAN];
  const stations = [{ x: -4.45, label: '01  OBSERVE', sub: 'SCREEN PICTURE', color: MINT }, { x: 0, label: '02  ACT', sub: 'ASSISTANT CHOOSES', color: AMBER }, { x: 4.45, label: '03  VERIFY', sub: 'NEW PICTURE', color: CYAN }];
  const stationGroups = [];
  stations.forEach((station, i) => {
    const g = new THREE.Group(); g.position.set(station.x, 0, i === 1 ? 0.7 : 0.08); world.add(g); stationGroups.push(g);
    const base = roundedPanel(2.38, 0.92, 0.26, PANEL, 0.1); base.position.y = -0.45; g.add(base);
    const inlay = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.035, 0.04), new THREE.MeshBasicMaterial({ color: station.color, transparent: true, opacity: 0.9 })); inlay.position.set(0, -0.03, 0.18); g.add(inlay);
    const number = makeTextSprite(String(i+1).padStart(2,'0'), `#${new THREE.Color(station.color).getHexString()}`, 96, 0.7); number.position.set(0.1, -0.40, 0.45); g.add(number);
    const sub = makeTextSprite(station.sub, '#9ab4bf', 20, 0.48); sub.position.set(0, -0.13, 0.25); g.add(sub); sub.visible=false;
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8), new THREE.MeshBasicMaterial({ color: station.color })); marker.position.set(-0.94, -0.13, 0.26); g.add(marker);
    const haloMat = new THREE.MeshBasicMaterial({ color: station.color, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const haloRing = new THREE.Mesh(new THREE.RingGeometry(0.19, 0.24, 24), haloMat); haloRing.position.set(-0.94, -0.13, 0.27); g.add(haloRing);
  });

  const screenAsset = makeScreen(); const screen = screenAsset.group; screen.position.set(0, 0.85, -0.25); screen.rotation.x = -0.04; world.add(screen);

  const packetGeometry = new THREE.SphereGeometry(0.12, 16, 12);
  const packets = phaseColors.map((color, i) => {
    const mesh = new THREE.Mesh(packetGeometry, new THREE.MeshBasicMaterial({ color }));
    world.add(mesh); return { mesh, progress: i / 3, speed: 0.055 + i * 0.008 };
  });
  const scratch = new THREE.Vector3();
  let phase = 0;
  let paused = false;
  let userPaused = false;
  let pageHidden = document.hidden;
  let offscreen = false;
  let disposed = false;
  let raf = 0;
  let last = performance.now();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const motionHandler = (event) => { if (event.detail && typeof event.detail.paused === 'boolean') setPaused(event.detail.paused); };
  const applyPause = () => { paused = userPaused || pageHidden || offscreen; host.dataset.paused = String(paused); };
  const visibilityHandler = () => { pageHidden = document.hidden; applyPause(); };
  const intersectionObserver = new IntersectionObserver(([entry]) => { offscreen = !entry.isIntersecting; applyPause(); }, { threshold: 0.02 });
  intersectionObserver.observe(host);
  window.addEventListener('ruos:motion', motionHandler);
  document.addEventListener('visibilitychange', visibilityHandler);
  if (reduced?.matches) userPaused = true;

  function setPhase(next) {
    const requested = Math.round(Number(next) || 1);
    phase = clamp(requested, 1, 3) - 1;
    host.dataset.phase = String(phase + 1);
    screenAsset.paint(phase + 1);
    stationGroups.forEach((group, i) => { group.scale.y = i === phase ? 1.08 : 1; });
    if (onPhase) onPhase(phase + 1);
  }
  function setPaused(value) { userPaused = Boolean(value); applyPause(); }
  function resize() {
    const width = Math.max(1, host.clientWidth || 1000); const height = Math.max(1, host.clientHeight || (width < 600 ? 340 : 440));
    const mobile=width<600; renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.set(0,2,mobile?11.7:12);world.scale.set(1,1,1);screen.scale.setScalar(mobile?1.2:1.7);stationGroups.forEach((g,i)=>{g.position.x=(i-1)*(mobile?2.1:4.45);g.position.y=-1.25;g.scale.setScalar(mobile?.64:1);});camera.updateProjectionMatrix();camera.lookAt(0,.35,0);

  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); resize();
  host.dataset.frames = '0'; setPhase(1); applyPause();

  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused) {
      world.rotation.y = Math.sin(now * 0.00014) * 0.035;
      stationGroups.forEach((group, i) => { group.position.y = -1.25 + Math.sin(now * 0.001 + i * 1.8) * 0.025; });
      packets.forEach((packet, i) => {
        packet.progress = (packet.progress + dt * packet.speed) % 1;
        pointOnPolyline(track.points, packet.progress, scratch); packet.mesh.position.copy(scratch);
        packet.mesh.scale.setScalar(0.86 + Math.sin(now * 0.008 + i) * 0.18);
      });
      rim.intensity = 13 + Math.sin(now * 0.003) * 2;
    }
    if (!offscreen && !pageHidden) { renderer.render(scene, camera); host.dataset.renderer = 'three-webgl'; host.dataset.frames = String(Number(host.dataset.frames || 0) + 1); }
  }
  raf = requestAnimationFrame(frame);

  return { setPhase, setPaused, dispose() {
    disposed = true; cancelAnimationFrame(raf); resizeObserver.disconnect(); intersectionObserver.disconnect(); window.removeEventListener('ruos:motion', motionHandler); document.removeEventListener('visibilitychange', visibilityHandler);
    scene.traverse((object) => { if (object.geometry) object.geometry.dispose(); if (object.material) { const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => { if (material.map) material.map.dispose(); material.dispose(); }); } });
    renderer.dispose(); canvas.remove();
  } };
}

export default { mount };
