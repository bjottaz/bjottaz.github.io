// Resultados do 2º turno: cartões dos candidatos e de onde vieram os votos.
import { renderAvatar, renderVoteMark } from '../../components/candidate';
import { getRoundStatusClass } from '../../components/round-scoreboard';
import { getSourceTitle, renderSourceAvatar, renderSourceMembers } from '../../components/transfer-source';
import { findCandidate } from '../../election/candidates';
import type { Tally } from '../../election/ranking';
import type { RoundResult, TransferSource } from '../../election/runoff';
import { NULL_PREFERENCE_KEY } from '../../election/simulation';
import { ROUTES, toHash } from '../../routes';
import { escapeHtml } from '../../utils/dom';
import { formatCompact, formatInteger, formatPercent } from '../../utils/format';
import { renderStackedBar, renderTurnoutBlock, renderUserVoteBlock } from './results-sidebar';

const HIGHLIGHTED_COUNT = 2;

const STATUS_LABELS: Record<string, string> = {
  elected: 'Eleito',
  out: 'Não eleito',
};

export function renderRunoffView(result: RoundResult, tally: Tally): string {
  return `
    <div class="results-layout">
      ${renderRunoffSidebar(result, tally)}
      <section class="main-content">
        ${renderOutcomeNotice(result)}
        ${renderCandidateCards(result)}
        ${renderTransfers(result)}
      </section>
    </div>`;
}

// ---------- Barra lateral ----------

function renderRunoffSidebar(result: RoundResult, tally: Tally): string {
  return `
    <aside class="sidebar">
      ${renderGeneralBlock(result)}
      ${renderVotesBlock(result)}
      ${renderTurnoutBlock(tally)}
      ${renderUserVoteBlock(tally.userVote)}
      <a class="button wide" href="${toHash(ROUTES.simulation)}">Simular outro cenário</a>
    </aside>`;
}

function renderGeneralBlock(result: RoundResult): string {
  return `
    <div class="block">
      <h3>Dados Gerais</h3>
      <small class="scenario-label">${result.round}º turno · só preferência, sem veto</small>
      <dl>
        <dt>Candidatos na disputa</dt><dd>${result.candidates.length}</dd>
        <dt>Regra</dt><dd>Mais votado</dd>
      </dl>
      <div class="progress-bar full"><div style="width:100%"></div><b>100,00%</b></div>
    </div>`;
}

function renderVotesBlock(result: RoundResult): string {
  const validVotes = getValidVotes(result);
  const nullShare = formatPercent((result.nullPreferences / result.turnout) * 100);

  const votesBar = renderStackedBar('Votos', result.turnout, [
    { label: 'Válidos', colorClass: 'green', votes: validVotes },
    { label: 'Nulos', colorClass: 'lilac', votes: result.nullPreferences },
  ]);

  return `
    <div class="block">
      <h3>Votação</h3>
      <div class="legend-bars">${votesBar}</div>
      <div class="total">${formatInteger(result.turnout)} <small>eleitores</small></div>
      <h4>Votos</h4>
      <dl>
        <dt><i class="swatch green"></i>Válidos</dt><dd>${formatInteger(validVotes)}</dd>
        <dt><i class="swatch lilac"></i>Nulos</dt><dd>${formatInteger(result.nullPreferences)} <small>${nullShare}</small></dd>
      </dl>
    </div>`;
}

// ---------- Conteúdo principal ----------

function renderOutcomeNotice(result: RoundResult): string {
  return `
    <div class="eliminated-notice">
      <div class="summary-line">Eleito no ${result.round}º turno: <span class="elected-chip">${getName(result.winner)}</span></div>
    </div>`;
}

function renderCandidateCards(result: RoundResult): string {
  const validVotes = getValidVotes(result);
  const cards = result.candidates.map((candidateNumber, index) =>
    renderCandidateCard(result, candidateNumber, validVotes, index < HIGHLIGHTED_COUNT),
  );

  return `
    <p class="caption">Ordem por votos no ${result.round}º turno. A % é sobre os votos válidos.</p>
    <div class="leaders-grid">${cards.slice(0, HIGHLIGHTED_COUNT).join('')}</div>
    <div class="candidates-grid">${cards.slice(HIGHLIGHTED_COUNT).join('')}</div>`;
}

function renderCandidateCard(result: RoundResult, candidateNumber: string, validVotes: number, isLarge: boolean): string {
  const candidate = findCandidate(candidateNumber);
  const votes = result.preferences[candidateNumber];
  const share = validVotes > 0 ? votes / validVotes : 0;
  const received = votes - result.keptVotes[candidateNumber];
  const statusClass = getRoundStatusClass(result, candidateNumber);
  const mutedClass = statusClass === 'out' ? 'eliminated' : '';
  const sizeClass = isLarge ? 'large' : '';

  return `
    <div class="candidate-card ${sizeClass} ${mutedClass}">
      <div class="card-top">
        ${renderAvatar(candidateNumber, { extraClass: isLarge ? 'large' : 'medium', ringShare: share })}
        <div class="card-identity">
          <div class="card-party">${candidate?.party} – ${candidateNumber}</div>
          <div class="card-name">${escapeHtml(candidate?.ballotName ?? candidateNumber)}</div>
          <div class="card-vote-mark">${renderVoteMark(candidateNumber)}</div>
        </div>
      </div>
      <div class="card-stat preferences">
        <b>${formatPercent(share * 100)}</b>
        <span>${formatInteger(votes)} votos</span>
      </div>
      <div class="card-origin">
        <span>Manteve <b>${formatCompact(result.keptVotes[candidateNumber])}</b></span>
        <span>Recebeu <b>${formatCompact(received, true)}</b></span>
      </div>
      <div class="card-footer">
        <span class="status ${statusClass}">${STATUS_LABELS[statusClass]}</span>
      </div>
    </div>`;
}

/** Para onde foram os eleitores de cada grupo que saiu da disputa (como as setas do desenho). */
function renderTransfers(result: RoundResult): string {
  const groups = result.sources.map((source) => renderTransferGroup(result, source));

  return `
    <section class="transfers">
      <h3>De onde vieram os votos</h3>
      <p class="caption">Quem seguiu na disputa manteve os votos. Os eleitores de quem saiu e os que anularam se dividiram assim:</p>
      <div class="transfer-groups">${groups.join('')}</div>
    </section>`;
}

function renderTransferGroup(result: RoundResult, source: TransferSource): string {
  // Mais votos primeiro; em empate, na ordem do resultado do turno (Nulo por último).
  const targetOrder = [...result.candidates, NULL_PREFERENCE_KEY];

  const destinations = Object.entries(result.transfers[source.key])
    .filter(([, votes]) => votes > 0)
    .sort(([firstTarget, firstVotes], [secondTarget, secondVotes]) => {
      const votesDifference = secondVotes - firstVotes;

      if (votesDifference !== 0) {
        return votesDifference;
      }

      return targetOrder.indexOf(firstTarget) - targetOrder.indexOf(secondTarget);
    });

  const rows = destinations.map(([target, votes]) => {
    const share = source.votes > 0 ? votes / source.votes : 0;

    return `
      <div class="transfer-row">
        <span class="transfer-target">${target === NULL_PREFERENCE_KEY ? 'Nulo' : getName(target)}</span>
        <span class="share-bar"><i style="width:${share * 100}%"></i></span>
        <span class="number">${formatPercent(share * 100, 0)}</span>
        <span class="number muted">${formatCompact(votes)}</span>
      </div>`;
  });

  return `
    <div class="transfer-group">
      <div class="transfer-header">
        ${renderSourceAvatar(source)}
        <span class="source-title">
          <b>${getSourceTitle(source, result.round)}</b>
          ${renderSourceMembers(source)}
        </span>
        <small>${formatCompact(source.votes)}</small>
      </div>
      ${rows.join('')}
    </div>`;
}

function getValidVotes(result: RoundResult): number {
  return result.candidates.reduce((total, candidateNumber) => total + result.preferences[candidateNumber], 0);
}

function getName(candidateNumber: string): string {
  return escapeHtml(findCandidate(candidateNumber)?.shortName ?? candidateNumber);
}
