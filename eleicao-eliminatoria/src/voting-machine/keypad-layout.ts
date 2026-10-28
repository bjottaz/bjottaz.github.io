// Disposição do teclado da urna, compartilhada pela urna 3D e pela 2D.
import type { DigitKey, KeyName } from './voting-session';

/** [tecla, coluna, linha] no teclado numérico. */
export const DIGIT_KEY_LAYOUT: [DigitKey, number, number][] = [
  ['1', 0, 0], ['2', 1, 0], ['3', 2, 0],
  ['4', 0, 1], ['5', 1, 1], ['6', 2, 1],
  ['7', 0, 2], ['8', 1, 2], ['9', 2, 2],
  ['0', 1, 3],
];

export const FUNCTION_KEY_LABELS: Record<Exclude<KeyName, DigitKey>, string> = {
  NULL: 'NULO',
  CORRECT: 'CORRIGE',
  CONFIRM: 'CONFIRMA',
};
