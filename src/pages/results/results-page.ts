import { renderLayout, renderLocationFilters, renderOfficeBadge } from '../../components/layout';
import { getFirstRoundWinner, rankCandidates, type RankedCandidate, type Tally } from '../../election/ranking';
import type { RoundNumber } from '../../election/runoff';
import { resultsTabLink } from '../../routes';
import { getCurrentTally, getRounds } from '../../state';
import { appRoot, escapeHtml } from '../../utils/dom';
import { renderFiguresTab } from './figures-tab';
import { renderOverviewTab } from './overview-tab';
import { renderPointsTab } from './points-tab';
import { renderMostVetoedTab, renderMostVotedTab } from './ranking-table';
import { renderResultsSidebar } from './results-sidebar';
import { renderRunoffView } from './runoff-view';

interface ResultsTab {
  /** Nome usado na URL (em português, como o resto do site). */
  slug: string;
  label: string;
  render: (rows: RankedCandidate[], tally: Tally) => string;
}

const RESULTS_TABS: ResultsTab[] = [
  { slug: 'geral', label: 'Dados gerais', render: renderOverviewTab },
  { slug: 'votados', label: 'Mais votados', render: renderMostVotedTab },
  { slug: 'vetados', label: 'Mais vetados', render: renderMostVetoedTab },
  { slug: 'pontuacao', label: 'Pontuação', render: renderPointsTab },
  { slug: 'bonecos', label: 'Quem sai e quem fica', render: renderFiguresTab },
];

export function renderResultsPage(tabSlug: string | null, round: RoundNumber) {
  const tally = getCurrentTally();
  const rounds = getRounds();
  const availableRounds = 1 + rounds.length;
  const runoffResult = rounds.find((result) => result.round === round);
  const filters = renderLocationFilters({ selectedRound: runoffResult ? round : 1, availableRounds });

  // O 2º turno tem uma visão própria (sem veto nem pontuação).
  if (runoffResult) {
    const runoffContent = `
      ${filters}
      <div class="page wide">
        ${renderOfficeBadge()}
        ${renderRunoffView(runoffResult, tally)}
      </div>`;

    appRoot.innerHTML = renderLayout(runoffContent, 'results');

    return;
  }

  const activeTab = RESULTS_TABS.find((tab) => tab.slug === tabSlug) ?? RESULTS_TABS[0];
  const rows = rankCandidates(tally);

  const content = `
    ${filters}
    <div class="page wide">
      ${renderOfficeBadge()}
      <div class="results-layout">
        ${renderResultsSidebar(tally)}
        <section class="main-content">
          ${renderTabNavigation(activeTab)}
          ${renderEliminatedNotice(rows)}
          ${activeTab.render(rows, tally)}
        </section>
      </div>
    </div>`;

  appRoot.innerHTML = renderLayout(content, 'results');
}

function renderTabNavigation(activeTab: ResultsTab): string {
  const links = RESULTS_TABS.map((tab) => {
    const activeClass = tab === activeTab ? 'active' : '';

    return `<a href="${resultsTabLink(tab.slug)}" class="${activeClass}">${tab.label}</a>`;
  });

  return `<nav class="tabs">${links.join('')}</nav>`;
}

function renderEliminatedNotice(rows: RankedCandidate[]): string {
  const winner = getFirstRoundWinner(rows);

  if (winner) {
    return `
      <div class="eliminated-notice">
        <div class="summary-line">Eleito no 1º turno: ${renderChips([winner], 'elected-chip')}</div>
        <div class="summary-line notice-footnote">Teve mais da metade das preferências válidas e pontuação positiva: não há 2º turno.</div>
      </div>`;
  }

  const vetoedChips = renderChips(rows.filter((row) => row.eliminated), 'eliminated-chip');
  const notQualifiedChips = renderChips(rows.filter((row) => !row.eliminated && !row.qualified), 'not-qualified-chip');
  const advancingCount = rows.filter((row) => row.qualified).length;

  return `
    <div class="eliminated-notice">
      <div class="summary-line">Vetados no 1º turno: ${vetoedChips}</div>
      <div class="summary-line">Não eleitos: ${notQualifiedChips}</div>
      <div class="summary-line notice-footnote">${advancingCount} candidatos seguem para o 2º turno.</div>
    </div>`;
}

function renderChips(rows: RankedCandidate[], chipClass: string): string {
  return rows.map((row) => `<span class="${chipClass}">${escapeHtml(row.candidate.shortName)}</span>`).join(' ');
}
