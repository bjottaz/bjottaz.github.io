// Regras do voto na urna (preferência e veto), sem depender de como a urna é desenhada (3D ou 2D).
import { CANDIDATE_NUMBER_LENGTH, findCandidate } from '../election/candidates';
import type { Vote } from '../election/ranking';
import type { ScreenState } from './screen';
import { playConfirmSound, playErrorSound, playFinishSound, playKeySound } from './sounds';

export type DigitKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type KeyName = DigitKey | 'NULL' | 'CORRECT' | 'CONFIRM';

/** O que a urna desenhada (3D ou 2D) precisa fazer quando o voto muda. */
export interface SessionView {
  redrawScreen(): void;
  showKeyPress(keyName: KeyName): void;
}

export interface VotingSession {
  readonly screenState: ScreenState;
  pressKey(keyName: KeyName): void;
  attachView(view: SessionView | null): void;
  destroy(): void;
}

const CURSOR_BLINK_MS = 500;
const FINISH_SCREEN_MS = 2300;

export function createVotingSession(onFinish: (vote: Vote) => void): VotingSession {
  const screenState: ScreenState = {
    step: 'preference',
    digits: '',
    isNullVote: false,
    chosenPreference: null,
    isCursorVisible: true,
  };

  const vote: Vote = { preference: null, veto: null };
  let view: SessionView | null = null;
  let hasFinished = false;
  let finishTimeoutId = 0;

  function redrawScreen() {
    view?.redrawScreen();
  }

  const cursorIntervalId = window.setInterval(blinkCursor, CURSOR_BLINK_MS);

  function blinkCursor() {
    screenState.isCursorVisible = !screenState.isCursorVisible;

    const isTyping =
      screenState.step !== 'finished' && !screenState.isNullVote && screenState.digits.length < CANDIDATE_NUMBER_LENGTH;

    if (isTyping) {
      redrawScreen();
    }
  }

  // ---------- Teclas ----------

  function pressKey(keyName: KeyName) {
    if (screenState.step === 'finished') {
      return;
    }

    view?.showKeyPress(keyName);

    switch (keyName) {
      case 'NULL':
        pressNull();
        break;

      case 'CORRECT':
        pressCorrect();
        break;

      case 'CONFIRM':
        pressConfirm();
        break;

      default:
        typeDigit(keyName);
    }

    redrawScreen();
  }

  function typeDigit(digit: DigitKey) {
    const isFieldFull = screenState.isNullVote || screenState.digits.length >= CANDIDATE_NUMBER_LENGTH;

    if (isFieldFull) {
      playErrorSound();

      return;
    }

    screenState.digits += digit;
    playKeySound();
  }

  /** Como a antiga tecla Branco: só funciona com o campo vazio. */
  function pressNull() {
    if (screenState.digits.length > 0) {
      playErrorSound();

      return;
    }

    screenState.isNullVote = true;
    playKeySound();
  }

  function pressCorrect() {
    clearField();
    playKeySound();
  }

  function pressConfirm() {
    const isIncomplete = !screenState.isNullVote && screenState.digits.length < CANDIDATE_NUMBER_LENGTH;

    if (isIncomplete) {
      playErrorSound();

      return;
    }

    const chosenNumber = getChosenNumber();
    const isRepeatedCandidate = screenState.step === 'veto' && chosenNumber !== null && chosenNumber === vote.preference;

    if (isRepeatedCandidate) {
      playErrorSound();

      return;
    }

    if (screenState.step === 'preference') {
      confirmPreference(chosenNumber);
    } else {
      confirmVeto(chosenNumber);
    }

    clearField();
  }

  /** Número inexistente conta como voto nulo. */
  function getChosenNumber(): string | null {
    if (screenState.isNullVote) {
      return null;
    }

    return findCandidate(screenState.digits)?.number ?? null;
  }

  function confirmPreference(chosenNumber: string | null) {
    vote.preference = chosenNumber;
    screenState.chosenPreference = chosenNumber;
    screenState.step = 'veto';
    playConfirmSound();
  }

  function confirmVeto(chosenNumber: string | null) {
    vote.veto = chosenNumber;
    screenState.step = 'finished';
    playFinishSound();

    finishTimeoutId = window.setTimeout(() => {
      hasFinished = true;
      onFinish({ ...vote });
    }, FINISH_SCREEN_MS);
  }

  function clearField() {
    screenState.digits = '';
    screenState.isNullVote = false;
  }

  // ---------- Teclado físico ----------

  function handleKeyDown(event: KeyboardEvent) {
    // Enter numa tecla da urna 2D já dispara o clique do próprio botão.
    const isEnterOnButton = event.key === 'Enter' && event.target instanceof HTMLButtonElement;

    if (isEnterOnButton) {
      return;
    }

    const keyName = getKeyFromKeyboard(event.key);

    if (!keyName) {
      return;
    }

    event.preventDefault();
    pressKey(keyName);
  }

  window.addEventListener('keydown', handleKeyDown);

  return {
    screenState,
    pressKey,

    attachView(newView) {
      view = newView;
      redrawScreen();
    },

    destroy() {
      clearInterval(cursorIntervalId);

      if (!hasFinished) {
        clearTimeout(finishTimeoutId);
      }

      window.removeEventListener('keydown', handleKeyDown);
      view = null;
    },
  };
}

function getKeyFromKeyboard(key: string): KeyName | null {
  if (/^\d$/.test(key)) {
    return key as DigitKey;
  }

  if (key === 'Enter') {
    return 'CONFIRM';
  }

  if (key === 'Backspace' || key === 'Escape') {
    return 'CORRECT';
  }

  if (key.toLowerCase() === 'n') {
    return 'NULL';
  }

  return null;
}
