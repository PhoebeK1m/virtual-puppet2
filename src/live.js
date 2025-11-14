// src/live.js
import { holistic, onResults, animateWithResults } from './components/mediapipe.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import { createOrbitRig } from './components/camera.js';
import { loadVRMModel } from './components/vrm.js';
import { loadBackground } from './components/background.js';


let currentVrm;
let mixer;
const clock = new THREE.Clock();

// Renderer 
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Scene and camera
const scene = new THREE.Scene();
const { orbitCamera } = createOrbitRig(renderer);
loadBackground(scene);

window.addEventListener('resize', () => {
    orbitCamera.aspect = window.innerWidth / window.innerHeight;
    orbitCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Loading VRM Model
const gltfLoader = new GLTFLoader();
gltfLoader.register(parser => new VRMLoaderPlugin(parser));
gltfLoader.register(parser => new VRMAnimationLoaderPlugin(parser));
gltfLoader.crossOrigin = 'anonymous';

loadVRMModel(scene, gltfLoader, '/viseme.vrm')
    .then(vrm => {
        currentVrm = vrm;
    })
.catch(err => console.error('Error loading VRM model:', err));

// Camera movement
const mouse = { x: 0, y: 0 };
window.addEventListener('mousemove', e => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

const camParams = {
    radius: 20,
    yawCenter: -Math.PI / 2,
    pitchCenter: 0,
    yawRange: Math.PI / 32,
    pitchRange: Math.PI / 64,
    smooth: 6,
};

let curYaw = camParams.yawCenter;
let curPitch = camParams.pitchCenter;

// Mediapipe stuffs
const videoEl = document.querySelector('.input_video');
const guideEl = document.querySelector('.guides');

holistic.onResults(onResults);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (currentVrm) {
    currentVrm.update(delta);
    animateWithResults(currentVrm);

    const targetYaw = camParams.yawCenter + mouse.x * camParams.yawRange;
    const targetPitch = camParams.pitchCenter + mouse.y * camParams.pitchRange;
    curYaw = THREE.MathUtils.damp(curYaw, targetYaw, camParams.smooth, delta);
    curPitch = THREE.MathUtils.damp(curPitch, targetPitch, camParams.smooth, delta);

    const p = currentVrm.scene.position, r = camParams.radius;
    orbitCamera.position.set(
      p.x + r * Math.sin(curYaw) * Math.cos(curPitch),
      p.y + r * Math.sin(curPitch),
      p.z + r * Math.cos(curYaw) * Math.cos(curPitch)
    );
    orbitCamera.lookAt(p);
  }

  if (mixer) mixer.update(delta);
  renderer.render(scene, orbitCamera);
}
animate();
