import { rankCandidates, type RankedCandidate, type Tally } from '../election/ranking';
import { escapeHtml } from '../utils/dom';
import { formatCompact } from '../utils/format';
import { getMaxAbsolutePoints, renderAvatar, renderDivergingBar, renderVoteMark, roundOneClass } from './candidate';

const HEADER_ROW = `
  <div class="scoreboard-row header-row">
    <span></span>
    <span></span>
    <span>Candidato</span>
    <span class="number">Pref.</span>
    <span class="number">Vetos</span>
    <span></span>
    <span class="number">Pontos</span>
  </div>`;

/** Placar ao vivo. `progress` vai de 0 (apuração não começou) a 1 (apuração terminou). */
export function renderScoreboard(element: HTMLElement, tally: Tally, progress: number) {
  const rows = rankCandidates(tally);
  const maxPoints = getMaxAbsolutePoints(rows);
  const hasStarted = progress > 0;

  const rowsHtml = rows.map((row) => renderScoreboardRow(row, maxPoints, hasStarted));

  element.innerHTML = HEADER_ROW + rowsHtml.join('');
}

function renderScoreboardRow(row: RankedCandidate, maxPoints: number, hasStarted: boolean): string {
  const statusClass = hasStarted ? roundOneClass(row) : '';
  const points = hasStarted ? formatCompact(row.points, true) : '–';

  return `
    <div class="scoreboard-row ${statusClass}">
      <span class="position">${row.rank}º</span>
      ${renderAvatar(row.candidate.number)}
      <span class="candidate-name">${escapeHtml(row.candidate.shortName)}${renderVoteMark(row.candidate.number)}</span>
      <span class="number">${formatCompact(row.preferences)}</span>
      <span class="number">${formatCompact(row.vetoes)}</span>
      <span class="diverging-bar">${renderDivergingBar(row.points, maxPoints)}</span>
      <span class="number bold">${points}</span>
    </div>`;
}
