// Apuração animada: os votos vão aparecendo aos poucos até o resultado final.
import { renderRoundScoreboard } from '../../components/round-scoreboard';
import { renderScoreboard } from '../../components/scoreboard';
import { findCandidate } from '../../election/candidates';
import { GENERAL_DATA_2026 } from '../../election/official-results-2026';
import { getFirstRoundWinner, rankCandidates, type Tally } from '../../election/ranking';
import type { RoundResult } from '../../election/runoff';
import { simulateElection, type SimulationParams } from '../../election/simulation';
import { roundLink, ROUTES } from '../../routes';
import { appState, saveSimulationParams, setFirstRoundTally } from '../../state';
import { escapeHtml, queryElement } from '../../utils/dom';
import { formatInteger, formatPercent } from '../../utils/format';

const COUNT_DURATION_MS = 6000;

let animationFrameId = 0;

export function renderLiveCount(title: string): string {
  return `
    <section class="live-count">
      <div class="live-count-header">
        <div>
          <h3>${title}</h3>
          <small id="scenario"></small>
        </div>
        <div class="station-progress">
          <span id="stations">0 de ${formatInteger(GENERAL_DATA_2026.pollingStations)} seções</span>
          <div class="progress-bar"><div id="progress-fill" style="width:0%"></div><b id="progress-percent">0,00%</b></div>
        </div>
      </div>
      <div id="scoreboard" class="scoreboard"></div>
      <div class="count-finished" id="count-finished" hidden>
        <div class="count-summary" id="count-summary"></div>
        <a class="button primary" id="next-step"></a>
      </div>
    </section>`;
}

// ---------- 1º turno ----------

/** Placar antes de começar a apuração (sem pontuação nem eliminados). */
export function renderEmptyScoreboard(params: SimulationParams) {
  renderScoreboard(queryElement('#scoreboard'), simulateElection(params, appState.vote), 0);
}

export function startCount(params: SimulationParams) {
  params.seed = Math.floor(Math.random() * 1e9);
  saveSimulationParams();

  const finalTally = simulateElection(params, appState.vote);

  setFirstRoundTally(finalTally);
  queryElement('#scenario').textContent = finalTally.scenario;

  // Cada candidato é apurado num ritmo diferente (as regiões terminam em tempos diferentes).
  const preferencePace = createRandomPace(finalTally.preferences);
  const vetoPace = createRandomPace(finalTally.vetoes);
  const scoreboard = queryElement('#scoreboard');

  animateCount((progress) => {
    const partialTally: Tally = {
      ...finalTally,
      preferences: applyPace(finalTally.preferences, preferencePace, progress),
      vetoes: applyPace(finalTally.vetoes, vetoPace, progress),
    };

    renderScoreboard(scoreboard, partialTally, progress);
  }, () => showFirstRoundFinished(finalTally));
}

function showFirstRoundFinished(tally: Tally) {
  const rows = rankCandidates(tally);
  const winner = getFirstRoundWinner(rows);

  if (winner) {
    const winnerChip = renderChip(winner.candidate.number, 'elected-chip');

    showFinished(`<div class="summary-line">Eleito no 1º turno: ${winnerChip}</div>`, 'Ver resultados completos', roundLink(ROUTES.results, 1));

    return;
  }

  const vetoedChips = rows.filter((row) => row.eliminated).map((row) => renderChip(row.candidate.number, 'eliminated-chip'));

  const notQualifiedChips = rows
    .filter((row) => !row.eliminated && !row.qualified)
    .map((row) => renderChip(row.candidate.number, 'not-qualified-chip'));

  const summary = `
    <div class="summary-line">Vetados: ${vetoedChips.join('')}</div>
    <div class="summary-line">Não eleitos: ${notQualifiedChips.join('')}</div>`;

  showFinished(summary, 'Simular 2º turno', roundLink(ROUTES.simulation, 2));
}

// ---------- 2º turno ----------

/** Placar do turno antes da apuração: todos zerados, na ordem do turno anterior. */
export function renderEmptyRoundScoreboard(result: RoundResult) {
  const zeroVotes = Object.fromEntries(result.candidates.map((candidateNumber) => [candidateNumber, 0]));

  renderRoundScoreboard(queryElement('#scoreboard'), result, zeroVotes, false);
}

export function startRoundCount(result: RoundResult) {
  const preferencePace = createRandomPace(result.preferences);
  const scoreboard = queryElement('#scoreboard');

  animateCount((progress) => {
    const isFinished = progress >= 1;
    const partialVotes = applyPace(result.preferences, preferencePace, progress);

    renderRoundScoreboard(scoreboard, result, partialVotes, isFinished);
  }, () => showRoundFinished(result));
}

function showRoundFinished(result: RoundResult) {
  const winnerChip = renderChip(result.winner, 'elected-chip');

  showFinished(`<div class="summary-line">Eleito: ${winnerChip}</div>`, 'Ver resultados completos', roundLink(ROUTES.results, result.round));
}

// ---------- Animação ----------

/** Roda a apuração por COUNT_DURATION_MS, chamando `drawFrame` com o progresso de 0 a 1. */
function animateCount(drawFrame: (progress: number) => void, onFinish: () => void) {
  cancelAnimationFrame(animationFrameId);

  // O botão fica no fim do painel: sobe para o topo para acompanhar o placar.
  window.scrollTo({ top: 0, behavior: 'smooth' });
  queryElement('#count-finished').hidden = true;

  const scoreboard = queryElement('#scoreboard');
  const startTime = performance.now();

  const step = (now: number) => {
    const userLeftPage = !document.body.contains(scoreboard);

    if (userLeftPage) {
      return;
    }

    const progress = Math.min(1, (now - startTime) / COUNT_DURATION_MS);

    drawFrame(progress);
    updateProgressBar(progress);

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(step);

      return;
    }

    onFinish();
  };

  animationFrameId = requestAnimationFrame(step);
}

function createRandomPace(votesByCandidate: Record<string, number>): Record<string, number> {
  const pace: Record<string, number> = {};

  for (const candidateNumber of Object.keys(votesByCandidate)) {
    pace[candidateNumber] = 0.75 + Math.random() * 0.6;
  }

  return pace;
}

/** Votos apurados até agora: um expoente acima de 1 deixa o candidato mais lento no começo. */
function applyPace(
  votesByCandidate: Record<string, number>,
  pace: Record<string, number>,
  progress: number,
): Record<string, number> {
  const partialVotes: Record<string, number> = {};

  for (const [candidateNumber, votes] of Object.entries(votesByCandidate)) {
    partialVotes[candidateNumber] = votes * progress ** pace[candidateNumber];
  }

  return partialVotes;
}

function updateProgressBar(progress: number) {
  const countedStations = formatInteger(GENERAL_DATA_2026.pollingStations * progress);
  const totalStations = formatInteger(GENERAL_DATA_2026.pollingStations);

  queryElement('#stations').textContent = `${countedStations} de ${totalStations} seções`;
  queryElement('#progress-fill').style.width = `${progress * 100}%`;
  queryElement('#progress-percent').textContent = formatPercent(progress * 100);
}

function showFinished(summaryHtml: string, buttonLabel: string, href: string) {
  const nextStep = queryElement<HTMLAnchorElement>('#next-step');

  queryElement('#count-summary').innerHTML = summaryHtml;
  nextStep.textContent = buttonLabel;
  nextStep.href = href;
  queryElement('#count-finished').hidden = false;
}

function renderChip(candidateNumber: string, chipClass: string): string {
  const name = findCandidate(candidateNumber)?.shortName ?? candidateNumber;

  return `<span class="${chipClass}">${escapeHtml(name)}</span>`;
}
