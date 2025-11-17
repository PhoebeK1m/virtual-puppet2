// src/components/background.js

import * as THREE from 'three';

const originalWidth = 5851;
const originalHeight = 4542;
const newWidth = 10;
const aspectRatio = originalWidth / originalHeight;
const newHeight = newWidth / aspectRatio;
const textureLoader = new THREE.TextureLoader();

let backLight;
let frontLight;

export function loadBackground(scene) {
    // theater
    loadTexture('/theater/theater.png', scene, new THREE.Vector3( 18.5, 0, 0 ));
    loadTexture('/theater/curtain.png', scene, new THREE.Vector3( 19, 0.1, 0 ));
    loadTexture('/theater/vases.png', scene, new THREE.Vector3( 18.4, 0, 0 ));
    loadTexture('/theater/stars.png', scene, new THREE.Vector3( 18.45, 0, 0 ));
    loadTexture('/theater/banner.png', scene, new THREE.Vector3( 18.4, 0, 0 ));
    loadTexture('/theater/masks.png', scene, new THREE.Vector3( 18.3, 0, 0 ));
    loadTexture('/theater/stage.png', scene, new THREE.Vector3( 18.3, 0, 0 ));

    // backdrop
    loadTexture('/theater/background/bg1.png', scene, new THREE.Vector3( 23, -0.5, 0 ));
    loadTexture('/theater/background/bg1v2.png', scene, new THREE.Vector3( 22, -0.5, 0 ));
    loadTexture('/theater/background/bg2.png', scene, new THREE.Vector3( 22.5, -0.5, 0 ));
    loadTexture('/theater/background/bg3.png', scene, new THREE.Vector3( 22.2, -0.5, 0 ));
    loadTexture('/theater/background/bg4.png', scene, new THREE.Vector3( 22, -0.5, 0 ));
    loadTexture('/theater/background/bg5.png', scene, new THREE.Vector3( 21.5, -0.5, 0 ));
    loadTexture('/theater/background/bg6.png', scene, new THREE.Vector3( 21.1, -0.5, 0 ));

    const ambientLight = new THREE.AmbientLight(0xffffff);
    ambientLight.position.set(0,0,0).normalize();
    scene.add(ambientLight);
    backLight = new THREE.PointLight(0xffac00, 1, 0);
    backLight.position.set(18.5,-1.5,0);
    scene.add(backLight);
    // const backLightHelper = new THREE.PointLightHelper(backLight)
    // scene.add(backLightHelper);
    frontLight = new THREE.PointLight(0xffffff, 0.1, 0); 
    frontLight.position.set(21,-2,0);
    scene.add(frontLight);
    // const frontLightHelper = new THREE.PointLightHelper(frontLight)
    // scene.add(frontLightHelper);
}

export function startDanceLights() {
    if (!backLight || !frontLight) return;
    console.log("dance light change");

    backLight.color.set(0xF00FF0);      // pink
    frontLight.color.set(0x1AD6E5);     // cyan
    frontLight.intensity = 0.3;
}

export function stopDanceLights() {
    if (!backLight || !frontLight) return;

    backLight.color.set(0xffac00); 
    frontLight.color.set(0xffffff);
    frontLight.intensity = 0.1;
}

function loadTexture(textureUrl, scene, vector){
    textureLoader.load(
        textureUrl,
        (bg) => {
            const material = new THREE.MeshBasicMaterial({
                map: bg, // texture map
                transparent: true
            });

            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(newWidth, newHeight),
                material
            );

            mesh.rotation.y = -Math.PI / 2;
            mesh.position.copy(vector);
            scene.add(mesh);
        },
        undefined,
        (err) => console.error('Failed to load background:', err)
    );
}
