import { roundOneClass } from '../../components/candidate';
import { FIGURE_CROSS, PERSON_FIGURE } from '../../components/icons';
import { getFirstRoundWinner, getRoundOneStatus, type RankedCandidate } from '../../election/ranking';
import { escapeHtml } from '../../utils/dom';
import { formatCompact } from '../../utils/format';

const FIGURE_TAGS = {
  elected: 'ELEITO',
  qualified: '&nbsp;',
  vetoed: 'VETADO',
  'not-qualified': 'NÃO ELEITO',
};

/** Um bonequinho por candidato, da melhor para a pior pontuação. */
export function renderFiguresTab(rows: RankedCandidate[]): string {
  const advancingCount = rows.filter((row) => row.qualified).length;
  const figures = rows.map(renderFigure);

  const footnote = getFirstRoundWinner(rows)
    ? 'Com maioria das preferências e pontuação positiva, a eleição termina no 1º turno.'
    : `Passar não garante vencer: quem decide é o 2º turno, entre os ${advancingCount} que seguem.`;

  return `
    <p class="caption">Cada bonequinho é um candidato, do melhor para o pior placar.</p>
    <div class="figures-grid">${figures.join('')}</div>
    <p class="caption">${footnote}</p>`;
}

function renderFigure(row: RankedCandidate): string {
  const status = getRoundOneStatus(row);
  const tag = FIGURE_TAGS[status];
  const cross = status === 'vetoed' ? FIGURE_CROSS : '';

  return `
    <div class="candidate-figure ${roundOneClass(row)}">
      <span class="eliminated-tag">${tag}</span>
      <svg viewBox="0 0 60 80" aria-hidden="true">${PERSON_FIGURE}${cross}</svg>
      <b>${escapeHtml(row.candidate.shortName)}</b>
      <span class="mini-stat">👍 ${formatCompact(row.preferences)}</span>
      <span class="mini-stat">🚫 ${formatCompact(row.vetoes)}</span>
      <strong>${formatCompact(row.points, true)}</strong>
    </div>`;
}
