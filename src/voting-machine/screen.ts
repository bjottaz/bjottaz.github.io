// Tela da urna, desenhada num canvas 2D e usada como textura.
import {
  CANDIDATE_NUMBER_LENGTH,
  CANDIDATES,
  findCandidate,
  getCandidatePhoto,
  getInitials,
  type Candidate,
} from '../election/candidates';
import { fitFont, setFont } from './canvas-font';

export const SCREEN_WIDTH = 1280;
export const SCREEN_HEIGHT = 800;

const MARGIN = 50;

const COLORS = {
  background: '#f5f5f0',
  text: '#111',
  mutedText: '#555',
  stepLabel: '#666',
  nullMessage: '#444',
  white: '#fff',
  preference: '#2e7d32',
  veto: '#c62828',
  photoBackground: '#d9d9d2',
  silhouette: '#9e9e95',
};

export type VotingStep = 'preference' | 'veto' | 'finished';

export interface ScreenState {
  step: VotingStep;
  digits: string;
  isNullVote: boolean;
  /** Número escolhido na etapa de preferência, para bloquear o mesmo candidato no veto. */
  chosenPreference: string | null;
  isCursorVisible: boolean;
}

export function drawScreen(context: CanvasRenderingContext2D, state: ScreenState) {
  drawBackground(context);

  if (state.step === 'finished') {
    drawFinishedScreen(context);

    return;
  }

  const isVetoStep = state.step === 'veto';

  drawHeader(context, isVetoStep);

  if (state.isNullVote) {
    drawNullVoteMessage(context, isVetoStep);
    drawConfirmInstructions(context);

    return;
  }

  drawNumberBoxes(context, state);

  if (state.digits.length < CANDIDATE_NUMBER_LENGTH) {
    drawTypingHint(context);

    return;
  }

  const candidate = findCandidate(state.digits);

  if (!candidate) {
    drawWrongNumber(context);
    drawConfirmInstructions(context);

    return;
  }

  drawCandidateDetails(context, candidate);
  drawCandidatePhoto(context, candidate, isVetoStep);

  const isRepeatedCandidate = isVetoStep && candidate.number === state.chosenPreference;

  if (isRepeatedCandidate) {
    drawRepeatedCandidateWarning(context);

    return;
  }

  drawConfirmInstructions(context);
}

function drawBackground(context: CanvasRenderingContext2D) {
  context.fillStyle = COLORS.background;
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  context.textBaseline = 'alphabetic';
}

function drawFinishedScreen(context: CanvasRenderingContext2D) {
  context.fillStyle = COLORS.text;
  context.textAlign = 'center';
  setFont(context, 800, 300);
  context.fillText('FIM', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 100);

  context.fillStyle = COLORS.mutedText;
  context.textAlign = 'right';
  setFont(context, 600, 34);
  context.fillText('VOTOU', SCREEN_WIDTH - MARGIN, SCREEN_HEIGHT - 40);
}

function drawHeader(context: CanvasRenderingContext2D, isVetoStep: boolean) {
  context.fillStyle = COLORS.text;
  context.textAlign = 'left';
  setFont(context, 600, 32);
  context.fillText('SEU VOTO PARA', MARGIN, 70);

  context.fillStyle = COLORS.stepLabel;
  context.textAlign = 'right';
  setFont(context, 600, 28);
  context.fillText(isVetoStep ? 'Etapa 2 de 2' : 'Etapa 1 de 2', SCREEN_WIDTH - MARGIN, 70);

  context.fillStyle = COLORS.text;
  context.textAlign = 'left';
  setFont(context, 800, 78);
  context.fillText('Presidente', MARGIN, 160);

  drawStepBanner(context, isVetoStep);
}

function drawStepBanner(context: CanvasRenderingContext2D, isVetoStep: boolean) {
  const bannerText = isVetoStep
    ? 'VETO  ·  Quem você NÃO quer como presidente?'
    : 'PREFERÊNCIA  ·  Quem você quer como presidente?';

  context.fillStyle = isVetoStep ? COLORS.veto : COLORS.preference;
  context.fillRect(MARGIN, 185, SCREEN_WIDTH - MARGIN * 2, 64);

  context.fillStyle = COLORS.white;
  context.textAlign = 'left';
  setFont(context, 700, 34);
  context.fillText(bannerText, 72, 229);
}

function drawNullVoteMessage(context: CanvasRenderingContext2D, isVetoStep: boolean) {
  context.fillStyle = COLORS.text;
  context.textAlign = 'center';
  setFont(context, 800, 120);
  context.fillText('VOTO NULO', SCREEN_WIDTH / 2, 480);

  context.fillStyle = COLORS.nullMessage;
  setFont(context, 500, 30);
  context.fillText(isVetoStep ? 'Você não vetará ninguém.' : 'Você não apoiará ninguém.', SCREEN_WIDTH / 2, 535);
}

function drawNumberBoxes(context: CanvasRenderingContext2D, state: ScreenState) {
  context.fillStyle = COLORS.text;
  context.textAlign = 'left';
  setFont(context, 600, 40);
  context.fillText('Número:', MARGIN, 360);

  context.strokeStyle = COLORS.text;
  context.lineWidth = 3;

  for (let boxIndex = 0; boxIndex < CANDIDATE_NUMBER_LENGTH; boxIndex++) {
    const boxX = 230 + boxIndex * 100;
    const digit = state.digits[boxIndex];
    const isCursorBox = boxIndex === state.digits.length;

    context.strokeRect(boxX, 296, 84, 100);

    if (digit) {
      context.textAlign = 'center';
      setFont(context, 700, 76);
      context.fillText(digit, boxX + 42, 374);

      continue;
    }

    if (isCursorBox && state.isCursorVisible) {
      context.fillRect(boxX + 20, 378, 44, 6);
    }
  }

  context.textAlign = 'left';
}

function drawTypingHint(context: CanvasRenderingContext2D) {
  context.fillStyle = COLORS.mutedText;
  context.textAlign = 'left';
  setFont(context, 500, 30);
  context.fillText('Digite o número do candidato ou aperte NULO.', MARGIN, 480);
}

function drawWrongNumber(context: CanvasRenderingContext2D) {
  context.fillStyle = COLORS.text;
  context.textAlign = 'left';
  setFont(context, 800, 54);
  context.fillText('NÚMERO ERRADO', MARGIN, 490);

  setFont(context, 800, 100);
  context.fillText('VOTO NULO', MARGIN, 610);
}

function drawCandidateDetails(context: CanvasRenderingContext2D, candidate: Candidate) {
  context.fillStyle = COLORS.text;
  context.textAlign = 'left';
  setFont(context, 600, 36);
  context.fillText('Nome:', MARGIN, 470);
  context.fillText('Partido:', MARGIN, 540);

  fitFont(context, candidate.ballotName, 700, 44, 640);
  context.fillText(candidate.ballotName, 220, 470);

  setFont(context, 700, 44);
  context.fillText(candidate.party, 220, 540);
}

const PHOTO_AREA = { x: SCREEN_WIDTH - 330, y: 280, width: 270, height: 330 };

const loadedPhotos = new Map<string, HTMLImageElement>();

/** Carrega as fotos dos candidatos e avisa quando cada uma fica pronta, para redesenhar a tela. */
export function loadCandidatePhotos(onPhotoLoaded: () => void) {
  for (const candidate of CANDIDATES) {
    const photoUrl = getCandidatePhoto(candidate.number);

    if (!photoUrl || loadedPhotos.has(candidate.number)) {
      continue;
    }

    const image = new Image();

    image.onload = onPhotoLoaded;
    image.src = photoUrl;
    loadedPhotos.set(candidate.number, image);
  }
}

function drawCandidatePhoto(context: CanvasRenderingContext2D, candidate: Candidate, isVetoStep: boolean) {
  const photo = loadedPhotos.get(candidate.number);
  const isPhotoReady = photo !== undefined && photo.complete && photo.naturalWidth > 0;

  if (isPhotoReady) {
    drawPhotoCover(context, photo);
  } else {
    drawPhotoPlaceholder(context, candidate);
  }

  if (isVetoStep) {
    drawCrossOverPhoto(context, PHOTO_AREA.x, PHOTO_AREA.y);
  }
}

/** Desenha a foto preenchendo a moldura, cortando as sobras de cima e de baixo (como `object-fit: cover`). */
function drawPhotoCover(context: CanvasRenderingContext2D, photo: HTMLImageElement) {
  const areaRatio = PHOTO_AREA.width / PHOTO_AREA.height;
  const photoRatio = photo.naturalWidth / photo.naturalHeight;

  let sourceWidth = photo.naturalWidth;
  let sourceHeight = photo.naturalHeight;

  if (photoRatio > areaRatio) {
    sourceWidth = sourceHeight * areaRatio;
  } else {
    sourceHeight = sourceWidth / areaRatio;
  }

  const sourceX = (photo.naturalWidth - sourceWidth) / 2;
  const sourceY = (photo.naturalHeight - sourceHeight) / 2;

  context.drawImage(
    photo,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    PHOTO_AREA.x,
    PHOTO_AREA.y,
    PHOTO_AREA.width,
    PHOTO_AREA.height,
  );
}

/** Silhueta com as iniciais, usada enquanto a foto não carrega. */
function drawPhotoPlaceholder(context: CanvasRenderingContext2D, candidate: Candidate) {
  const { x: photoX, y: photoY, width: photoWidth, height: photoHeight } = PHOTO_AREA;
  const centerX = photoX + photoWidth / 2;

  context.fillStyle = COLORS.photoBackground;
  context.fillRect(photoX, photoY, photoWidth, photoHeight);

  context.fillStyle = COLORS.silhouette;
  context.beginPath();
  context.arc(centerX, photoY + 120, 62, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.ellipse(centerX, photoY + photoHeight, 115, 130, 0, Math.PI, 0);
  context.fill();

  context.fillStyle = COLORS.white;
  context.textAlign = 'center';
  setFont(context, 800, 54);
  context.fillText(getInitials(candidate.shortName), centerX, photoY + 140);
  context.textAlign = 'left';
}

function drawCrossOverPhoto(context: CanvasRenderingContext2D, photoX: number, photoY: number) {
  context.strokeStyle = COLORS.veto;
  context.lineWidth = 12;

  context.beginPath();
  context.moveTo(photoX + 20, photoY + 20);
  context.lineTo(photoX + 250, photoY + 310);
  context.moveTo(photoX + 250, photoY + 20);
  context.lineTo(photoX + 20, photoY + 310);
  context.stroke();
}

function drawRepeatedCandidateWarning(context: CanvasRenderingContext2D) {
  context.fillStyle = COLORS.veto;
  context.fillRect(MARGIN, 580, SCREEN_WIDTH - 440, 110);

  context.fillStyle = COLORS.white;
  context.textAlign = 'left';
  setFont(context, 800, 32);
  context.fillText('CANDIDATO JÁ ESCOLHIDO COMO PREFERÊNCIA', 70, 625);

  setFont(context, 500, 28);
  context.fillText('Aperte CORRIGE e escolha outro candidato para vetar.', 70, 668);
}

function drawConfirmInstructions(context: CanvasRenderingContext2D) {
  context.fillStyle = COLORS.text;
  context.fillRect(MARGIN, 640, SCREEN_WIDTH - MARGIN * 2, 3);

  context.textAlign = 'left';
  setFont(context, 600, 28);
  context.fillText('Aperte a tecla:', MARGIN, 685);

  setFont(context, 500, 28);
  context.fillText('CONFIRMA para CONFIRMAR este voto', 80, 725);
  context.fillText('CORRIGE para REINICIAR este voto', 80, 763);
}
