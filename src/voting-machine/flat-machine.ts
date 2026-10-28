// Urna em 2D (HTML), para celulares e para quem prefere sem 3D. Usa a mesma tela da urna 3D.
import { DIGIT_KEY_LAYOUT, FUNCTION_KEY_LABELS } from './keypad-layout';
import { drawScreen, loadCandidatePhotos, SCREEN_HEIGHT, SCREEN_WIDTH } from './screen';
import type { KeyName, VotingSession } from './voting-session';

export interface FlatMachineView {
  destroy(): void;
}

const KEY_PRESS_MS = 140;

/** Posição das teclas de função na grade do teclado: [coluna, linha inicial, linhas ocupadas]. */
const FUNCTION_KEY_PLACEMENT: Record<keyof typeof FUNCTION_KEY_LABELS, [number, number, number]> = {
  NULL: [3, 0, 1],
  CORRECT: [3, 1, 1],
  CONFIRM: [3, 2, 2],
};

const FUNCTION_KEY_CLASSES: Record<keyof typeof FUNCTION_KEY_LABELS, string> = {
  NULL: 'null-key',
  CORRECT: 'correct-key',
  CONFIRM: 'confirm-key',
};

export function mountFlatMachine(container: HTMLElement, session: VotingSession): FlatMachineView {
  container.innerHTML = `
    <div class="flat-machine">
      <div class="flat-screen-frame">
        <canvas class="flat-screen" width="${SCREEN_WIDTH}" height="${SCREEN_HEIGHT}" aria-label="Tela da urna"></canvas>
      </div>
      <div class="flat-lower">
        <div class="flat-engraving" aria-hidden="true"><span></span><b>UE2026</b></div>
        <div class="flat-keypad">${renderKeys()}</div>
      </div>
    </div>`;

  const canvas = container.querySelector<HTMLCanvasElement>('.flat-screen')!;
  const screenContext = canvas.getContext('2d')!;
  const keypad = container.querySelector<HTMLElement>('.flat-keypad')!;

  function redrawScreen() {
    drawScreen(screenContext, session.screenState);
  }

  function showKeyPress(keyName: KeyName) {
    const button = keypad.querySelector<HTMLElement>(`[data-key="${keyName}"]`);

    if (!button) {
      return;
    }

    button.classList.add('pressed');
    window.setTimeout(() => button.classList.remove('pressed'), KEY_PRESS_MS);
  }

  function handleClick(event: MouseEvent) {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-key]');

    if (button) {
      session.pressKey(button.dataset.key as KeyName);
    }
  }

  keypad.addEventListener('click', handleClick);
  session.attachView({ redrawScreen, showKeyPress });

  // A fonte Inter pode carregar depois do primeiro desenho.
  document.fonts?.ready.then(redrawScreen);
  loadCandidatePhotos(redrawScreen);

  return {
    destroy() {
      session.attachView(null);
      keypad.removeEventListener('click', handleClick);
      container.innerHTML = '';
    },
  };
}

function renderKeys(): string {
  const digitKeys = DIGIT_KEY_LAYOUT.map(([digit, column, row]) =>
    renderKey(digit, digit, 'digit-key', column, row, 1),
  );

  const functionKeys = Object.entries(FUNCTION_KEY_LABELS).map(([keyName, label]) => {
    const functionKeyName = keyName as keyof typeof FUNCTION_KEY_LABELS;
    const [column, row, rowSpan] = FUNCTION_KEY_PLACEMENT[functionKeyName];

    return renderKey(functionKeyName, label, FUNCTION_KEY_CLASSES[functionKeyName], column, row, rowSpan);
  });

  return [...digitKeys, ...functionKeys].join('');
}

function renderKey(keyName: KeyName, label: string, keyClass: string, column: number, row: number, rowSpan: number): string {
  const gridPosition = `grid-column: ${column + 1}; grid-row: ${row + 1} / span ${rowSpan};`;

  return `<button type="button" class="flat-key ${keyClass}" data-key="${keyName}" style="${gridPosition}">${label}</button>`;
}
