// ============================================================================
//  Three.js scene: orthographic isometric camera, cozy lighting, soft shadows,
//  and a hand-rolled orbit/zoom controller that feels good on touch + mouse.
// ============================================================================

import * as THREE from '../vendor/three.module.js';
import { getShake } from './effects.js';

let renderer, scene, camera;
let canvas;
const target = new THREE.Vector3(0, 0, 0);

// Camera orbit parameters.
let azimuth = Math.PI * 0.25;   // 45° — classic iso
let elevation = 0.62;           // ~35° down-tilt
let zoom = 11;                  // ortho half-height in world units
let aspect = 1;
const RADIUS = 90;              // orbit distance (ortho: affects clipping only)
const MIN_ZOOM = 4, MAX_ZOOM = 75;
const MIN_ELEV = 0.30, MAX_ELEV = 1.15;

const clock = new THREE.Clock();
let renderCallbacks = [];

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function onFrame(cb) { renderCallbacks.push(cb); }
export function setCameraTarget(x, z) { target.set(x, 0, z); }

export function initScene(canvasEl) {
  canvas = canvasEl;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8e0ff);
  scene.fog = new THREE.Fog(0xd8e0ff, 70, 130);

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 240);

  setupLights();
  resize();
  bindControls();
  window.addEventListener('resize', resize);

  renderer.setAnimationLoop(loop);
  return { scene, camera, renderer };
}

function setupLights() {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbfcad6, 0.85);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.25);
  sun.position.set(14, 26, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  const s = 26;
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  // Soft cool fill from the opposite side to keep shadows from going muddy.
  const fill = new THREE.DirectionalLight(0xbcd4ff, 0.35);
  fill.position.set(-12, 10, -8);
  scene.add(fill);
}

function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  aspect = w / h;
  updateCamera();
}

function updateCamera() {
  if (!camera) return; // not initialised yet
  const ce = Math.cos(elevation), se = Math.sin(elevation);
  camera.position.set(
    target.x + RADIUS * ce * Math.sin(azimuth),
    target.y + RADIUS * se,
    target.z + RADIUS * ce * Math.cos(azimuth),
  );
  camera.lookAt(target);
  const halfH = zoom;
  const halfW = zoom * aspect;
  camera.left = -halfW;
  camera.right = halfW;
  camera.top = halfH;
  camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}

// Public camera nudges (used by on-screen buttons).
export function rotateCamera(delta) { azimuth += delta; updateCamera(); }
export function zoomCamera(factor) {
  zoom = THREE.MathUtils.clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM);
  updateCamera();
}
export function snapRotate(dir) {
  azimuth += dir * Math.PI / 2;
  updateCamera();
}

// Frame the whole office (footprint W×D) into view, accounting for aspect ratio
// so it fits on tall phones and isn't lost on a huge campus. Called on load and
// whenever the office expands.
export function fitView(W, D) {
  const radius = 0.34 * (W + D);     // approx iso half-extent of the footprint
  const needed = Math.max(radius, radius / aspect) * 1.12;
  zoom = THREE.MathUtils.clamp(needed, MIN_ZOOM, MAX_ZOOM);
  updateCamera();
}

// ---- Pointer controls: drag to orbit, wheel/pinch to zoom -----------------
function bindControls() {
  const pointers = new Map();
  let lastX = 0, lastY = 0, lastPinch = 0;

  const getPos = (e) => ({ x: e.clientX, y: e.clientY });

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, getPos(e));
    lastX = e.clientX; lastY = e.clientY;
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, getPos(e));

    if (pointers.size >= 2) {
      // Pinch zoom.
      const pts = [...pointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinch > 0) zoomCamera(lastPinch / d);
      lastPinch = d;
      return;
    }
    // Single-pointer orbit.
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    azimuth -= dx * 0.008;
    elevation = THREE.MathUtils.clamp(elevation + dy * 0.006, MIN_ELEV, MAX_ELEV);
    updateCamera();
  });

  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinch = 0;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', end);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomCamera(e.deltaY > 0 ? 1.1 : 0.9);
  }, { passive: false });
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  for (const cb of renderCallbacks) cb(dt, t);
  // Apply a transient camera shake for dopamine/viral hits, then restore.
  const sh = getShake();
  if (sh) {
    camera.position.x += sh.x; camera.position.y += sh.y;
    renderer.render(scene, camera);
    camera.position.x -= sh.x; camera.position.y -= sh.y;
  } else {
    renderer.render(scene, camera);
  }
}
