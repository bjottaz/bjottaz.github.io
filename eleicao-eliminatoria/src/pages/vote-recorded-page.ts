import { renderAvatar, renderVoteName } from '../components/candidate';
import { renderLayout } from '../components/layout';
import { GENERAL_DATA_2026 } from '../election/official-results-2026';
import type { Vote } from '../election/ranking';
import { navigateTo, resultsTabLink, ROUTES, toHash } from '../routes';
import { appState } from '../state';
import { appRoot } from '../utils/dom';
import { formatInteger } from '../utils/format';

export function renderVoteRecordedPage() {
  const vote = appState.vote;

  if (!vote) {
    navigateTo(ROUTES.votingBooth);

    return;
  }

  const content = `
    <div class="page narrow">
      <div class="vote-recorded">
        <div class="check-mark">✓</div>
        <h2>Voto computado</h2>
        <p class="subtitle">Seu voto para presidente foi registrado nesta simulação.</p>
        ${renderReceipt(vote)}
        <p class="note">Seu voto será somado aos ${formatInteger(GENERAL_DATA_2026.turnout)} eleitores do 1º turno de 2026.</p>
        <div class="actions">
          <a class="button primary" href="${toHash(ROUTES.simulation)}">Simular resultados</a>
          <a class="button" href="${resultsTabLink('geral')}">Ver dados gerais</a>
        </div>
        <a class="link" href="${toHash(ROUTES.votingBooth)}">Votar novamente</a>
      </div>
    </div>`;

  appRoot.innerHTML = renderLayout(content);
}

function renderReceipt(vote: Vote): string {
  return `
    <div class="receipt">
      ${renderReceiptRow('Preferência', 'preference', vote.preference)}
      ${renderReceiptRow('Veto', 'veto', vote.veto)}
    </div>`;
}

function renderReceiptRow(label: string, rowClass: string, candidateNumber: string | null): string {
  return `
    <div class="receipt-row ${rowClass}">
      <span class="label">${label}</span>
      ${renderAvatar(candidateNumber)}
      <span class="name">${renderVoteName(candidateNumber)}</span>
    </div>`;
}
