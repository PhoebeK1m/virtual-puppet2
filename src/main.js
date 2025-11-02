// src/main.js

// Imports (ESM)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMUtils, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { createOrbitRig } from './components/camera.js';
import { loadVRMModel } from './components/vrm.js';
import { loadVRMA, playVRMAAnimation, stopVRMAAnimation } from './components/vrma.js';
import { loadBackground } from './components/background.js';
import { holistic, onResults, animateWithResults } from './components/mediapipe.js';

// Global
let currentVrm;
let mixer;
let vrmaClip = null;
let vrmaAction = null;
let isVRMAPlaying = false;
const clock = new THREE.Clock();
const videoEl = document.querySelector('.input_video');
const guideEl = document.querySelector('.guides');
videoEl.classList.add('hidden');
guideEl.classList.add('hidden');

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true }); // alpha: true
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
// scene.add(new THREE.AxesHelper(100)); // delete later

// Camera
const { orbitCamera } = createOrbitRig(renderer);

// Handle resize
window.addEventListener('resize', () => {
  orbitCamera.aspect = window.innerWidth / window.innerHeight;
  orbitCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Background + Lights
loadBackground(scene);

// VRM load (from /public)
const gltfLoader = new GLTFLoader();

// Enable VRM and VRMA parsing on GLTFLoader
gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
gltfLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
gltfLoader.crossOrigin = 'anonymous';

// Load VRM model asynchronously
loadVRMModel(scene, gltfLoader, '/viseme.vrm')
  .then((vrm) => {
    currentVrm = vrm;  // Set currentVrm once it is loaded

    // Load VRMA animation after the VRM model is loaded
    loadVRMA(gltfLoader, currentVrm, './talking.vrma', (clip) => {
      vrmaClip = clip;
      if (!mixer) mixer = new THREE.AnimationMixer(currentVrm.scene);
      vrmaAction = playVRMAAnimation(mixer, vrmaClip, currentVrm);
      isVRMAPlaying = true;
    });
  })
  .catch((error) => {
    console.error('Error loading VRM model:', error);
});

// Play/stop VRMA animation
// function toggleVRMA() {
//   if (isVRMAPlaying) {
//     stopVRMAAnimation(vrmaAction);
//     isVRMAPlaying = false;
//     videoEl.classList.remove('hidden');
//     guideEl.classList.remove('hidden');
//   } else {
//     if (!mixer) mixer = new THREE.AnimationMixer(currentVrm.scene);
//     vrmaAction = playVRMAAnimation(mixer, vrmaClip, currentVrm);
//     isVRMAPlaying = true;
//     videoEl.classList.add('hidden');
//     guideEl.classList.add('hidden');
//   }
// }

function stopVideoStream(videoEl) {
  if (videoEl && videoEl.srcObject) {
    const stream = videoEl.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());  // stops camera + mic
    videoEl.srcObject = null;
  }
}


function toggleVRMA() {
  if (isVRMAPlaying) {
    // Stop animation → go to live mode
    stopVRMAAnimation(vrmaAction);
    isVRMAPlaying = false;
    videoEl.classList.remove('hidden');
    guideEl.classList.remove('hidden');

    // 🔹 Start camera
    camera.start();

    // Also start processing again if using a manual loop
    // processVideoFrame();
  } else {
    // Stop live → play idle animation
    if (!mixer) mixer = new THREE.AnimationMixer(currentVrm.scene);
    vrmaAction = playVRMAAnimation(mixer, vrmaClip, currentVrm);
    isVRMAPlaying = true;
    videoEl.classList.add('hidden');
    guideEl.classList.add('hidden');

    // 🔹 Stop camera completely
    camera.stop();
    stopVideoStream(videoEl);
  }
}

// Listen for toggle button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('toggleIdle');
  if (btn) btn.addEventListener('click', toggleVRMA);
});

// mouse/camera movement
const mouse = { x: 0, y: 0 };

window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

const camParams = {
  radius: 20,
  yawCenter: -Math.PI/2,
  pitchCenter: 0,
  yawRange: Math.PI / 32,   // left/right limit
  pitchRange: Math.PI / 64, // up/down limit
  smooth: 6,
};

let curYaw = camParams.yawCenter;
let curPitch = camParams.pitchCenter;

// animation: vrm + camera
holistic.onResults(onResults);

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (currentVrm) {
    currentVrm.update(delta);
    if (!isVRMAPlaying){
      // console.log("Humanoid bones:", currentVrm.humanoid?.humanBones);
      animateWithResults(currentVrm);
    }
    const targetYaw = THREE.MathUtils.clamp(
        camParams.yawCenter + mouse.x * camParams.yawRange,
        camParams.yawCenter - camParams.yawRange,
        camParams.yawCenter + camParams.yawRange
    );

    const targetPitch = THREE.MathUtils.clamp(
      camParams.pitchCenter + mouse.y * camParams.pitchRange,
      camParams.pitchCenter - camParams.pitchRange,
      camParams.pitchCenter + camParams.pitchRange
    );

    curYaw   = THREE.MathUtils.damp(curYaw,   targetYaw,   camParams.smooth, delta);
    curPitch = THREE.MathUtils.damp(curPitch, targetPitch, camParams.smooth, delta);

    const p = currentVrm.scene.position, r = camParams.radius;
    orbitCamera.position.set(
      p.x + r * Math.sin(curYaw) * Math.cos(curPitch),
      p.y + r * Math.sin(curPitch),
      p.z + r * Math.cos(curYaw) * Math.cos(curPitch),
    );
    orbitCamera.lookAt(p);
  }
  if (mixer) mixer.update(delta);

  renderer.render(scene, orbitCamera);
}

animate();

// Select the input and button
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

// Function to show a chat bubble response
function showChatResponse(text) {
  const chatArea = document.getElementById('chat-area');
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.innerHTML = `<span>${text}</span>`;
  chatArea.appendChild(bubble);

  // Remove the bubble after 10 seconds
  setTimeout(() => {
    bubble.remove();
  }, 10000);
}

// Handle send button click
sendBtn.addEventListener('click', () => {
  const message = chatInput.value.trim();
  if (message) {
    console.log("User:", message); // your logic here
    chatInput.value = '';

    // Example: generate a chatbot reply
    const reply = "You said: " + message;
    showChatResponse(reply);
  }
});

// Optional: press Enter to send
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendBtn.click();
  }
});
