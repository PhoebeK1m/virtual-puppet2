// src/chat.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import { createOrbitRig } from './components/camera.js';
import { loadVRMModel } from './components/vrm.js';
import { loadVRMA, playVRMAAnimation, stopVRMAAnimation } from './components/vrma.js';
import { loadBackground } from './components/background.js';

// Global state
let currentVrm;
let mixer;
let idleClip = null;
let talkingClip = null;
let danceClip = null;

let danceAction = null;
let idleAction = null;
let talkingAction = null;

let isProcessingMessage = false;
let isDancing = false;


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

// Resize Handling
window.addEventListener('resize', () => {
    orbitCamera.aspect = window.innerWidth / window.innerHeight;
    orbitCamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Loading VRM + premade animation
const gltfLoader = new GLTFLoader();
gltfLoader.register(parser => new VRMLoaderPlugin(parser));
gltfLoader.register(parser => new VRMAnimationLoaderPlugin(parser));
gltfLoader.crossOrigin = 'anonymous';

loadVRMModel(scene, gltfLoader, '/viseme.vrm')
    .then(vrm => {
        currentVrm = vrm;
        mixer = new THREE.AnimationMixer(currentVrm.scene);

        // Load idle animation first
        loadVRMA(gltfLoader, currentVrm, '/idle.vrma', clip => {
            idleClip = clip;
            idleAction = mixer.clipAction(idleClip);
            idleAction.play(); // start looping immediately
        });

        // Load talking animation next
        loadVRMA(gltfLoader, currentVrm, '/talking.vrma', clip => {
            talkingClip = clip;
            talkingAction = mixer.clipAction(talkingClip);
            talkingAction.loop = THREE.LoopRepeat;
            talkingAction.clampWhenFinished = true;
        });
        // Load dancing animation
        loadVRMA(gltfLoader, currentVrm, '/dance.vrma', clip => {
            danceClip = clip;
            danceAction = mixer.clipAction(danceClip);
            danceAction.loop = THREE.LoopRepeat;
        });
    })
.catch(err => console.error('Error loading VRM:', err));


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

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (currentVrm) {
        currentVrm.update(delta);
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

function playTalkingAnimation() {
    if (!mixer || !talkingAction || !idleAction) return;

    idleAction.enabled = true;
    talkingAction.enabled = true;

    talkingAction.reset();
    talkingAction.setEffectiveTimeScale(1);
    talkingAction.setEffectiveWeight(1);
    talkingAction.play();

    idleAction.crossFadeTo(talkingAction, 0.6, false);
}

function stopTalkingAnimation() {
    if (!mixer || !talkingAction || !idleAction) return;

    idleAction.enabled = true;
    talkingAction.enabled = true;

    talkingAction.crossFadeTo(idleAction, 1, false);

    setTimeout(() => {
        idleAction.reset().play();
    }, 800);
}

// Simple Chat UI
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

function showChatResponse(text) {
    const chatArea = document.getElementById('chat-area');

    const existing = chatArea.querySelector('.chat-bubble');
    if (existing) existing.remove();

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble loading';
    bubble.innerHTML = `<span></span>`;
    chatArea.appendChild(bubble);

    playTalkingAnimation();

    void bubble.offsetWidth;
    setTimeout(() => {
        bubble.querySelector('span').textContent = text;
        bubble.classList.remove('loading');
    }, 150);

    const duration = Math.min(10000, 2000 + text.length * 50);

    setTimeout(() => {
        bubble.remove();
        stopTalkingAnimation();
    }, duration);
}

function triggerDanceMode() {
    if (!mixer || !danceAction || !idleAction) return;
    isDancing = true;

    idleAction.enabled = true;
    danceAction.enabled = true;

    danceAction.reset();
    danceAction.setEffectiveTimeScale(1);
    danceAction.setEffectiveWeight(1);
    danceAction.play();

    idleAction.crossFadeTo(danceAction, 0.6, false);
}

function stopDanceMode() {
    if (!mixer || !danceAction || !idleAction) return;
    isDancing = false;

    danceAction.crossFadeTo(idleAction, 1, false);
    idleAction.reset().play();
}

function playSong() {
    const audio1 = document.getElementById("dance-audio-1");
    const audio2 = document.getElementById("dance-audio-2");

    // const randomChoice = Math.random() < 0.5 ? audio1 : audio2;
    const randomChoice = audio2;

    // Stop both before playing
    audio1.pause(); audio1.currentTime = 0;
    audio2.pause(); audio2.currentTime = 0;

    fadeIn(randomChoice);
    randomChoice.onended = () => {
        stopDanceMode(); 
    };
}

function stopSong() {
    const audio1 = document.getElementById("dance-audio-1");
    const audio2 = document.getElementById("dance-audio-2");

    [audio1, audio2].forEach(a => {
        a.pause();
        a.currentTime = 0;
    });
}

function fadeIn(audio) {
    audio.volume = 0;
    audio.play();
    let v = 0;
    const fade = setInterval(() => {
        v += 0.05;
        audio.volume = v;
        if (v >= 1) clearInterval(fade);
    }, 100);
}

sendBtn.addEventListener('click', async () => {
    if (isProcessingMessage) return;
    isProcessingMessage = true;

    const message = chatInput.value.trim();
    if (!message) {
        isProcessingMessage = false;
        return;
    }
    if (!message) return;
    console.log('User:', message);
    chatInput.value = '';

    if (isDancing) {
        stopDanceMode();
        stopSong();
        isDancing = false;
    }

    const lower = message.toLowerCase();
    if (lower.includes("dance") || lower.includes("song") || lower.includes("sing")) {
        triggerDanceMode();
        playSong();     
        showChatResponse("Okay! Here's my dance! hehe");
        setTimeout(() => { isProcessingMessage = false; }, 1500);
        return;
    }
    try {
        const aiReply = await sendMessageToAzure(message);
        showChatResponse(aiReply);
        setTimeout(() => { isProcessingMessage = false; }, 1500);
    } catch (err) {
        console.error('Error from Azure:', err);
        showChatResponse(`Oops! I forgot to add more credits. In the mean time... 
            my name is Phoebe! Please click the upper right scroll icon to see my
            portfolio! See you later :)`);
        setTimeout(() => { isProcessingMessage = false; }, 1500);
    }
});

chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendBtn.click();
});

// Sending request to backend on netlify
async function sendMessageToAzure(prompt) {
    const response = await fetch("/.netlify/functions/azureServer", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({
        messages: [
            { role: "system", content: `
                You are Phoebe Kim, a computer science student at UT Austin. You currently work at the 
                Nuclear Engineering Lab where you manage a PostgreSQL database
                on TACC and deployed Txt2SQL chatbot with graphing feature on AWS EC2. You also have a
                passion for computer-human interactions, such as virtual reality, and have been working
                on a personal project of cloning yourself, inspired by VTubers. You love your dog, 3d art,
                and coffee/matcha. Your favorite show is Adventure Time. Respond confidently within 3 sentences.
                `
            },
            { role: "user", content: prompt },
        ],
        max_tokens: 150
        }),
    });

    const data = await response.json();

    // Extract the AI's response
    const reply = data?.choices?.[0]?.message?.content ?? "I probably ran out of credits. Talk to me later.";
    return reply;
}

// Password Gate
const PASSWORD = "beansbeans"; 
const screen = document.getElementById("password-screen");
const input = document.getElementById("password-input");

const errorMsg = document.getElementById("password-error");

// Prevent access until unlocked
document.body.style.overflow = "hidden";

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkPassword();
});

function checkPassword() {
    if (input.value.trim().toLowerCase() === PASSWORD.toLowerCase()) {
        screen.classList.add("hidden");
        setTimeout(() => {
        screen.remove();
        document.body.style.overflow = "auto";
        }, 700);
    } else {
        errorMsg.textContent = "Incorrect password. Try again.";
        input.value = "";
    }
}
