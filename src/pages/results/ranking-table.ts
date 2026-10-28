import { roundOneClass, renderAvatar, renderStatus, renderVoteMark } from '../../components/candidate';
import type { RankedCandidate } from '../../election/ranking';
import { escapeHtml } from '../../utils/dom';
import { formatInteger } from '../../utils/format';

type HighlightedColumn = 'preferences' | 'vetoes' | 'points';

const COLUMNS: { id: HighlightedColumn; label: string }[] = [
  { id: 'preferences', label: 'Preferências' },
  { id: 'vetoes', label: 'Vetos' },
  { id: 'points', label: 'Pontuação' },
];

const TABLE_NOTE = 'As três colunas aparecem sempre, para que o mais votado possa aparecer eliminado sem parecer manipulação.';

export function renderMostVotedTab(rows: RankedCandidate[]): string {
  const sortedByPreferences = [...rows].sort((first, second) => second.preferences - first.preferences);

  return `
    <p class="caption">Ordem decrescente por preferência: a colocação de hoje. ${TABLE_NOTE}</p>
    ${renderRankingTable(sortedByPreferences, 'preferences')}`;
}

export function renderMostVetoedTab(rows: RankedCandidate[]): string {
  const sortedByVetoes = [...rows].sort((first, second) => second.vetoes - first.vetoes);

  return `
    <p class="caption">Ordem decrescente por vetos: quem concentra a rejeição. ${TABLE_NOTE}</p>
    ${renderRankingTable(sortedByVetoes, 'vetoes')}`;
}

export function renderRankingTable(rows: RankedCandidate[], highlightedColumn: HighlightedColumn): string {
  const headerCells = COLUMNS.map((column) => {
    const highlightClass = column.id === highlightedColumn ? 'highlighted' : '';

    return `<th class="${highlightClass}">${column.label}</th>`;
  });

  const bodyRows = rows.map((row, index) => renderTableRow(row, index + 1));

  return `
    <table class="results-table">
      <thead>
        <tr><th>#</th><th>Candidato</th>${headerCells.join('')}<th></th></tr>
      </thead>
      <tbody>${bodyRows.join('')}</tbody>
    </table>`;
}

function renderTableRow(row: RankedCandidate, position: number): string {
  const { candidate } = row;
  const plusSign = row.points > 0 ? '+' : '';

  return `
    <tr class="${roundOneClass(row)}">
      <td>${position}º</td>
      <td>
        <div class="candidate-cell">
          ${renderAvatar(candidate.number)}
          <span>
            <b>${escapeHtml(candidate.shortName)}</b>
            <small>${candidate.party} – ${candidate.number}</small>
            ${renderVoteMark(candidate.number)}
          </span>
        </div>
      </td>
      <td class="number">${formatInteger(row.preferences)}</td>
      <td class="number">${formatInteger(row.vetoes)}</td>
      <td class="number bold">${plusSign}${formatInteger(row.points)}</td>
      <td>${renderStatus(row)}</td>
    </tr>`;
}
