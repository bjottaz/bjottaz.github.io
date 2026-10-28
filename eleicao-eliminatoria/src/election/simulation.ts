import { CANDIDATES } from './candidates';
import { GENERAL_DATA_2026, PREFERENCES_2026 } from './official-results-2026';
import type { Tally, Vote } from './ranking';

export interface SimulationParams {
  /** Fração dos eleitores de cada líder que veta o 3º colocado em vez do rival (voto tático). */
  tacticalVoting: number;
  /** Para os eleitores de cada candidato (fora os líderes): fração que veta Lula. O resto veta Flávio. */
  vetoSplitByCandidate: Record<string, number>;
  /** Fração dos ausentes de 2026 que passa a votar, atraída pelo veto. */
  returningAbstainers: number;
  /** Peso de cada candidato e do Nulo na preferência dos ausentes que voltam. Os pesos são normalizados. */
  abstainerPreferenceWeights: Record<string, number>;
  /** Fração dos ausentes que voltam e vetam Lula. O resto veta Flávio. */
  abstainerVetoSplit: number;
  /** Fração de quem votou branco ou nulo em 2026 e passa a escolher candidato e vetar. */
  returningBlankNull: number;
  /** Brancos e nulos usam a mesma distribuição e o mesmo veto dos ausentes. */
  blankNullUsesAbstainerFilters: boolean;
  /** Pesos próprios dos brancos e nulos (usados com o switch desligado). */
  blankNullPreferenceWeights: Record<string, number>;
  /** Fração dos brancos e nulos que passam a votar e vetam Lula (usado com o switch desligado). */
  blankNullVetoSplit: number;
  /** Margem de erro: cada candidato pode ter até essa fração a mais ou a menos de preferências (0 a 0,1). */
  noise: number;
  seed: number;
}

export const FLAVIO_NUMBER = '22';
export const LULA_NUMBER = '13';

/** Chave do Nulo nos pesos de preferência (ao lado dos números dos candidatos). */
export const NULL_PREFERENCE_KEY = 'nulo';

const NEUTRAL_VETO_SPLIT = 0.5;

/** Hipótese do autor: para os eleitores de cada candidato, a fração que veta Lula. */
const AUTHOR_VETO_SPLIT: Record<string, number> = {
  '70': 0.8, // Augusto Cury
  '14': 0.4, // Renan Santos
  '55': 1, // Ronaldo Caiado
  '30': 1, // Zema
  '80': 0, // Samara
  '16': 0, // Hertz Dias
  '27': 0, // Clariana Barão
  '21': 0, // Edmilson Costa
  '35': 0, // Wilson Grassi
  '29': 0, // Rui Costa Pimenta
};

/** Hipótese do autor: pesos da preferência dos ausentes (somam 100, então cada peso é a própria %). */
const AUTHOR_ABSTAINER_WEIGHTS: Record<string, number> = {
  '22': 0, // Flávio Bolsonaro
  '13': 0, // Lula
  '70': 23, // Augusto Cury
  '14': 20, // Renan Santos
  '55': 20, // Ronaldo Caiado
  '30': 7, // Zema
  '80': 4, // Samara
  '16': 3, // Hertz Dias
  '27': 3, // Clariana Barão
  '21': 2, // Edmilson Costa
  '35': 2, // Wilson Grassi
  '29': 2, // Rui Costa Pimenta
  [NULL_PREFERENCE_KEY]: 14,
};

/** A hipótese de quem fez o simulador. */
export const AUTHOR_PARAMS: SimulationParams = {
  tacticalVoting: 0.01,
  vetoSplitByCandidate: AUTHOR_VETO_SPLIT,
  returningAbstainers: 0.05,
  abstainerPreferenceWeights: AUTHOR_ABSTAINER_WEIGHTS,
  abstainerVetoSplit: 0.6,
  returningBlankNull: 0.6,
  blankNullUsesAbstainerFilters: true,
  blankNullPreferenceWeights: AUTHOR_ABSTAINER_WEIGHTS,
  blankNullVetoSplit: 0.6,
  noise: 0,
  seed: 1,
};

/** Cópia independente da hipótese do autor (os objetos internos não são compartilhados). */
export function createDefaultParams(): SimulationParams {
  return copyParams(AUTHOR_PARAMS);
}

/** "Limpar filtros": só o 1º turno de 2026, sem ninguém voltando e com os vetos divididos meio a meio. */
export function createNeutralParams(): SimulationParams {
  const neutralWeights = createEqualWeights(0);

  return {
    tacticalVoting: 0,
    vetoSplitByCandidate: createUniformRecord(getNonLeaderNumbers(), NEUTRAL_VETO_SPLIT),
    returningAbstainers: 0,
    abstainerPreferenceWeights: neutralWeights,
    abstainerVetoSplit: NEUTRAL_VETO_SPLIT,
    returningBlankNull: 0,
    blankNullUsesAbstainerFilters: true,
    blankNullPreferenceWeights: { ...neutralWeights },
    blankNullVetoSplit: NEUTRAL_VETO_SPLIT,
    noise: 0,
    seed: 1,
  };
}

export function copyParams(params: SimulationParams): SimulationParams {
  return {
    ...params,
    vetoSplitByCandidate: { ...params.vetoSplitByCandidate },
    abstainerPreferenceWeights: { ...params.abstainerPreferenceWeights },
    blankNullPreferenceWeights: { ...params.blankNullPreferenceWeights },
  };
}

/** Pesos iguais para os 12 candidatos, com o Nulo no valor indicado. */
export function createEqualWeights(nullWeight: number): Record<string, number> {
  const candidateNumbers = CANDIDATES.map((candidate) => candidate.number);
  const candidateWeight = (100 - nullWeight) / candidateNumbers.length;

  return { ...createUniformRecord(candidateNumbers, candidateWeight), [NULL_PREFERENCE_KEY]: nullWeight };
}

/** Transforma pesos em frações que somam 1. Se todos forem 0, divide igualmente. */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const keys = Object.keys(weights);
  const totalWeight = keys.reduce((total, key) => total + weights[key], 0);

  if (totalWeight <= 0) {
    return createUniformRecord(keys, 1 / keys.length);
  }

  const normalized: Record<string, number> = {};

  for (const key of keys) {
    normalized[key] = weights[key] / totalWeight;
  }

  return normalized;
}

export function createUniformRecord(keys: string[], value: number): Record<string, number> {
  const record: Record<string, number> = {};

  for (const key of keys) {
    record[key] = value;
  }

  return record;
}

type VotesByCandidate = Record<string, number>;

/** Monta uma apuração com as preferências reais de 2026 e vetos hipotéticos. */
export function simulateElection(params: SimulationParams, userVote: Vote | null): Tally {
  const nullBallots = GENERAL_DATA_2026.blankVotes + GENERAL_DATA_2026.nullVotes;

  const tally: Tally = {
    scenario: isAuthorScenario(params) ? 'Hipótese do autor (vetos hipotéticos)' : 'Eleitorado simulado',
    preferences: createNoisyPreferences(params),
    vetoes: createEmptyCount(),
    nullPreferences: nullBallots,
    // Quem anulou a preferência também não veta.
    nullVetoes: nullBallots,
    turnout: GENERAL_DATA_2026.turnout,
    electorate: GENERAL_DATA_2026.electorate,
    userVote,
  };

  distributeVetoes(tally, params);
  addReturningAbstainers(tally, params);
  addReturningBlankNull(tally, params);
  addUserVote(tally, userVote);

  return tally;
}

export function isAuthorScenario(params: SimulationParams): boolean {
  const scalarsEqual =
    params.tacticalVoting === AUTHOR_PARAMS.tacticalVoting &&
    params.returningAbstainers === AUTHOR_PARAMS.returningAbstainers &&
    params.abstainerVetoSplit === AUTHOR_PARAMS.abstainerVetoSplit &&
    params.returningBlankNull === AUTHOR_PARAMS.returningBlankNull &&
    params.blankNullUsesAbstainerFilters === AUTHOR_PARAMS.blankNullUsesAbstainerFilters &&
    params.noise === AUTHOR_PARAMS.noise;

  return (
    scalarsEqual &&
    recordsEqual(params.vetoSplitByCandidate, AUTHOR_PARAMS.vetoSplitByCandidate) &&
    recordsEqual(params.abstainerPreferenceWeights, AUTHOR_PARAMS.abstainerPreferenceWeights)
  );
}

function recordsEqual(first: Record<string, number>, second: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(first), ...Object.keys(second)]);

  return [...keys].every((key) => first[key] === second[key]);
}

export function isLeader(candidateNumber: string): boolean {
  return candidateNumber === FLAVIO_NUMBER || candidateNumber === LULA_NUMBER;
}

export function getNonLeaderNumbers(): string[] {
  return CANDIDATES.map((candidate) => candidate.number).filter((candidateNumber) => !isLeader(candidateNumber));
}

function createEmptyCount(): VotesByCandidate {
  const count: VotesByCandidate = {};

  for (const candidate of CANDIDATES) {
    count[candidate.number] = 0;
  }

  return count;
}

function createNoisyPreferences(params: SimulationParams): VotesByCandidate {
  const random = createRandomGenerator(params.seed);
  const preferences: VotesByCandidate = {};

  for (const candidate of CANDIDATES) {
    const variation = 1 + params.noise * (random() * 2 - 1);

    preferences[candidate.number] = Math.round(PREFERENCES_2026[candidate.number] * variation);
  }

  return preferences;
}

/** Eleitores dos líderes vetam o rival (ou o 3º colocado, no voto tático); os demais se dividem entre os líderes. */
function distributeVetoes(tally: Tally, params: SimulationParams) {
  const { preferences, vetoes } = tally;
  const flavioVoters = preferences[FLAVIO_NUMBER];
  const lulaVoters = preferences[LULA_NUMBER];
  const loyalShare = 1 - params.tacticalVoting;

  vetoes[LULA_NUMBER] += Math.round(flavioVoters * loyalShare);
  vetoes[FLAVIO_NUMBER] += Math.round(lulaVoters * loyalShare);

  const tacticalTarget = findTacticalTarget(preferences);

  vetoes[tacticalTarget] += Math.round((flavioVoters + lulaVoters) * params.tacticalVoting);

  distributeOtherVotersVetoes(tally, params.vetoSplitByCandidate);
}

/**
 * Eleitores dos demais candidatos vetam Lula ou Flávio, conforme a divisão escolhida para cada candidato.
 * Soma tudo antes de arredondar, para não acumular erro de arredondamento.
 */
function distributeOtherVotersVetoes(tally: Tally, vetoSplitByCandidate: Record<string, number>) {
  let lulaVetoes = 0;
  let flavioVetoes = 0;

  for (const candidateNumber of getNonLeaderNumbers()) {
    const voters = tally.preferences[candidateNumber];
    const lulaShare = vetoSplitByCandidate[candidateNumber] ?? NEUTRAL_VETO_SPLIT;

    lulaVetoes += voters * lulaShare;
    flavioVetoes += voters * (1 - lulaShare);
  }

  tally.vetoes[LULA_NUMBER] += Math.round(lulaVetoes);
  tally.vetoes[FLAVIO_NUMBER] += Math.round(flavioVetoes);
}

/** O mais votado fora os dois líderes. */
function findTacticalTarget(preferences: VotesByCandidate): string {
  const sortedByPreferences = getNonLeaderNumbers().sort(
    (firstNumber, secondNumber) => preferences[secondNumber] - preferences[firstNumber],
  );

  return sortedByPreferences[0];
}

function splitVetoesBetweenLeaders(vetoes: VotesByCandidate, voters: number, lulaShare: number) {
  vetoes[LULA_NUMBER] += Math.round(voters * lulaShare);
  vetoes[FLAVIO_NUMBER] += Math.round(voters * (1 - lulaShare));
}

/** Ausentes que voltam: entram no comparecimento, escolhem preferência pelos pesos e vetam um dos líderes. */
function addReturningAbstainers(tally: Tally, params: SimulationParams) {
  const newVoters = Math.round(GENERAL_DATA_2026.abstentions * params.returningAbstainers);

  if (newVoters <= 0) {
    return;
  }

  tally.turnout += newVoters;
  addReturningVoters(tally, newVoters, params.abstainerPreferenceWeights, params.abstainerVetoSplit);
}

/** Brancos e nulos que passam a votar: já estavam no comparecimento, só deixam de anular. */
function addReturningBlankNull(tally: Tally, params: SimulationParams) {
  const blankNullVoters = GENERAL_DATA_2026.blankVotes + GENERAL_DATA_2026.nullVotes;
  const returningVoters = Math.round(blankNullVoters * params.returningBlankNull);

  if (returningVoters <= 0) {
    return;
  }

  tally.nullPreferences -= returningVoters;
  tally.nullVetoes -= returningVoters;

  const usesAbstainerFilters = params.blankNullUsesAbstainerFilters;
  const weights = usesAbstainerFilters ? params.abstainerPreferenceWeights : params.blankNullPreferenceWeights;
  const vetoSplit = usesAbstainerFilters ? params.abstainerVetoSplit : params.blankNullVetoSplit;

  addReturningVoters(tally, returningVoters, weights, vetoSplit);
}

/** Distribui a preferência pelos pesos (a parte do Nulo vira preferência nula) e divide o veto entre os líderes. */
function addReturningVoters(tally: Tally, voters: number, weights: Record<string, number>, lulaVetoShare: number) {
  const shares = normalizeWeights(weights);

  for (const [key, share] of Object.entries(shares)) {
    const votes = Math.round(voters * share);

    if (key === NULL_PREFERENCE_KEY) {
      tally.nullPreferences += votes;
    } else {
      tally.preferences[key] += votes;
    }
  }

  splitVetoesBetweenLeaders(tally.vetoes, voters, lulaVetoShare);
}

function addUserVote(tally: Tally, userVote: Vote | null) {
  if (!userVote) {
    return;
  }

  tally.turnout += 1;

  if (userVote.preference) {
    tally.preferences[userVote.preference] += 1;
  } else {
    tally.nullPreferences += 1;
  }

  if (userVote.veto) {
    tally.vetoes[userVote.veto] += 1;
  } else {
    tally.nullVetoes += 1;
  }
}

/** Gerador pseudoaleatório com semente (mulberry32): mesma semente, mesma simulação. */
function createRandomGenerator(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let mixed = state;

    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
