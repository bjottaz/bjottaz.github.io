// Painel do 2º turno: em quem votam os eleitores de quem saiu da disputa (e os que anularam).
import { renderAvatar } from '../../components/candidate';
import { getSourceTitle, renderSourceAvatar, renderSourceMembers } from '../../components/transfer-source';
import { findCandidate } from '../../election/candidates';
import { createEqualSourceWeights, type RoundSetup, type TransferSource, type TransferWeights } from '../../election/runoff';
import { normalizeWeights, NULL_PREFERENCE_KEY } from '../../election/simulation';
import { ROUTES, roundLink } from '../../routes';
import { appRoot, escapeHtml } from '../../utils/dom';
import { formatCompact, formatPercent } from '../../utils/format';

export function renderRoundPanel(setup: RoundSetup): string {
  const previousRound = setup.round - 1;
  const sourceGroups = setup.sources.map((source, index) => renderSourceGroup(setup, source, index === 0));

  return `
    <aside class="panel round-panel">
      <h3>${setup.round}º turno</h3>
      <p class="round-intro">
        Quem segue na disputa mantém o voto. Escolha em quem votam os eleitores de quem saiu e os que anularam.
      </p>
      <p class="round-rule">${renderRule()}</p>
      ${sourceGroups.join('')}
      <button class="button primary wide" id="start-count">Iniciar apuração do ${setup.round}º turno</button>
      <a class="back-link" href="${roundLink(ROUTES.simulation, previousRound)}">← Voltar ao ${previousRound}º turno</a>
    </aside>`;
}

function renderRule(): string {
  return 'Duelo entre os 2 melhores do 1º turno: vence o mais votado.';
}

function renderSourceGroup(setup: RoundSetup, source: TransferSource, isOpen: boolean): string {
  const targets = [...setup.continuing, NULL_PREFERENCE_KEY];
  const rows = targets.map((target) => renderTargetSlider(source.key, target));

  return `
    <details class="source-group" ${isOpen ? 'open' : ''}>
      <summary>
        ${renderSourceAvatar(source)}
        <span class="source-title">
          <b>${getSourceTitle(source, setup.round)}</b>
          <small>${formatCompact(source.votes)} eleitores</small>
          ${renderSourceMembers(source)}
        </span>
      </summary>
      <div class="filter-group">
        <small>Os valores são pesos: a % ao lado é a parte de cada um no total.</small>
        <div class="filter-actions">
          <button type="button" data-equal-source="${source.key}">Dividir igualmente</button>
        </div>
        ${rows.join('')}
      </div>
    </details>`;
}

function getCandidateNumberOrNull(key: string): string | null {
  return key === NULL_PREFERENCE_KEY ? null : key;
}

function renderTargetSlider(sourceKey: string, target: string): string {
  const candidate = findCandidate(target);
  const name = candidate ? escapeHtml(candidate.shortName) : 'Nulo';
  const dataAttributes = `data-source="${sourceKey}" data-target="${target}"`;

  return `
    <div class="candidate-slider">
      <span class="candidate-slider-header">
        ${renderAvatar(getCandidateNumberOrNull(target))}
        <b>${name}</b>
        <output ${dataAttributes}></output>
      </span>
      <input type="range" min="0" max="100" step="1" ${dataAttributes}>
    </div>`;
}

// ---------- Eventos ----------

/** Liga os sliders aos pesos. `onChange` salva os pesos a cada mudança. */
export function bindRoundControls(setup: RoundSetup, weights: TransferWeights, onChange: () => void) {
  const panel = appRoot.querySelector<HTMLElement>('.round-panel')!;

  panel.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement;
    const { source, target } = input.dataset;

    if (!source || !target) {
      return;
    }

    weights[source][target] = Number(input.value);
    refreshRoundControls(weights);
    onChange();
  });

  panel.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-equal-source]');
    const sourceKey = button?.dataset.equalSource;

    if (!sourceKey) {
      return;
    }

    const nullWeight = weights[sourceKey][NULL_PREFERENCE_KEY] ?? 0;

    weights[sourceKey] = createEqualSourceWeights(setup.continuing, nullWeight);
    refreshRoundControls(weights);
    onChange();
  });

  refreshRoundControls(weights);
}

function refreshRoundControls(weights: TransferWeights) {
  const sharesBySource: Record<string, Record<string, number>> = {};

  for (const [sourceKey, sourceWeights] of Object.entries(weights)) {
    sharesBySource[sourceKey] = normalizeWeights(sourceWeights);
  }

  appRoot.querySelectorAll<HTMLInputElement>('.round-panel input[data-source]').forEach((input) => {
    input.value = String(weights[input.dataset.source!][input.dataset.target!]);
  });

  appRoot.querySelectorAll<HTMLOutputElement>('.round-panel output[data-source]').forEach((output) => {
    const share = sharesBySource[output.dataset.source!][output.dataset.target!];

    output.textContent = formatPercent(share * 100, 0);
  });
}
