// Modelo 3D da urna (inspirado na UE2020/UE2022): corpo em cunha, tela com moldura preta e teclado.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createTextTexture } from './canvas-text';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from './screen';
import { DIGIT_KEY_LAYOUT, FUNCTION_KEY_LABELS } from './keypad-layout';
import type { KeyName } from './voting-session';

export interface MachineKey {
  name: KeyName;
  mesh: THREE.Mesh;
  group: THREE.Group;
  restingHeight: number;
}

export interface MachineModel {
  group: THREE.Group;
  screenContext: CanvasRenderingContext2D;
  screenTexture: THREE.CanvasTexture;
  keys: MachineKey[];
}

interface KeyConfig {
  name: KeyName;
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  material: THREE.Material;
  labelColor: string;
}

/** Altura da superfície de cima da urna (no sistema da própria urna, antes da inclinação). */
const TOP_SURFACE = 0.25;

const BODY_WIDTH = 4.4;
const BODY_DEPTH = 3.8;
const BODY_EDGE_RADIUS = 0.07;
const FRONT_THICKNESS = 0.35;

/** Inclinação do tampo: a frente fica bem mais baixa que o fundo, como na urna real. */
const TILT_ANGLE = 0.3;

/** Altura da mesa na cena (ver scenery.ts). */
const DESK_HEIGHT = -0.42;

const SCREEN_POSITION = new THREE.Vector3(0.05, TOP_SURFACE, -0.85);
const SCREEN_PLANE_WIDTH = 2.6;
const SCREEN_PLANE_HEIGHT = (SCREEN_PLANE_WIDTH * SCREEN_HEIGHT) / SCREEN_WIDTH;

const KEY_HEIGHT = 0.1;
const KEY_ROW_START = 0.5;
const KEY_ROW_SPACING = 0.32;
const KEY_COLUMN_START = 0.05;
const KEY_COLUMN_SPACING = 0.4;
const FUNCTION_KEY_X = 1.42;

const WHITE_PLASTIC_COLOR = '#e7e5df';

export function createMachineModel(): MachineModel {
  const group = new THREE.Group();

  group.rotation.x = TILT_ANGLE;
  group.position.y = getLiftToTouchDesk();

  addBody(group);
  addFrontVents(group);
  addEngraving(group);

  const { screenContext, screenTexture } = addScreen(group);
  const keys = addKeypad(group);

  return { group, screenContext, screenTexture, keys };
}

/** Quanto subir a urna para que a frente tenha a espessura desejada e o fundo encoste na mesa. */
function getLiftToTouchDesk(): number {
  const frontZ = BODY_DEPTH / 2;
  const frontBottom = TOP_SURFACE - FRONT_THICKNESS;

  return DESK_HEIGHT - frontBottom * Math.cos(TILT_ANGLE) + frontZ * Math.sin(TILT_ANGLE);
}

/** Altura (no sistema da urna) em que a base plana encosta na mesa, para cada profundidade z. */
function getBottomHeight(z: number, lift: number): number {
  return (DESK_HEIGHT - lift + z * Math.sin(TILT_ANGLE)) / Math.cos(TILT_ANGLE);
}

/** Corpo em cunha: perfil lateral extrudado na largura da urna, com bordas arredondadas. */
function addBody(group: THREE.Group) {
  const lift = getLiftToTouchDesk();
  const halfDepth = BODY_DEPTH / 2 - BODY_EDGE_RADIUS;
  const top = TOP_SURFACE - BODY_EDGE_RADIUS;

  // O perfil usa (-z, y) para que, depois de girar a geometria, a frente fique em +z.
  const profile = new THREE.Shape();

  profile.moveTo(-halfDepth, top);
  profile.lineTo(halfDepth, top);
  profile.lineTo(halfDepth, getBottomHeight(-halfDepth, lift) + BODY_EDGE_RADIUS);
  profile.lineTo(-halfDepth, getBottomHeight(halfDepth, lift) + BODY_EDGE_RADIUS);
  profile.closePath();

  const extrusionDepth = BODY_WIDTH - BODY_EDGE_RADIUS * 2;

  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth: extrusionDepth,
    bevelEnabled: true,
    bevelSize: BODY_EDGE_RADIUS,
    bevelThickness: BODY_EDGE_RADIUS,
    bevelSegments: 4,
    curveSegments: 4,
  });

  geometry.rotateY(Math.PI / 2);
  geometry.translate(-extrusionDepth / 2, 0, 0);
  geometry.computeVertexNormals();

  const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: WHITE_PLASTIC_COLOR, roughness: 0.6 }));

  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
}

/** Fileira de frisos de ventilação na frente da urna. */
function addFrontVents(group: THREE.Group) {
  const ventGeometry = new THREE.PlaneGeometry(0.05, 0.1);
  const ventMaterial = new THREE.MeshStandardMaterial({ color: '#8c8c88', roughness: 0.8 });
  const ventCount = 18;
  const firstVentX = -1.85;
  const ventSpacing = 3.7 / (ventCount - 1);

  for (let index = 0; index < ventCount; index++) {
    const vent = new THREE.Mesh(ventGeometry, ventMaterial);

    vent.position.set(firstVentX + index * ventSpacing, TOP_SURFACE - FRONT_THICKNESS / 2, BODY_DEPTH / 2 + 0.002);
    group.add(vent);
  }
}

function addScreen(group: THREE.Group) {
  // Moldura preta larga em volta da tela, como na urna real.
  const frame = new THREE.Mesh(
    new RoundedBoxGeometry(SCREEN_PLANE_WIDTH + 0.36, 0.05, SCREEN_PLANE_HEIGHT + 0.34, 2, 0.02),
    new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.35 }),
  );

  frame.position.copy(SCREEN_POSITION).setY(TOP_SURFACE);
  group.add(frame);

  const canvas = document.createElement('canvas');

  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;

  const screenContext = canvas.getContext('2d')!;
  const screenTexture = new THREE.CanvasTexture(canvas);

  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = 8;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN_PLANE_WIDTH, SCREEN_PLANE_HEIGHT),
    new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false }),
  );

  screen.rotation.x = -Math.PI / 2;
  screen.position.copy(SCREEN_POSITION).setY(TOP_SURFACE + 0.027);
  group.add(screen);

  return { screenContext, screenTexture };
}

/** Gravação em baixo relevo no canto da urna: contorno do brasão e o modelo "UE2026". */
function addEngraving(group: THREE.Group) {
  const canvas = document.createElement('canvas');

  canvas.width = 512;
  canvas.height = 320;

  const context = canvas.getContext('2d')!;

  context.strokeStyle = '#d3d1ca';
  context.lineWidth = 6;
  context.beginPath();
  context.roundRect(20, 20, 472, 170, 24);
  context.stroke();

  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(20, 210, 472, 90, 18);
  context.stroke();

  context.fillStyle = '#d3d1ca';
  context.font = '700 64px Inter, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('UE2026', 256, 258);

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;

  const engraving = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.81),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
  );

  engraving.rotation.x = -Math.PI / 2;
  engraving.position.set(-1.25, TOP_SURFACE + 0.002, 1.15);
  group.add(engraving);
}

function addKeypad(group: THREE.Group): MachineKey[] {
  const blackPlastic = new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.4 });

  const digitKeys: KeyConfig[] = DIGIT_KEY_LAYOUT.map(([digit, column, row]) => ({
    name: digit,
    label: digit,
    x: KEY_COLUMN_START + column * KEY_COLUMN_SPACING,
    z: KEY_ROW_START + row * KEY_ROW_SPACING,
    width: 0.32,
    depth: 0.24,
    material: blackPlastic,
    labelColor: '#ffffff',
  }));

  // NULO e CORRIGE ficam ao lado das duas primeiras linhas; CONFIRMA é maior e ocupa as duas de baixo.
  const confirmZ = KEY_ROW_START + KEY_ROW_SPACING * 2.5;

  const functionKeys: KeyConfig[] = [
    createFunctionKey('NULL', KEY_ROW_START, 0.24, '#f7f7f5'),
    createFunctionKey('CORRECT', KEY_ROW_START + KEY_ROW_SPACING, 0.24, '#f0641e'),
    createFunctionKey('CONFIRM', confirmZ, 0.52, '#2fa84f'),
  ];

  return [...digitKeys, ...functionKeys].map((config) => createKey(group, config));
}

function createFunctionKey(name: keyof typeof FUNCTION_KEY_LABELS, z: number, depth: number, color: string): KeyConfig {
  return {
    name,
    label: FUNCTION_KEY_LABELS[name],
    x: FUNCTION_KEY_X,
    z,
    width: 0.58,
    depth,
    material: new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
    labelColor: '#111',
  };
}

function createKey(parent: THREE.Group, config: KeyConfig): MachineKey {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(config.width, KEY_HEIGHT, config.depth, 2, 0.035), config.material);

  mesh.castShadow = true;
  group.add(mesh);

  const labelTexture = createTextTexture({
    text: config.label,
    color: config.labelColor,
    width: 256,
    height: Math.round((256 * config.depth) / config.width),
    fontSize: config.label.length > 1 ? 64 : 110,
  });

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(config.width * 0.92, config.depth * 0.9),
    new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true }),
  );

  label.rotation.x = -Math.PI / 2;
  label.position.y = KEY_HEIGHT / 2 + 0.002;
  group.add(label);

  group.position.set(config.x, TOP_SURFACE + KEY_HEIGHT / 2 - 0.01, config.z);
  parent.add(group);

  return { name: config.name, mesh, group, restingHeight: group.position.y };
}
