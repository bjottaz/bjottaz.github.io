// Urna eletrônica em 3D. As regras do voto ficam em voting-session.ts.
import * as THREE from 'three';
import { createMachineModel, type MachineKey } from './machine-model';
import { createCamera, createControls, createRenderer, createScene, disposeScene } from './scenery';
import { drawScreen, loadCandidatePhotos } from './screen';
import type { KeyName, VotingSession } from './voting-session';

export interface VotingMachineView {
  destroy(): void;
}

const KEY_PRESS_DEPTH = 0.06;
const KEY_RETURN_SPEED = 0.25;
/** Movimento do ponteiro acima disso é arrastar a câmera, não um clique. */
const CLICK_TOLERANCE_PX = 6;

export function mountVotingMachine(container: HTMLElement, session: VotingSession): VotingMachineView {
  const renderer = createRenderer(container);
  const scene = createScene();
  const camera = createCamera();
  const controls = createControls(camera, renderer);
  const machine = createMachineModel();

  scene.add(machine.group);

  // ---------- Tela ----------

  function redrawScreen() {
    drawScreen(machine.screenContext, session.screenState);
    machine.screenTexture.needsUpdate = true;
  }

  function showKeyPress(keyName: KeyName) {
    const key = machine.keys.find((machineKey) => machineKey.name === keyName);

    if (key) {
      key.group.position.y = key.restingHeight - KEY_PRESS_DEPTH;
    }
  }

  session.attachView({ redrawScreen, showKeyPress });

  // A fonte Inter pode carregar depois do primeiro desenho.
  document.fonts?.ready.then(redrawScreen);
  loadCandidatePhotos(redrawScreen);

  // ---------- Cliques nas teclas 3D ----------

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDownPosition = { x: 0, y: 0 };

  function findKeyUnderPointer(event: PointerEvent): MachineKey | undefined {
    const bounds = renderer.domElement.getBoundingClientRect();
    const normalizedX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const normalizedY = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

    pointer.set(normalizedX, normalizedY);
    raycaster.setFromCamera(pointer, camera);

    const keyMeshes = machine.keys.map((key) => key.mesh);
    const hitMesh = raycaster.intersectObjects(keyMeshes, false)[0]?.object;

    return machine.keys.find((key) => key.mesh === hitMesh);
  }

  function handlePointerDown(event: PointerEvent) {
    pointerDownPosition = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: PointerEvent) {
    const dragDistance = Math.hypot(event.clientX - pointerDownPosition.x, event.clientY - pointerDownPosition.y);

    if (dragDistance > CLICK_TOLERANCE_PX) {
      return;
    }

    const key = findKeyUnderPointer(event);

    if (key) {
      session.pressKey(key.name);
    }
  }

  function handlePointerMove(event: PointerEvent) {
    renderer.domElement.style.cursor = findKeyUnderPointer(event) ? 'pointer' : 'grab';
  }

  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  renderer.domElement.addEventListener('pointerup', handlePointerUp);
  renderer.domElement.addEventListener('pointermove', handlePointerMove);

  // ---------- Tamanho ----------

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspectRatio = width / height;

    renderer.setSize(width, height);
    camera.aspect = aspectRatio;

    // Telas em pé precisam de um ângulo maior.
    camera.fov = aspectRatio < 1 ? 55 : 38;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);

  resizeObserver.observe(container);
  resize();

  // ---------- Loop de renderização ----------

  let animationFrameId = 0;

  function renderFrame() {
    animationFrameId = requestAnimationFrame(renderFrame);

    for (const key of machine.keys) {
      key.group.position.y += (key.restingHeight - key.group.position.y) * KEY_RETURN_SPEED;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  renderFrame();

  return {
    destroy() {
      cancelAnimationFrame(animationFrameId);
      session.attachView(null);
      resizeObserver.disconnect();
      controls.dispose();
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
