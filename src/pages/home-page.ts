import { CHART_ICON, VOTING_MACHINE_ICON } from '../components/icons';
import { renderLayout, renderLocationFilters, renderOfficeBadge } from '../components/layout';
import { renderRules } from '../components/rules';
import { ROUTES, toHash } from '../routes';
import { appState, getRounds } from '../state';
import { appRoot } from '../utils/dom';

export function renderHomePage() {
  const content = `
    ${renderLocationFilters({ availableRounds: 1 + getRounds().length })}
    <div class="page">
      ${renderOfficeBadge()}
      <div class="home-cards">
        ${renderVoteCard()}
        ${renderResultsCard()}
      </div>
      ${renderRules()}
    </div>`;

  appRoot.innerHTML = renderLayout(content, 'home');
}

function renderVoteCard(): string {
  const alreadyVotedMessage = appState.vote
    ? `<p class="already-voted">Você já votou nesta simulação. Pode votar de novo.</p>`
    : '';

  return `
    <a class="big-card" href="${toHash(ROUTES.votingBooth)}">
      <div class="icon">${VOTING_MACHINE_ICON}</div>
      <div>
        <h2>Votar</h2>
        <p>Entre na cabine e use a urna: 1 preferência e 1 veto para presidente.</p>
        ${alreadyVotedMessage}
      </div>
      <span class="arrow">→</span>
    </a>`;
}

function renderResultsCard(): string {
  return `
    <a class="big-card" href="${toHash(ROUTES.results)}">
      <div class="icon">${CHART_ICON}</div>
      <div>
        <h2>Resultados</h2>
        <p>Veja quem venceria, passaria ou seria eliminado no 1º turno com os dados de 2026.</p>
      </div>
      <span class="arrow">→</span>
    </a>`;
}
