import * as THREE from "three";
import { INPUT_SEND_HZ } from "@royale/shared";
import { PartyClient } from "./net/PartyClient";
import { Input } from "./systems/Input";
import { setupCamera, updateCamera } from "./systems/Camera";
import { PlayerMesh } from "./entities/PlayerMesh";
import { createGround } from "./world/Ground";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x222233);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x222233, 30, 90);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
setupCamera(camera);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(20, 30, 10);
scene.add(sun);

scene.add(createGround());

const meshes = new Map<string, PlayerMesh>();
const input = new Input();
const net = new PartyClient(partyHost());

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

const INPUT_INTERVAL = 1000 / INPUT_SEND_HZ;
let lastInputAt = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();

  if (now - lastInputAt >= INPUT_INTERVAL) {
    const { dx, dz } = input.getDirection();
    net.sendInput(dx, dz);
    lastInputAt = now;
  }

  const state = net.getInterpolatedState(now);
  const seen = new Set<string>();
  for (const p of state.players) {
    seen.add(p.id);
    let mesh = meshes.get(p.id);
    if (!mesh) {
      mesh = new PlayerMesh(p.color, p.id === net.myId);
      meshes.set(p.id, mesh);
      scene.add(mesh.group);
    }
    mesh.setPosition(p.x, p.z);
  }
  for (const [id, mesh] of meshes) {
    if (!seen.has(id)) {
      mesh.dispose(scene);
      meshes.delete(id);
    }
  }

  const me = state.players.find((p) => p.id === net.myId);
  if (me) updateCamera(camera, me.x, me.z);

  renderer.render(scene, camera);
}

animate();

function partyHost(): string {
  if (import.meta.env.DEV) return "localhost:1999";
  const fromEnv = import.meta.env.VITE_PARTY_HOST as string | undefined;
  if (fromEnv) return fromEnv;
  return location.host;
}
