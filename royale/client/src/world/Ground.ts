import * as THREE from "three";
import { WORLD_SIZE } from "@royale/shared";

export function createGround(): THREE.Group {
  const group = new THREE.Group();

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x3a5a3a }),
  );
  plane.rotation.x = -Math.PI / 2;
  group.add(plane);

  const grid = new THREE.GridHelper(WORLD_SIZE, 20, 0x224422, 0x224422);
  grid.position.y = 0.01;
  group.add(grid);

  return group;
}
