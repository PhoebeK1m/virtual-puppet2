// src/components/mediapipe.js

import { Holistic } from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { animateVRM } from './vrma.js';

let videoElement = document.querySelector(".input_video"),
    guideCanvas = document.querySelector('canvas.guides');

let latestResults = null;

export const onResults = (results) => {
    // if (!currentVrm) return; 
    // Draw landmark guides

    drawResults(results)
    latestResults = results;
    console.log(results);
    // Animate model
    // animateVRM(currentVrm, results);
}
// expose helper so main.js can animate continuously
export const animateWithResults = (currentVrm, videoElement) => {
    try {
        if (latestResults && currentVrm) {
        animateVRM(currentVrm, latestResults, videoElement);
        }
    } catch (err) {
        console.error("animateVRM error:", err);
    }
};
export const holistic = new Holistic({
    locateFile: file => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`;
        // https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/holistic.js

    }
});

// holistic.setOptions({
//     modelComplexity: 1,
//     smoothLandmarks: true,
//     minDetectionConfidence: 0.7,
//     minTrackingConfidence: 0.7,
//     refineFaceLandmarks: true,
// });
holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    refineFaceLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});


// Pass holistic a callback function
holistic.onResults(onResults);

const drawResults = (results) => {
    guideCanvas.width = videoElement.videoWidth;
    guideCanvas.height = videoElement.videoHeight;
    let canvasCtx = guideCanvas.getContext('2d');
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    // Use `Mediapipe` drawing functions
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: "#00cff7",
        lineWidth: 4
    });
    drawLandmarks(canvasCtx, results.poseLandmarks, {
        color: "#ff0364",
        lineWidth: 2
    });
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
        color: "#C0C0C070",
        lineWidth: 1
    });
    if(results.faceLandmarks && results.faceLandmarks.length === 478){
        //draw pupils
        drawLandmarks(canvasCtx, [results.faceLandmarks[468],results.faceLandmarks[468+5]], {
            color: "#ffe603",
            lineWidth: 2
        });
    }
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
        color: "#eb1064",
        lineWidth: 5
    });
    drawLandmarks(canvasCtx, results.leftHandLandmarks, {
        color: "#00cff7",
        lineWidth: 2
    });
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
        color: "#22c3e3",
        lineWidth: 5
    });
    drawLandmarks(canvasCtx, results.rightHandLandmarks, {
        color: "#ff0364",
        lineWidth: 2
    });
}

// Use `Mediapipe` utils to get camera - lower resolution = higher fps
export const camera = new Camera(videoElement, {
    onFrame: async () => {
        await holistic.send({image: videoElement});
    },
    width: 640,
    height: 480
});
camera.start();