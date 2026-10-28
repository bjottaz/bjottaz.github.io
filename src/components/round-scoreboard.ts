// Placar do 2º turno: só votos (sem veto), com a % dos válidos.
import type { RoundResult } from '../election/runoff';
import { findCandidate } from '../election/candidates';
import { escapeHtml } from '../utils/dom';
import { formatCompact, formatPercent } from '../utils/format';
import { renderAvatar, renderVoteMark } from './candidate';

const HEADER_ROW = `
  <div class="scoreboard-row round-row header-row">
    <span></span>
    <span></span>
    <span>Candidato</span>
    <span class="number">Votos</span>
    <span></span>
    <span class="number">Válidos</span>
  </div>`;

/** `preferences` são os votos apurados até agora; `result` diz quem venceu (usado só no fim). */
export function renderRoundScoreboard(
  element: HTMLElement,
  result: RoundResult,
  preferences: Record<string, number>,
  isFinished: boolean,
) {
  const validVotes = result.candidates.reduce((total, candidateNumber) => total + preferences[candidateNumber], 0);
  const sorted = [...result.candidates].sort((first, second) => preferences[second] - preferences[first]);

  const rows = sorted.map((candidateNumber, index) => {
    const share = validVotes > 0 ? preferences[candidateNumber] / validVotes : 0;
    const statusClass = isFinished ? getRoundStatusClass(result, candidateNumber) : '';

    return renderRow(candidateNumber, index + 1, preferences[candidateNumber], share, statusClass);
  });

  element.innerHTML = HEADER_ROW + rows.join('');
}

/** "elected" (eleito) ou "out" (não eleito). */
export function getRoundStatusClass(result: RoundResult, candidateNumber: string): string {
  return result.winner === candidateNumber ? 'elected' : 'out';
}

function renderRow(candidateNumber: string, position: number, votes: number, share: number, statusClass: string): string {
  const candidate = findCandidate(candidateNumber);
  const name = candidate ? escapeHtml(candidate.shortName) : candidateNumber;

  return `
    <div class="scoreboard-row round-row ${statusClass}">
      <span class="position">${position}º</span>
      ${renderAvatar(candidateNumber, { ringShare: share })}
      <span class="candidate-name">${name}${renderVoteMark(candidateNumber)}</span>
      <span class="number">${formatCompact(votes)}</span>
      <span class="share-bar"><i style="width:${share * 100}%"></i></span>
      <span class="number bold">${formatPercent(share * 100)}</span>
    </div>`;
}
