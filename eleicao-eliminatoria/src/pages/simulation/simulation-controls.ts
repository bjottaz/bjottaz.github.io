// Painel "Cenário": hipótese do autor, controles principais e filtros avançados da simulação.
import { renderAvatar, renderVoteName } from '../../components/candidate';
import { CANDIDATES, findCandidate } from '../../election/candidates';
import { GENERAL_DATA_2026, PREFERENCES_2026 } from '../../election/official-results-2026';
import {
  AUTHOR_PARAMS,
  copyParams,
  createDefaultParams,
  createEqualWeights,
  createNeutralParams,
  getNonLeaderNumbers,
  isAuthorScenario,
  normalizeWeights,
  NULL_PREFERENCE_KEY,
  type SimulationParams,
} from '../../election/simulation';
import { appState } from '../../state';
import { appRoot, escapeHtml } from '../../utils/dom';
import { formatCompact, formatPercent } from '../../utils/format';

type ScalarParam =
  | 'tacticalVoting'
  | 'returningAbstainers'
  | 'returningBlankNull'
  | 'noise'
  | 'abstainerVetoSplit'
  | 'blankNullVetoSplit';

type WeightParam = 'abstainerPreferenceWeights' | 'blankNullPreferenceWeights';
type CandidateParam = 'vetoSplitByCandidate' | WeightParam;
type SliderParam = ScalarParam | CandidateParam;

/** Divisões "Lula ⟷ Flávio": o controle mostra a parte de Flávio, para Lula ficar à esquerda. */
const SPLIT_PARAMS: SliderParam[] = ['vetoSplitByCandidate', 'abstainerVetoSplit', 'blankNullVetoSplit'];
const WEIGHT_PARAMS: SliderParam[] = ['abstainerPreferenceWeights', 'blankNullPreferenceWeights'];

const BLANK_NULL_VOTERS = GENERAL_DATA_2026.blankVotes + GENERAL_DATA_2026.nullVotes;

/** Candidato usado como exemplo no texto da margem de erro (o 3º colocado). */
const NOISE_EXAMPLE_NUMBER = '70';

/** Os dois grupos que passam a votar: ausentes e brancos/nulos. */
interface ReturningGroup {
  id: string;
  title: string;
  countParam: ScalarParam;
  countLabel: string;
  weightsParam: WeightParam;
  vetoParam: ScalarParam;
  vetoLabel: string;
}

const ABSTAINERS_GROUP: ReturningGroup = {
  id: 'abstainers-group',
  title: 'Em quem os ausentes votam',
  countParam: 'returningAbstainers',
  countLabel: 'Ausentes que passam a votar',
  weightsParam: 'abstainerPreferenceWeights',
  vetoParam: 'abstainerVetoSplit',
  vetoLabel: 'Veto dos ausentes',
};

const BLANK_NULL_GROUP: ReturningGroup = {
  id: 'blank-null-group',
  title: 'Em quem os brancos e nulos votam',
  countParam: 'returningBlankNull',
  countLabel: 'Brancos e nulos que passam a votar',
  weightsParam: 'blankNullPreferenceWeights',
  vetoParam: 'blankNullVetoSplit',
  vetoLabel: 'Veto dos brancos e nulos',
};

// ---------- HTML ----------

export function renderControlPanel(): string {
  return `
    <aside class="panel">
      <h3>Cenário</h3>
      <div class="presets">
        <button type="button" data-action="author">Hipótese do autor</button>
        <button type="button" data-action="clear">Limpar filtros</button>
      </div>
      ${renderMainControls()}
      ${renderAdvancedFilters()}
      <button class="button primary wide" id="start-count">Iniciar apuração</button>
      ${renderUserVoteNote()}
    </aside>`;
}

function renderMainControls(): string {
  const tacticalSlider = renderControl({
    param: 'tacticalVoting',
    label: 'Voto tático',
    description: 'Parte dos eleitores de Lula e Flávio veta o 3º colocado em vez do rival.',
    max: 0.5,
    step: 0.01,
  });

  const abstainersSlider = renderControl({
    param: 'returningAbstainers',
    label: ABSTAINERS_GROUP.countLabel,
    description: `Parte dos ${formatCompact(GENERAL_DATA_2026.abstentions)} eleitores que faltaram em 2026 e votariam por causa do veto.`,
    max: 0.5,
    step: 0.01,
  });

  const blankNullSlider = renderControl({
    param: 'returningBlankNull',
    label: BLANK_NULL_GROUP.countLabel,
    description: `Parte dos ${formatCompact(BLANK_NULL_VOTERS)} que votaram branco ou nulo em 2026 e agora escolhem candidato e vetam.`,
    max: 1,
    step: 0.01,
  });

  const noiseSlider = renderControl({
    param: 'noise',
    label: 'Margem de erro',
    description: '<span id="noise-example"></span>',
    max: 0.1,
    step: 0.005,
  });

  return tacticalSlider + abstainersSlider + blankNullSlider + noiseSlider;
}

interface ControlConfig {
  param: ScalarParam;
  label: string;
  description: string;
  max: number;
  step: number;
}

function renderControl(config: ControlConfig): string {
  return `
    <label class="control">
      <span class="control-header"><b>${config.label}</b>${renderOutput(config.param)}</span>
      ${renderRange(config.param, null, config.max, config.step)}
      <small>${config.description}</small>
    </label>`;
}

function renderAdvancedFilters(): string {
  const vetoRows = getNonLeaderNumbers().map((candidateNumber) => renderCandidateSlider('vetoSplitByCandidate', candidateNumber));

  return `
    <details class="advanced-filters" ${hasAdvancedChanges() ? 'open' : ''}>
      <summary>Filtros avançados</summary>

      <section class="filter-group">
        <h4>Quem os eleitores de cada candidato vetam</h4>
        <small>Arraste para a esquerda para vetar Lula e para a direita para vetar Flávio.</small>
        ${vetoRows.join('')}
      </section>

      <section class="filter-group" id="${ABSTAINERS_GROUP.id}">
        <h4>${ABSTAINERS_GROUP.title}</h4>
        <small class="inactive-hint">Aumente "${ABSTAINERS_GROUP.countLabel}" para usar estes controles.</small>
        ${renderGroupSliders(ABSTAINERS_GROUP)}
      </section>

      <section class="filter-group" id="${BLANK_NULL_GROUP.id}">
        <h4>${BLANK_NULL_GROUP.title}</h4>
        <label class="switch">
          <input type="checkbox" id="blank-null-same-filters">
          <span class="switch-track" aria-hidden="true"></span>
          Usar os mesmos filtros dos ausentes
        </label>
        <small class="same-filters-hint">Usando a distribuição e o veto dos ausentes.</small>
        <div class="own-filters">${renderGroupSliders(BLANK_NULL_GROUP)}</div>
      </section>
    </details>`;
}

/** Pesos dos candidatos e do Nulo, botões de atalho e divisão do veto de um grupo. */
function renderGroupSliders(group: ReturningGroup): string {
  const weightKeys = [...CANDIDATES.map((candidate) => candidate.number), NULL_PREFERENCE_KEY];
  const weightRows = weightKeys.map((key) => renderCandidateSlider(group.weightsParam, key));

  return `
    <small>Os valores são pesos: a % ao lado é a parte de cada um no total.</small>
    <div class="filter-actions">
      <button type="button" data-weights="equal" data-target="${group.weightsParam}">Dividir igualmente</button>
      <button type="button" data-weights="author" data-target="${group.weightsParam}">Hipótese do autor</button>
    </div>
    ${weightRows.join('')}
    <div class="candidate-slider">
      <span class="candidate-slider-header"><b>${group.vetoLabel}</b>${renderOutput(group.vetoParam)}</span>
      ${renderRange(group.vetoParam, null, 1, 0.01)}
    </div>`;
}

function renderCandidateSlider(param: CandidateParam, key: string): string {
  const candidate = findCandidate(key);
  const name = candidate ? escapeHtml(candidate.shortName) : 'Nulo';
  const isWeight = WEIGHT_PARAMS.includes(param);

  return `
    <div class="candidate-slider">
      <span class="candidate-slider-header">
        ${renderAvatar(candidate ? key : null)}
        <b>${name}</b>
        ${renderOutput(param, key)}
      </span>
      ${renderRange(param, key, isWeight ? 100 : 1, isWeight ? 1 : 0.01)}
    </div>`;
}

function renderRange(param: SliderParam, key: string | null, max: number, step: number): string {
  const keyAttribute = key ? `data-candidate="${key}"` : '';
  const splitClass = SPLIT_PARAMS.includes(param) ? 'split-range' : '';

  return `<input type="range" class="${splitClass}" data-param="${param}" ${keyAttribute} min="0" max="${max}" step="${step}">`;
}

function renderOutput(param: SliderParam, key: string | null = null): string {
  const keyAttribute = key ? `data-candidate="${key}"` : '';

  return `<output data-output="${param}" ${keyAttribute}></output>`;
}

function renderUserVoteNote(): string {
  const userVote = appState.vote;

  if (!userVote) {
    return '';
  }

  return `<p class="note">Inclui seu voto: ${renderVoteName(userVote.preference)} / veto ${renderVoteName(userVote.veto)}</p>`;
}

/** Abre os filtros avançados quando o cenário salvo é diferente da hipótese do autor. */
function hasAdvancedChanges(): boolean {
  return !isAuthorScenario(appState.simulationParams);
}

// ---------- Eventos ----------

export function bindControls(params: SimulationParams) {
  const panel = appRoot.querySelector<HTMLElement>('.panel')!;

  panel.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement;
    const param = input.dataset.param as SliderParam | undefined;

    if (!param) {
      return;
    }

    writeParam(params, param, input.dataset.candidate ?? null, readRangeValue(input, param));
    refreshControls(params);
  });

  panel.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;

    if (input.id === 'blank-null-same-filters') {
      toggleSameFilters(params, input.checked);
    }
  });

  panel.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('button');

    if (button?.dataset.action) {
      replaceParams(params, button.dataset.action === 'clear' ? createNeutralParams() : createDefaultParams());
    }

    if (button?.dataset.weights) {
      resetWeights(params, button.dataset.target as WeightParam, button.dataset.weights);
    }
  });

  refreshControls(params);
}

/** Troca todos os valores, mantendo o mesmo objeto (a página guarda a referência). */
function replaceParams(params: SimulationParams, newParams: SimulationParams) {
  Object.assign(params, newParams, { seed: params.seed });
  refreshControls(params);
}

/** Ao desligar o switch, os brancos e nulos começam com uma cópia dos filtros dos ausentes. */
function toggleSameFilters(params: SimulationParams, usesAbstainerFilters: boolean) {
  params.blankNullUsesAbstainerFilters = usesAbstainerFilters;

  if (!usesAbstainerFilters) {
    params.blankNullPreferenceWeights = { ...params.abstainerPreferenceWeights };
    params.blankNullVetoSplit = params.abstainerVetoSplit;
  }

  refreshControls(params);
}

/** "Dividir igualmente" mantém o peso do Nulo; "Hipótese do autor" volta aos pesos do autor. */
function resetWeights(params: SimulationParams, weightsParam: WeightParam, mode: string) {
  const nullWeight = params[weightsParam][NULL_PREFERENCE_KEY] ?? 0;

  params[weightsParam] =
    mode === 'equal' ? createEqualWeights(nullWeight) : copyParams(AUTHOR_PARAMS)[weightsParam];

  refreshControls(params);
}

// ---------- Leitura e escrita dos parâmetros ----------

function isCandidateParam(param: SliderParam): param is CandidateParam {
  return param === 'vetoSplitByCandidate' || WEIGHT_PARAMS.includes(param);
}

function readParam(params: SimulationParams, param: SliderParam, key: string | null): number {
  if (isCandidateParam(param)) {
    return params[param][key ?? ''] ?? 0;
  }

  return params[param];
}

function writeParam(params: SimulationParams, param: SliderParam, key: string | null, value: number) {
  if (isCandidateParam(param)) {
    params[param][key ?? ''] = value;

    return;
  }

  params[param] = value;
}

/** O valor do controle de divisão é a parte de Flávio; o parâmetro guarda a parte de Lula. */
function readRangeValue(input: HTMLInputElement, param: SliderParam): number {
  const value = Number(input.value);

  return SPLIT_PARAMS.includes(param) ? 1 - value : value;
}

function toRangeValue(param: SliderParam, value: number): number {
  return SPLIT_PARAMS.includes(param) ? 1 - value : value;
}

// ---------- Atualização da tela ----------

/** Sincroniza todos os controles e textos com os parâmetros atuais. */
function refreshControls(params: SimulationParams) {
  const normalizedWeights: Record<WeightParam, Record<string, number>> = {
    abstainerPreferenceWeights: normalizeWeights(params.abstainerPreferenceWeights),
    blankNullPreferenceWeights: normalizeWeights(params.blankNullPreferenceWeights),
  };

  appRoot.querySelectorAll<HTMLInputElement>('input[data-param]').forEach((input) => {
    const param = input.dataset.param as SliderParam;
    const value = readParam(params, param, input.dataset.candidate ?? null);

    input.value = String(toRangeValue(param, value));
  });

  appRoot.querySelectorAll<HTMLOutputElement>('output[data-output]').forEach((output) => {
    const param = output.dataset.output as SliderParam;
    const key = output.dataset.candidate ?? null;

    output.textContent = formatOutput(params, param, key, normalizedWeights);
  });

  updateNoiseExample(params.noise);
  updateReturningGroups(params);
}

function formatOutput(
  params: SimulationParams,
  param: SliderParam,
  key: string | null,
  normalizedWeights: Record<WeightParam, Record<string, number>>,
): string {
  const value = readParam(params, param, key);

  if (SPLIT_PARAMS.includes(param)) {
    return `Lula ${formatPercent(value * 100, 0)} · ${formatPercent((1 - value) * 100, 0)} Flávio`;
  }

  if (param === 'abstainerPreferenceWeights' || param === 'blankNullPreferenceWeights') {
    return formatPercent(normalizedWeights[param][key ?? ''] * 100, 0);
  }

  if (param === 'returningAbstainers') {
    return `${formatPercent(value * 100, 0)} (${formatCompact(GENERAL_DATA_2026.abstentions * value)})`;
  }

  if (param === 'returningBlankNull') {
    return `${formatPercent(value * 100, 0)} (${formatCompact(BLANK_NULL_VOTERS * value)})`;
  }

  if (param === 'noise') {
    return `±${formatPercent(value * 100, 1)}`;
  }

  return formatPercent(value * 100, 0);
}

/** Exemplo concreto da margem de erro, usando o 3º colocado. */
function updateNoiseExample(noise: number) {
  const example = appRoot.querySelector('#noise-example');

  if (!example) {
    return;
  }

  if (noise === 0) {
    example.textContent = 'Sem margem: as preferências são exatamente as do 1º turno de 2026.';

    return;
  }

  const candidate = findCandidate(NOISE_EXAMPLE_NUMBER);
  const preferences = PREFERENCES_2026[NOISE_EXAMPLE_NUMBER];
  const lowest = formatCompact(preferences * (1 - noise));
  const highest = formatCompact(preferences * (1 + noise));
  const percent = formatPercent(noise * 100, 1);

  example.textContent =
    `Cada candidato pode ter até ${percent} a mais ou a menos de preferências, sorteado a cada apuração. ` +
    `Ex.: ${candidate?.shortName} (${formatCompact(preferences)}) fica entre ${lowest} e ${highest}.`;
}

/**
 * Ausentes em 0%: o grupo fica apagado. Brancos e nulos em 0%: o grupo some.
 * Com o switch ligado, os controles próprios dos brancos e nulos ficam escondidos.
 */
function updateReturningGroups(params: SimulationParams) {
  appRoot.querySelector(`#${ABSTAINERS_GROUP.id}`)?.classList.toggle('inactive', params.returningAbstainers === 0);

  const blankNullGroup = appRoot.querySelector<HTMLElement>(`#${BLANK_NULL_GROUP.id}`);

  if (!blankNullGroup) {
    return;
  }

  blankNullGroup.hidden = params.returningBlankNull === 0;
  blankNullGroup.classList.toggle('same-filters', params.blankNullUsesAbstainerFilters);
  blankNullGroup.querySelector<HTMLInputElement>('#blank-null-same-filters')!.checked = params.blankNullUsesAbstainerFilters;
}
