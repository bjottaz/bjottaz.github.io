import { renderLayout, renderOfficeBadge } from '../components/layout';
import { CANDIDATES } from '../election/candidates';
import { navigateTo, ROUTES } from '../routes';
import { saveVote } from '../state';
import { appRoot, escapeHtml, queryElement } from '../utils/dom';
import { readFromStorage, saveToStorage } from '../utils/storage';
import { mountFlatMachine } from '../voting-machine/flat-machine';
import { createVotingSession, type VotingSession } from '../voting-machine/voting-session';

type MachineMode = '3d' | '2d';

interface MachineView {
  destroy(): void;
}

const MODE_STORAGE_KEY = 'votingMachineMode';
const SMALL_SCREEN_QUERY = '(max-width: 900px)';

let activeSession: VotingSession | null = null;
let activeView: MachineView | null = null;
/** Muda a cada troca de modo, para ignorar uma urna 3D que terminou de carregar tarde demais. */
let mountCounter = 0;

export function renderVotingBoothPage() {
  const isWebGlAvailable = supportsWebGl();
  const initialMode = getInitialMode(isWebGlAvailable);

  const content = `
    <div class="booth">
      <div class="stage" id="stage"></div>
      ${renderInstructions(initialMode, isWebGlAvailable)}
    </div>`;

  appRoot.innerHTML = renderLayout(content, 'votingBooth');

  activeSession = createVotingSession((vote) => {
    saveVote(vote);
    navigateTo(ROUTES.voteRecorded);
  });

  queryElement<HTMLInputElement>('#machine-mode-toggle').addEventListener('change', (event) => {
    const mode: MachineMode = (event.target as HTMLInputElement).checked ? '3d' : '2d';

    saveToStorage(MODE_STORAGE_KEY, mode);
    void mountMachine(mode);
  });

  void mountMachine(initialMode);
}

export function destroyVotingMachine() {
  mountCounter++;
  activeView?.destroy();
  activeView = null;
  activeSession?.destroy();
  activeSession = null;
}

/** Troca a urna desenhada sem perder o voto em andamento (a sessão continua a mesma). */
async function mountMachine(mode: MachineMode) {
  const mountId = ++mountCounter;
  const stage = queryElement('#stage');
  const session = activeSession;

  if (!session) {
    return;
  }

  activeView?.destroy();
  activeView = null;

  stage.classList.toggle('flat', mode === '2d');
  queryElement('#rotate-hint').hidden = mode === '2d';

  if (mode === '2d') {
    activeView = mountFlatMachine(stage, session);

    return;
  }

  stage.innerHTML = '<div class="loading">Preparando a urna…</div>';

  // O Three.js é pesado, então só é carregado quando a urna 3D é usada.
  const { mountVotingMachine } = await import('../voting-machine/voting-machine');

  const isOutdated = mountId !== mountCounter;

  if (isOutdated) {
    return;
  }

  stage.innerHTML = '';

  try {
    activeView = mountVotingMachine(stage, session);
  } catch {
    // Sem WebGL de verdade: volta para a urna 2D.
    queryElement<HTMLInputElement>('#machine-mode-toggle').checked = false;
    void mountMachine('2d');
  }
}

function getInitialMode(isWebGlAvailable: boolean): MachineMode {
  if (!isWebGlAvailable) {
    return '2d';
  }

  const savedMode = readFromStorage<MachineMode>(MODE_STORAGE_KEY);

  if (savedMode === '2d' || savedMode === '3d') {
    return savedMode;
  }

  return window.matchMedia(SMALL_SCREEN_QUERY).matches ? '2d' : '3d';
}

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');

    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function renderInstructions(mode: MachineMode, isWebGlAvailable: boolean): string {
  const checkedAttribute = mode === '3d' ? 'checked' : '';
  const disabledAttribute = isWebGlAvailable ? '' : 'disabled title="Este navegador não suporta 3D"';

  return `
    <aside class="instructions">
      <div class="instructions-top">
        ${renderOfficeBadge()}
        <label class="switch">
          <input type="checkbox" id="machine-mode-toggle" ${checkedAttribute} ${disabledAttribute}>
          <span class="switch-track" aria-hidden="true"></span>
          Urna 3D
        </label>
      </div>
      <h2>Cabine de votação</h2>
      <ol>
        <li><b>Etapa 1 · Preferência:</b> quem você quer como presidente?</li>
        <li><b>Etapa 2 · Veto:</b> quem você <u>não</u> quer como presidente?</li>
      </ol>
      <p>Clique nas teclas da urna ou use o teclado:</p>
      <ul class="shortcuts">
        <li><kbd>0</kbd>–<kbd>9</kbd> número</li>
        <li><kbd>N</kbd> nulo</li>
        <li><kbd>Backspace</kbd> corrige</li>
        <li><kbd>Enter</kbd> confirma</li>
      </ul>
      <p class="hint" id="rotate-hint">Arraste para girar a urna. Role para aproximar.</p>
      <details>
        <summary>Candidatos</summary>
        <ul class="candidate-list">${renderCandidateList()}</ul>
      </details>
    </aside>`;
}

function renderCandidateList(): string {
  const sortedByName = [...CANDIDATES].sort((first, second) => first.shortName.localeCompare(second.shortName));

  const items = sortedByName.map(
    (candidate) => `<li><b>${candidate.number}</b> ${escapeHtml(candidate.shortName)} <small>${candidate.party}</small></li>`,
  );

  return items.join('');
}
