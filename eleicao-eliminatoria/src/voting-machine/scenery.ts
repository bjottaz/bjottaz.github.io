// Tudo ao redor da urna: renderizador, câmera, luzes e a seção eleitoral (cabine, mesa e sala de aula).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createTextTexture } from './canvas-text';

const WALL_COLOR = '#ece5d4';

/** Altura do tampo da mesa (a urna fica apoiada nele). */
const DESK_TOP = -0.42;
const DESK_THICKNESS = 0.3;
const DESK_WIDTH = 12;
const DESK_DEPTH = 8.4;
const DESK_CENTER_Z = 0;
const LEG_HEIGHT = 7.4;
const FLOOR_HEIGHT = DESK_TOP - DESK_THICKNESS - LEG_HEIGHT;

const BOOTH_HEIGHT = 4;
const BOOTH_WIDTH = 8.6;
const BOOTH_DEPTH = 5.6;
const BOOTH_BACK_Z = -3.1;
const PANEL_THICKNESS = 0.08;

const CLASSROOM_BACK_WALL_Z = -15;
const CLASSROOM_LEFT_WALL_X = -17;

export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  return renderer;
}

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();

  scene.background = new THREE.Color(WALL_COLOR);
  scene.fog = new THREE.Fog(WALL_COLOR, 26, 55);

  addLights(scene);
  addDesk(scene);
  addBooth(scene);
  addClassroom(scene);
  addPollWorkerTable(scene);
  addCable(scene);

  return scene;
}

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);

  camera.position.set(1.0, 5.6, 7.8);

  return camera;
}

/** Permite girar e aproximar, com limites que mantêm a urna à vista (sem atravessar a cabine). */
export function createControls(camera: THREE.Camera, renderer: THREE.WebGLRenderer): OrbitControls {
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.target.set(0.3, 0.5, 0.1);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 16;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.25;
  controls.minAzimuthAngle = -0.75;
  controls.maxAzimuthAngle = 0.75;

  return controls;
}

/** Luz ambiente da sala e luz quente entrando pelas janelas da esquerda. */
function addLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight('#ffffff', '#9a9488', 1.3));

  const windowLight = new THREE.DirectionalLight('#fff1dc', 2.3);

  windowLight.position.set(-5, 14, 9);
  windowLight.castShadow = true;
  windowLight.shadow.mapSize.set(2048, 2048);
  windowLight.shadow.camera.left = -9;
  windowLight.shadow.camera.right = 9;
  windowLight.shadow.camera.top = 9;
  windowLight.shadow.camera.bottom = -9;
  windowLight.shadow.bias = -0.0005;
  scene.add(windowLight);
}

/** Mesa escolar: tampo de madeira clara com pernas de metal. */
function addDesk(scene: THREE.Scene) {
  const deskTop = new THREE.Mesh(
    new RoundedBoxGeometry(DESK_WIDTH, DESK_THICKNESS, DESK_DEPTH, 2, 0.08),
    new THREE.MeshStandardMaterial({ color: '#c9ab7f', roughness: 0.8 }),
  );

  deskTop.position.set(0, DESK_TOP - DESK_THICKNESS / 2, DESK_CENTER_Z);
  deskTop.receiveShadow = true;
  deskTop.castShadow = true;
  scene.add(deskTop);

  addDeskLegs(scene, 0, DESK_CENTER_Z, DESK_WIDTH, DESK_DEPTH);
}

function addDeskLegs(scene: THREE.Scene, centerX: number, centerZ: number, width: number, depth: number) {
  const metal = new THREE.MeshStandardMaterial({ color: '#4a4d52', roughness: 0.4, metalness: 0.6 });
  const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, LEG_HEIGHT, 12);
  const legInset = 0.5;

  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      const leg = new THREE.Mesh(legGeometry, metal);

      leg.position.set(
        centerX + sideX * (width / 2 - legInset),
        FLOOR_HEIGHT + LEG_HEIGHT / 2,
        centerZ + sideZ * (depth / 2 - legInset),
      );

      scene.add(leg);
    }
  }
}

/** Cabine de papelão dobrável em U em volta da urna, como as usadas nas seções eleitorais. */
function addBooth(scene: THREE.Scene) {
  const cardboard = new THREE.MeshStandardMaterial({ color: '#e3e8ee', roughness: 0.95 });
  const panelEdge = new THREE.MeshStandardMaterial({ color: '#9fb0c4', roughness: 0.9 });
  const panelCenterY = DESK_TOP + BOOTH_HEIGHT / 2;

  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(BOOTH_WIDTH, BOOTH_HEIGHT, PANEL_THICKNESS), cardboard);

  backPanel.position.set(0, panelCenterY, BOOTH_BACK_Z);
  backPanel.castShadow = true;
  backPanel.receiveShadow = true;
  scene.add(backPanel);

  addPanelTopEdge(scene, panelEdge, BOOTH_WIDTH, new THREE.Vector3(0, DESK_TOP + BOOTH_HEIGHT, BOOTH_BACK_Z), 0);

  // As laterais abrem um pouco para fora, como o papelão dobrado na vida real.
  for (const side of [-1, 1]) {
    const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(PANEL_THICKNESS, BOOTH_HEIGHT, BOOTH_DEPTH), cardboard);
    const sideAngle = side * 0.1;
    const sideX = side * (BOOTH_WIDTH / 2) + Math.sin(sideAngle) * (BOOTH_DEPTH / 2);
    const sideZ = BOOTH_BACK_Z + Math.cos(sideAngle) * (BOOTH_DEPTH / 2);

    sidePanel.position.set(sideX, panelCenterY, sideZ);
    sidePanel.rotation.y = sideAngle;
    sidePanel.castShadow = true;
    sidePanel.receiveShadow = true;
    scene.add(sidePanel);

    addPanelTopEdge(scene, panelEdge, BOOTH_DEPTH, new THREE.Vector3(sideX, DESK_TOP + BOOTH_HEIGHT, sideZ), sideAngle + Math.PI / 2);
  }

  const secretVoteSign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 0.7),
    new THREE.MeshBasicMaterial({
      map: createTextTexture({
        text: 'SEU VOTO É SECRETO',
        color: '#ffffff',
        width: 1024,
        height: 164,
        fontSize: 70,
        background: '#3d5f8f',
      }),
    }),
  );

  secretVoteSign.position.set(0, DESK_TOP + BOOTH_HEIGHT - 1.5, BOOTH_BACK_Z + PANEL_THICKNESS / 2 + 0.005);
  scene.add(secretVoteSign);
}

/** Friso mais escuro no alto de cada painel, para marcar a espessura do papelão. */
function addPanelTopEdge(scene: THREE.Scene, material: THREE.Material, length: number, position: THREE.Vector3, angle: number) {
  const edge = new THREE.Mesh(new THREE.BoxGeometry(length, 0.08, PANEL_THICKNESS + 0.04), material);

  edge.position.copy(position);
  edge.rotation.y = angle;
  scene.add(edge);
}

/** Sala de aula ao fundo: piso, paredes, quadro verde e janelas. */
function addClassroom(scene: THREE.Scene) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: '#b8b2a6', roughness: 0.9 }),
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_HEIGHT;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.95 });
  const wallHeight = 24;

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(80, wallHeight), wallMaterial);

  backWall.position.set(0, FLOOR_HEIGHT + wallHeight / 2, CLASSROOM_BACK_WALL_Z);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(80, wallHeight), wallMaterial);

  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(CLASSROOM_LEFT_WALL_X, FLOOR_HEIGHT + wallHeight / 2, 0);
  scene.add(leftWall);

  addWallStripe(scene);
  addChalkboard(scene);
  addWindows(scene);
}

/** Barra de tinta mais escura na parte de baixo da parede, comum em escolas. */
function addWallStripe(scene: THREE.Scene) {
  const stripeHeight = 4;

  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(80, stripeHeight),
    new THREE.MeshStandardMaterial({ color: '#8fa7a0', roughness: 0.9 }),
  );

  stripe.position.set(0, FLOOR_HEIGHT + stripeHeight / 2, CLASSROOM_BACK_WALL_Z + 0.01);
  scene.add(stripe);
}

function addChalkboard(scene: THREE.Scene) {
  const boardWidth = 18;
  const boardHeight = 6;
  const boardCenterY = 5.2;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(boardWidth + 0.6, boardHeight + 0.6, 0.15),
    new THREE.MeshStandardMaterial({ color: '#8a6440', roughness: 0.8 }),
  );

  frame.position.set(0, boardCenterY, CLASSROOM_BACK_WALL_Z + 0.08);
  scene.add(frame);

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(boardWidth, boardHeight),
    new THREE.MeshStandardMaterial({ color: '#2f5a45', roughness: 0.95 }),
  );

  board.position.set(0, boardCenterY, CLASSROOM_BACK_WALL_Z + 0.17);
  scene.add(board);

  const chalkText = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 1.2),
    new THREE.MeshBasicMaterial({
      map: createTextTexture({ text: 'SEÇÃO ELEITORAL', color: '#e9efe9', width: 1024, height: 136, fontSize: 80 }),
      transparent: true,
      opacity: 0.85,
    }),
  );

  chalkText.position.set(0, boardCenterY + 1.4, CLASSROOM_BACK_WALL_Z + 0.18);
  scene.add(chalkText);
}

/** Janelas claras na parede da esquerda, de onde vem a luz. */
function addWindows(scene: THREE.Scene) {
  const glass = new THREE.MeshBasicMaterial({ color: '#f4f8ff' });
  const windowFrame = new THREE.MeshStandardMaterial({ color: '#d8d8d4', roughness: 0.7 });

  for (const windowZ of [-9, -1, 7]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 7, 6), windowFrame);

    frame.position.set(CLASSROOM_LEFT_WALL_X + 0.1, 6, windowZ);
    scene.add(frame);

    const pane = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 6.4), glass);

    pane.rotation.y = Math.PI / 2;
    pane.position.set(CLASSROOM_LEFT_WALL_X + 0.22, 6, windowZ);
    scene.add(pane);
  }
}

/** Mesa do mesário, fora da cabine, com o terminal que libera o eleitor. */
function addPollWorkerTable(scene: THREE.Scene) {
  const tableX = -11.5;
  const tableZ = 2;
  const tableWidth = 7;
  const tableDepth = 6;

  const tableTop = new THREE.Mesh(
    new RoundedBoxGeometry(tableWidth, DESK_THICKNESS, tableDepth, 2, 0.08),
    new THREE.MeshStandardMaterial({ color: '#c9ab7f', roughness: 0.8 }),
  );

  tableTop.position.set(tableX, DESK_TOP - DESK_THICKNESS / 2, tableZ);
  tableTop.receiveShadow = true;
  scene.add(tableTop);

  addDeskLegs(scene, tableX, tableZ, tableWidth, tableDepth);
  addPollWorkerTerminal(scene, new THREE.Vector3(tableX + 1, DESK_TOP + 0.21, tableZ));
}

function addPollWorkerTerminal(scene: THREE.Scene, position: THREE.Vector3) {
  const whitePlastic = new THREE.MeshStandardMaterial({ color: '#e7e5df', roughness: 0.55 });
  const terminal = new THREE.Group();

  terminal.position.copy(position);
  terminal.rotation.y = 0.35;
  scene.add(terminal);

  const base = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.42, 1.3, 3, 0.1), whitePlastic);

  base.castShadow = true;
  terminal.add(base);

  const fingerprintReader = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.3, 0.45, 2, 0.06), whitePlastic);

  fingerprintReader.position.set(0, 0.3, -0.35);
  fingerprintReader.castShadow = true;
  terminal.add(fingerprintReader);

  const fingerprintSensor = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.02, 0.22),
    new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.2 }),
  );

  fingerprintSensor.position.set(0, 0.46, -0.35);
  terminal.add(fingerprintSensor);

  const terminalScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.62),
    new THREE.MeshBasicMaterial({
      map: createTextTexture({
        text: 'ELEITOR LIBERADO',
        color: '#ffffff',
        width: 512,
        height: 228,
        fontSize: 54,
        background: '#1f5f99',
      }),
      toneMapped: false,
    }),
  );

  terminalScreen.rotation.x = -Math.PI / 2 + 0.35;
  terminalScreen.position.set(0, 0.24, 0.22);
  terminal.add(terminalScreen);
}

/** Cabo da urna até o terminal do mesário: sai por trás, passa por baixo da cabine e desce da mesa. */
function addCable(scene: THREE.Scene) {
  const cablePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.15, -0.1, -1.4),
    new THREE.Vector3(-2.6, DESK_TOP + 0.04, -2.2),
    new THREE.Vector3(-4.6, DESK_TOP + 0.04, -2.6),
    new THREE.Vector3(-6.0, DESK_TOP - 0.2, -2.6),
    new THREE.Vector3(-6.4, DESK_TOP - 2.5, -2.2),
    new THREE.Vector3(-7.8, DESK_TOP - 1.2, 0.5),
    new THREE.Vector3(-8.0, DESK_TOP + 0.04, 1.5),
    new THREE.Vector3(-10.2, DESK_TOP + 0.1, 1.8),
  ]);

  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(cablePath, 80, 0.035, 8),
    new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.6 }),
  );

  scene.add(cable);
}

/** Libera a memória da GPU usada por geometrias, materiais e texturas. */
export function disposeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;

    mesh.geometry?.dispose();

    for (const material of getMaterials(mesh)) {
      (material as THREE.MeshBasicMaterial).map?.dispose();
      material.dispose();
    }
  });
}

function getMaterials(mesh: THREE.Mesh): THREE.Material[] {
  if (!mesh.material) {
    return [];
  }

  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}
