import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#globe");
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 0.2, 4.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.enablePan = false;
controls.minDistance = 2.4;
controls.maxDistance = 7.5;

scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(5, 3, 4);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xffd2b2, 0.6);
rimLight.position.set(-6, -2, -4);
scene.add(rimLight);

const globeGroup = new THREE.Group();
scene.add(globeGroup);

function cubeFacePosition(face, u, v) {
  switch (face) {
    case 0:
      return [1, v, -u];
    case 1:
      return [-1, v, u];
    case 2:
      return [u, 1, -v];
    case 3:
      return [u, -1, v];
    case 4:
      return [u, v, 1];
    case 5:
      return [-u, v, -1];
    default:
      return [0, 0, 0];
  }
}

function projectCubeToSphere(face, u, v, radius, scale = 1) {
  const position = cubeFacePosition(face, u, v);
  return new THREE.Vector3(...position).normalize().multiplyScalar(radius * scale);
}

function createCubeSphereGeometry({ segments = 48, radius = 1.35 } = {}) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const faceIndices = [];
  const indices = [];
  const stride = segments + 1;

  for (let face = 0; face < 6; face += 1) {
    const offset = face * stride * stride;

    for (let y = 0; y <= segments; y += 1) {
      const v = (y / segments) * 2 - 1;
      const vv = y / segments;
      for (let x = 0; x <= segments; x += 1) {
        const u = (x / segments) * 2 - 1;
        const uu = x / segments;
        const pos = projectCubeToSphere(face, u, v, radius);
        positions.push(pos.x, pos.y, pos.z);
        normals.push(pos.x / radius, pos.y / radius, pos.z / radius);
        uvs.push(uu, vv);
        faceIndices.push(face);
      }
    }

    for (let y = 0; y < segments; y += 1) {
      for (let x = 0; x < segments; x += 1) {
        const i00 = offset + y * stride + x;
        const i10 = i00 + 1;
        const i01 = i00 + stride;
        const i11 = i01 + 1;

        indices.push(i00, i10, i11);
        indices.push(i00, i11, i01);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("faceIndex", new THREE.Float32BufferAttribute(faceIndices, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}

function createCubeSphereGridGeometry({ segments = 48, radius = 1.35, scale = 1.004 } = {}) {
  const positions = [];

  const pushLine = (a, b) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  };

  for (let face = 0; face < 6; face += 1) {
    for (let i = 0; i <= segments; i += 1) {
      const t = (i / segments) * 2 - 1;
      for (let j = 0; j < segments; j += 1) {
        const a = (j / segments) * 2 - 1;
        const b = ((j + 1) / segments) * 2 - 1;

        const lineU0 = projectCubeToSphere(face, t, a, radius, scale);
        const lineU1 = projectCubeToSphere(face, t, b, radius, scale);
        pushLine(lineU0, lineU1);

        const lineV0 = projectCubeToSphere(face, a, t, radius, scale);
        const lineV1 = projectCubeToSphere(face, b, t, radius, scale);
        pushLine(lineV0, lineV1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

const globeRadius = 0.55;
const globeGeometry = createCubeSphereGeometry({ segments: 48, radius: globeRadius });

const globeMaterial = new THREE.MeshStandardMaterial({
  color: 0x587b8b,
  roughness: 0.45,
  metalness: 0.15,
  emissive: 0x0f1f2d,
  emissiveIntensity: 0.4,
});

const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
globeGroup.add(globeMesh);

const wireMaterial = new THREE.LineBasicMaterial({ color: 0xf1c9a8, transparent: true, opacity: 0.4 });
const gridGeometry = createCubeSphereGridGeometry({ segments: 48, radius: globeRadius });
const wireframe = new THREE.LineSegments(gridGeometry, wireMaterial);
globeGroup.add(wireframe);

const atmosphereGeometry = new THREE.SphereGeometry(globeRadius * 1.08, 64, 64);
const atmosphereMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd9bf,
  transparent: true,
  opacity: 0.08,
  depthWrite: false,
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
globeGroup.add(atmosphere);

let needsResizeUpdate = true;
new ResizeObserver(() => { needsResizeUpdate = true; }).observe(canvas);

function handleResize() {
  if (!needsResizeUpdate) return;
  needsResizeUpdate = false;

  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  const pixelRatio = renderer.getPixelRatio();

  if (
    canvas.width !== Math.floor(width * pixelRatio) ||
    canvas.height !== Math.floor(height * pixelRatio)
  ) {
    renderer.setSize(width, height, false);
  }

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  handleResize();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

handleResize();
animate();
