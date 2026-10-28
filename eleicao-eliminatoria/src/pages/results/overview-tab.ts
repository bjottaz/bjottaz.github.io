import { roundOneClass, renderAvatar, renderStatus, renderVoteMark } from '../../components/candidate';
import { getTotalPreferences, getTotalVetoes, type RankedCandidate, type Tally } from '../../election/ranking';
import { escapeHtml } from '../../utils/dom';
import { formatCompact, formatInteger, formatPercent } from '../../utils/format';

const HIGHLIGHTED_COUNT = 2;

/** Totais da eleição, usados para calcular as porcentagens de cada cartão. */
interface ElectionTotals {
  preferences: number;
  vetoes: number;
}

/** Cartões ordenados por preferência, como no painel oficial de hoje. */
export function renderOverviewTab(rows: RankedCandidate[], tally: Tally): string {
  const totals: ElectionTotals = {
    preferences: getTotalPreferences(tally),
    vetoes: getTotalVetoes(tally),
  };

  const sortedByPreferences = [...rows].sort((first, second) => second.preferences - first.preferences);
  const leaders = sortedByPreferences.slice(0, HIGHLIGHTED_COUNT);
  const others = sortedByPreferences.slice(HIGHLIGHTED_COUNT);

  const leaderCards = leaders.map((row) => renderCandidateCard(row, totals, true));
  const otherCards = others.map((row) => renderCandidateCard(row, totals, false));

  return `
    <p class="caption">Ordem por preferência, como no painel de hoje. Quem ficou de fora aparece em cinza.</p>
    <div class="leaders-grid">${leaderCards.join('')}</div>
    <div class="candidates-grid">${otherCards.join('')}</div>`;
}

function renderCandidateCard(row: RankedCandidate, totals: ElectionTotals, isLarge: boolean): string {
  const { candidate } = row;
  const sizeClass = isLarge ? 'large' : '';
  const avatarSize = isLarge ? 'large' : 'medium';
  const preferencesFraction = row.preferences / totals.preferences;
  const pointsClass = row.points < 0 ? 'negative' : '';

  return `
    <div class="candidate-card ${sizeClass} ${roundOneClass(row)}">
      <div class="card-top">
        ${renderAvatar(candidate.number, { extraClass: avatarSize, ringShare: preferencesFraction })}
        <div class="card-identity">
          <div class="card-party">${candidate.party} – ${candidate.number}</div>
          <div class="card-name">${escapeHtml(candidate.ballotName)}</div>
          <div class="card-vote-mark">${renderVoteMark(candidate.number)}</div>
        </div>
      </div>
      ${renderCardStat('preferences', row.preferences, totals.preferences, 'preferências')}
      <div class="card-veto-row">
        ${renderCardStat('vetoes', row.vetoes, totals.vetoes, 'vetos')}
        <span class="card-score">Pontuação <b class="card-points ${pointsClass}">${formatCompact(row.points, true)}</b></span>
      </div>
      <div class="card-footer">
        ${renderStatus(row)}
      </div>
    </div>`;
}

/** Porcentagem em cima e a quantidade completa embaixo. */
function renderCardStat(statClass: string, votes: number, totalVotes: number, label: string): string {
  const share = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

  return `
    <div class="card-stat ${statClass}">
      <b>${formatPercent(share)}</b>
      <span>${formatInteger(votes)} ${label}</span>
    </div>`;
}
