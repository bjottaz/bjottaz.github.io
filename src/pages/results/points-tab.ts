import { roundOneClass, getMaxAbsolutePoints, renderDivergingBar } from '../../components/candidate';
import { getFirstRoundWinner, QUALIFIED_COUNT, type RankedCandidate } from '../../election/ranking';
import { escapeHtml } from '../../utils/dom';
import { formatCompact } from '../../utils/format';
import { renderRankingTable } from './ranking-table';

export function renderPointsTab(rows: RankedCandidate[]): string {
  const maxPoints = getMaxAbsolutePoints(rows);
  const chartRows = rows.map((row) => renderChartRow(row, maxPoints));

  const outcome = getFirstRoundWinner(rows)
    ? 'Houve vencedor no 1º turno, então ninguém é vetado.'
    : `Os ${QUALIFIED_COUNT} primeiros passam ao 2º turno; os 2 últimos são vetados.`;

  return `
    <p class="caption">Da maior para a menor pontuação. ${outcome} Pontuação = preferências − vetos.</p>
    <div class="points-chart">${chartRows.join('')}</div>
    ${renderRankingTable(rows, 'points')}`;
}

function renderChartRow(row: RankedCandidate, maxPoints: number): string {
  return `
    <div class="chart-row ${roundOneClass(row)}">
      <span class="candidate-name">${escapeHtml(row.candidate.shortName)}</span>
      <span class="diverging-bar">${renderDivergingBar(row.points, maxPoints)}</span>
      <span class="number">${formatCompact(row.points, true)}</span>
    </div>`;
}
