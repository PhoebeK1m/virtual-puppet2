// src/components/vrma.js

import * as THREE from 'three';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import * as Kalidokit from "kalidokit";
import { VRMHumanBoneName, VRMExpressionPresetName } from "@pixiv/three-vrm";

const remap = Kalidokit.Utils.remap;
const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;

export function loadVRMA(gltfLoader, vrm, animUrl, callback) {
    gltfLoader.load(
        animUrl,
        (gltf) => {
        const vrmAnim = gltf.userData?.vrmAnimations?.[0];
        if (vrmAnim) {
            const vrmaClip = createVRMAnimationClip(vrmAnim, vrm);
            callback(vrmaClip);
        } else {
            console.error('No VRMAnimation found in the loaded VRMA');
        }
        },
        undefined,
        (err) => console.error('VRMA load error:', err)
    );
}

export function playVRMAAnimation(mixer, vrmaClip, vrm) {
    if (!mixer) mixer = new THREE.AnimationMixer(vrm.scene);
    const action = mixer.clipAction(vrmaClip);
    action.reset().play();
    return action;
}

export function stopVRMAAnimation(action) {
    if (action) {
        action.fadeOut(0.25);
        setTimeout(() => action.stop(), 300);
    }
}

export const animateVRM = (vrm, results, videoElement) => {
    if (!vrm) return;
    // console.log("Available expressions:", vrm.expressionManager?.expressions);

    let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;

    // Extract MediaPipe landmarks
    const faceLandmarks = results.faceLandmarks;
    const pose3DLandmarks = results.za; 
    const pose2DLandmarks = results.poseLandmarks; // 2D landmarks (pixels)
    const leftHandLandmarks = results.rightHandLandmarks; // beware: reversed
    const rightHandLandmarks = results.leftHandLandmarks;

    

    // --- FACE ---
    if (faceLandmarks) {
        riggedFace = Kalidokit.Face.solve(faceLandmarks, {
        runtime: "mediapipe",
        video: videoElement,
        });
        rigFace(riggedFace, vrm); // pass vrm explicitly
    }

    // --- POSE ---
    if (pose2DLandmarks && pose3DLandmarks) {
    // if (pose2DLandmarks) {
        riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
            runtime: "mediapipe",
            video: videoElement,
        });

        rigRotation(VRMHumanBoneName.Hips, riggedPose.Hips.rotation, 0.7, 0.3, vrm);

        // If you want hips position animation, uncomment:
        /*
        rigPosition(
        "Hips",
        {
            x: -riggedPose.Hips.position.x, // Reverse direction
            y: riggedPose.Hips.position.y,
            z: -riggedPose.Hips.position.z,
        },
        1,
        0.07,
        vrm
        );
        */

        rigRotation(VRMHumanBoneName.Chest, {
            x: -riggedPose.Spine.x, // invert
            y: riggedPose.Spine.y,
            z: -riggedPose.Spine.z,
        }, 0.25, 0.3, vrm);
        rigRotation(VRMHumanBoneName.Spine,{
            x: -riggedPose.Spine.x, // invert
            y: riggedPose.Spine.y,
            z: -riggedPose.Spine.z,
        }, 0.45, 0.3, vrm);
        rigRotation(VRMHumanBoneName.RightUpperArm, {
            x: riggedPose.RightUpperArm.x, // invert
            y: riggedPose.RightUpperArm.y,
            z: -riggedPose.RightUpperArm.z,
        }, 1, 0.3, vrm);
        rigRotation(VRMHumanBoneName.LeftUpperArm, {
            x: riggedPose.LeftUpperArm.x, // invert
            y: riggedPose.LeftUpperArm.y,
            z: -riggedPose.LeftUpperArm.z,
        }, 1, 0.3, vrm);
        rigRotation(VRMHumanBoneName.RightLowerArm, {
            x: riggedPose.RightLowerArm.x,
            y: riggedPose.RightLowerArm.y,
            z: -riggedPose.RightLowerArm.z,
        }, 1, 0.3, vrm);

        rigRotation(VRMHumanBoneName.LeftLowerArm, {
            x: riggedPose.LeftLowerArm.x,
            y: riggedPose.LeftLowerArm.y,
            z: -riggedPose.LeftLowerArm.z,
        }, 1, 0.3, vrm);

    }

    // --- HANDS ---
    if (leftHandLandmarks) {
        riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, "Left");

        rigRotation(VRMHumanBoneName.LeftHand, {
        z: riggedPose?.LeftHand?.z || 0, // combine pose + hand
        y: riggedLeftHand.LeftWrist.y,
        x: riggedLeftHand.LeftWrist.x,
        }, 1, 0.3, vrm);
    }

    if (rightHandLandmarks) {
        riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");

        rigRotation(VRMHumanBoneName.RightHand, {
        z: riggedPose?.RightHand?.z || 0,
        y: riggedRightHand.RightWrist.y,
        x: riggedRightHand.RightWrist.x,
        }, 1, 0.3, vrm);
    }
};

export const rigRotation = (name, rotation = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3, currentVrm) => {
    if (!currentVrm) return;
    const Part = currentVrm.humanoid.getNormalizedBoneNode(name);

    if (!Part) return;

    let euler = new THREE.Euler(
        rotation.x * dampener,
        rotation.y * dampener,
        rotation.z * dampener
    );
    let quaternion = new THREE.Quaternion().setFromEuler(euler);
    Part.quaternion.slerp(quaternion, lerpAmount);
};

export const rigPosition = (name, position = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.3, currentVrm) => {
    if (!currentVrm) return;
    const Part = currentVrm.humanoid.getNormalizedBoneNode(name);

    if (!Part) return;

    let vector = new THREE.Vector3(
        position.x * dampener,
        position.y * dampener,
        position.z * dampener
    );
    Part.position.lerp(vector, lerpAmount);
};

// let oldLookTarget = new THREE.Euler();

export const rigFace = (riggedFace, currentVrm) => {
    if (!currentVrm) return;

    rigRotation(VRMHumanBoneName.Neck, {
        x: -riggedFace.head.x,  // invert pitch
        y: riggedFace.head.y,   // yaw usually ok
        z: -riggedFace.head.z,   // roll usually ok
    }, 0.7, 0.3, currentVrm);

    const expressionManager = currentVrm.expressionManager;
    if (!expressionManager) return; // prevent crashes

    // Map Kalidokit mouth shapes → VRM viseme names
    const visemeMap = {
        A: "aa",
        I: "ih",
        U: "ou",
        E: "ee",
        O: "oh",
    };

    Object.entries(visemeMap).forEach(([kalido, vrmName]) => {
        const value = riggedFace.mouth.shape[kalido] ?? 0;

        // only process if VRM actually has this expression
        if (!expressionManager?.getValue(vrmName) && expressionManager?.getValue(vrmName) !== 0) return;

        let prev = expressionManager.getValue(vrmName) ?? 0;
        const smoothed = lerp(prev, value, 0.5);

        expressionManager.setValue(vrmName, clamp(smoothed, 0, 1));
    });

    // apply everything
    expressionManager.update();
};