import { renderVoteName } from '../../components/candidate';
import { GENERAL_DATA_2026 } from '../../election/official-results-2026';
import {
  getFirstRoundWinner,
  getTotalPreferences,
  getTotalVetoes,
  rankCandidates,
  type Tally,
  type Vote,
} from '../../election/ranking';
import { ROUTES, toHash } from '../../routes';
import { escapeHtml } from '../../utils/dom';
import { formatInteger, formatPercent } from '../../utils/format';

export function renderResultsSidebar(tally: Tally): string {
  return `
    <aside class="sidebar">
      ${renderGeneralBlock(tally)}
      ${renderVotesBlock(tally)}
      ${renderTurnoutBlock(tally)}
      ${renderUserVoteBlock(tally.userVote)}
      <a class="button wide" href="${toHash(ROUTES.simulation)}">Simular outro cenário</a>
    </aside>`;
}

function renderGeneralBlock(tally: Tally): string {
  const rows = rankCandidates(tally);
  const vetoedCount = rows.filter((row) => row.eliminated).length;
  const qualifiedCount = rows.filter((row) => row.qualified).length;

  // Com vencedor no 1º turno, a eleição acaba ali: ninguém é vetado nem passa.
  const outcomeRows = getFirstRoundWinner(rows)
    ? '<dt>Eleito no 1º turno</dt><dd>Sim</dd>'
    : `<dt>Vetados no 1º turno</dt><dd>${vetoedCount}</dd><dt>Passam ao 2º turno</dt><dd>${qualifiedCount}</dd>`;

  return `
    <div class="block">
      <h3>Dados Gerais</h3>
      <small class="scenario-label">Cenário: ${escapeHtml(tally.scenario)}</small>
      <dl>
        <dt>Número de vagas</dt><dd>1</dd>
        ${outcomeRows}
        <dt>Seções totalizadas</dt><dd>${formatInteger(GENERAL_DATA_2026.pollingStations)}</dd>
      </dl>
      <div class="progress-bar full"><div style="width:100%"></div><b>100,00%</b></div>
    </div>`;
}

function renderVotesBlock(tally: Tally): string {
  const validPreferences = getTotalPreferences(tally);
  const validVetoes = getTotalVetoes(tally);
  const nullPreferencesShare = formatPercent((tally.nullPreferences / tally.turnout) * 100);
  const nullVetoesShare = formatPercent((tally.nullVetoes / tally.turnout) * 100);

  const preferencesBar = renderStackedBar('Preferências', tally.turnout, [
    { label: 'Válidas', colorClass: 'green', votes: validPreferences },
    { label: 'Nulas', colorClass: 'lilac', votes: tally.nullPreferences },
  ]);

  const vetoesBar = renderStackedBar('Vetos', tally.turnout, [
    { label: 'Válidos', colorClass: 'red', votes: validVetoes },
    { label: 'Nulos', colorClass: 'lilac', votes: tally.nullVetoes },
  ]);

  return `
    <div class="block">
      <h3>Votação</h3>
      <div class="legend-bars">${preferencesBar}${vetoesBar}</div>
      <div class="total">${formatInteger(tally.turnout)} <small>eleitores</small></div>
      <h4>Preferências</h4>
      <dl>
        <dt><i class="swatch green"></i>Válidas</dt><dd>${formatInteger(validPreferences)}</dd>
        <dt><i class="swatch lilac"></i>Nulas</dt><dd>${formatInteger(tally.nullPreferences)} <small>${nullPreferencesShare}</small></dd>
      </dl>
      <h4>Vetos</h4>
      <dl>
        <dt><i class="swatch red"></i>Válidos</dt><dd>${formatInteger(validVetoes)}</dd>
        <dt><i class="swatch lilac"></i>Nulos</dt><dd>${formatInteger(tally.nullVetoes)} <small>${nullVetoesShare}</small></dd>
      </dl>
    </div>`;
}

interface BarSegment {
  label: string;
  colorClass: string;
  votes: number;
}

/** Barra dividida com as cores das legendas; cada parte tem a largura da sua fração dos votos. */
export function renderStackedBar(title: string, totalVotes: number, segments: BarSegment[]): string {
  const parts = segments.map((segment) => {
    const percent = (segment.votes / totalVotes) * 100;
    const tooltip = `${title} ${segment.label.toLowerCase()}: ${formatPercent(percent)}`;

    return `<i class="swatch ${segment.colorClass}" style="width:${percent}%" title="${tooltip}"></i>`;
  });

  return `<div class="stacked-bar" aria-label="${title}">${parts.join('')}</div>`;
}

export function renderTurnoutBlock(tally: Tally): string {
  // Ausentes de 2026 menos os que passaram a votar na simulação.
  const returningVoters = tally.turnout - GENERAL_DATA_2026.turnout;
  const abstentions = GENERAL_DATA_2026.abstentions - returningVoters;
  const votersInStations = tally.turnout + abstentions;
  const turnoutPercent = (tally.turnout / votersInStations) * 100;
  const abstentionPercent = (abstentions / votersInStations) * 100;

  return `
    <div class="block">
      <div class="electorate">
        <span>Eleitorado apto</span>
        <b>${formatInteger(tally.electorate)}</b>
      </div>
      <div class="turnout-split">
        <div>
          <span>Comparecimento</span>
          <b>${formatInteger(tally.turnout)}</b>
        </div>
        <div class="align-right">
          <span>Abstenção</span>
          <b>${formatInteger(abstentions)}</b>
        </div>
      </div>
      <div class="progress-bar split">
        <div style="width:${turnoutPercent}%"><b>${formatPercent(turnoutPercent)}</b></div>
        <b class="align-right">${formatPercent(abstentionPercent)}</b>
      </div>
    </div>`;
}

export function renderUserVoteBlock(userVote: Vote | null): string {
  if (!userVote) {
    return `<a class="button primary wide" href="${toHash(ROUTES.votingBooth)}">Votar</a>`;
  }

  return `
    <div class="block your-vote">
      <h3>Seu voto</h3>
      <p><span class="vote-mark preference">preferência</span> ${renderVoteName(userVote.preference)}</p>
      <p><span class="vote-mark veto">veto</span> ${renderVoteName(userVote.veto)}</p>
    </div>`;
}
