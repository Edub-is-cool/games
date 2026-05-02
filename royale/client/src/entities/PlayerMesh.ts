import * as THREE from "three";

export class PlayerMesh {
  group: THREE.Group;

  constructor(color: number, isLocal: boolean) {
    this.group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color }),
    );
    body.position.y = 0.5;
    this.group.add(body);

    if (isLocal) {
      const marker = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: 0xffff66, emissive: 0x554400 }),
      );
      marker.position.y = 1.7;
      marker.rotation.x = Math.PI;
      this.group.add(marker);
    }
  }

  setPosition(x: number, z: number) {
    this.group.position.set(x, 0, z);
  }

  dispose(parent: THREE.Object3D) {
    parent.remove(this.group);
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
