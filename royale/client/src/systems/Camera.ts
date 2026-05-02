import * as THREE from "three";

const OFFSET = new THREE.Vector3(0, 18, 14);

export function setupCamera(camera: THREE.PerspectiveCamera) {
  camera.position.copy(OFFSET);
  camera.lookAt(0, 0, 0);
}

export function updateCamera(camera: THREE.PerspectiveCamera, x: number, z: number) {
  camera.position.set(x + OFFSET.x, OFFSET.y, z + OFFSET.z);
  camera.lookAt(x, 0, z);
}
