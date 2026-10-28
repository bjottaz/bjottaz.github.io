// 2º turno: duelo entre os 2 melhores do 1º turno, só com preferência. Quem segue mantém o voto;
// os eleitores de quem saiu (e os que anularam) são redistribuídos pelos pesos escolhidos pelo usuário.
import { getFirstRoundWinner, rankCandidates, type Tally } from './ranking';
import { normalizeWeights, NULL_PREFERENCE_KEY } from './simulation';

export type RoundNumber = 1 | 2;
export type RunoffRoundNumber = 2;

/** Para cada grupo de origem (candidato que saiu ou "nulo"): peso de cada destino (candidato na disputa ou "nulo"). */
export type TransferWeights = Record<string, Record<string, number>>;
export type WeightsByRound = Partial<Record<RunoffRoundNumber, TransferWeights>>;

/** Grupo de eleitores que precisa escolher de novo. A ordem importa (os números dos candidatos não servem de chave ordenada). */
export interface TransferSource {
  key: string;
  votes: number;
  /** Candidatos somados no grupo dos não eleitos (vazio nos outros grupos). */
  members: string[];
}

/** Os eleitores dos "não eleitos" ficam num grupo só, para não ser cansativo definir os pesos. */
export const NOT_ELECTED_SOURCE_KEY = 'nao-eleitos';

/** O que é preciso saber antes de simular um turno. */
export interface RoundSetup {
  round: RunoffRoundNumber;
  /** Candidatos na disputa, do mais votado para o menos votado no turno anterior. */
  continuing: string[];
  sources: TransferSource[];
  /** Votos do turno anterior, que quem segue mantém. */
  previousPreferences: Record<string, number>;
  /** Preferências do 1º turno, usadas para desempatar. */
  firstRoundPreferences: Record<string, number>;
  turnout: number;
}

export interface RoundResult {
  round: RunoffRoundNumber;
  /** Candidatos na disputa, do mais votado para o menos votado. */
  candidates: string[];
  preferences: Record<string, number>;
  nullPreferences: number;
  turnout: number;
  sources: TransferSource[];
  /** Votos que foram de cada grupo de origem para cada destino. */
  transfers: Record<string, Record<string, number>>;
  /** Quanto cada candidato manteve do turno anterior. */
  keptVotes: Record<string, number>;
  /** Com 2 na disputa, o mais votado sempre tem a maioria dos válidos. */
  winner: string;
}

const ALL_NULL_WEIGHT = 100;

/** 2º turno: seguem os 2 melhores. Saem os vetados (um grupo cada), os não eleitos (um grupo só) e quem anulou. */
export function getSecondRoundSetup(tally: Tally): RoundSetup {
  const rows = [...rankCandidates(tally)].sort((first, second) => second.preferences - first.preferences);
  const continuing = rows.filter((row) => row.qualified).map((row) => row.candidate.number);
  const vetoed = rows.filter((row) => row.eliminated).map((row) => row.candidate.number);
  const notElected = rows.filter((row) => !row.qualified && !row.eliminated).map((row) => row.candidate.number);

  return {
    round: 2,
    continuing,
    sources: [
      ...vetoed.map((candidateNumber) => createCandidateSource(candidateNumber, tally.preferences)),
      ...createNotElectedSource(notElected, tally.preferences),
      createNullSource(tally.nullPreferences),
    ],
    previousPreferences: tally.preferences,
    firstRoundPreferences: tally.preferences,
    turnout: tally.turnout,
  };
}

function createCandidateSource(candidateNumber: string, preferences: Record<string, number>): TransferSource {
  return { key: candidateNumber, votes: preferences[candidateNumber], members: [] };
}

/** Grupo único com a soma dos eleitores dos não eleitos. Sem não eleitos, não há grupo. */
function createNotElectedSource(members: string[], preferences: Record<string, number>): TransferSource[] {
  if (members.length === 0) {
    return [];
  }

  const votes = members.reduce((total, candidateNumber) => total + preferences[candidateNumber], 0);

  return [{ key: NOT_ELECTED_SOURCE_KEY, votes, members }];
}

function createNullSource(nullPreferences: number): TransferSource {
  return { key: NULL_PREFERENCE_KEY, votes: nullPreferences, members: [] };
}

/** Pesos padrão: eleitores de um candidato se dividem igualmente; quem anulou continua anulando. */
export function createDefaultSourceWeights(sourceKey: string, continuing: string[]): Record<string, number> {
  if (sourceKey === NULL_PREFERENCE_KEY) {
    return createSourceWeights(continuing, 0, ALL_NULL_WEIGHT);
  }

  return createSourceWeights(continuing, ALL_NULL_WEIGHT / continuing.length, 0);
}

/** Pesos iguais entre os candidatos na disputa, mantendo o peso do Nulo. */
export function createEqualSourceWeights(continuing: string[], nullWeight: number): Record<string, number> {
  return createSourceWeights(continuing, (ALL_NULL_WEIGHT - nullWeight) / continuing.length, nullWeight);
}

function createSourceWeights(continuing: string[], candidateWeight: number, nullWeight: number): Record<string, number> {
  const weights: Record<string, number> = {};

  for (const candidateNumber of continuing) {
    weights[candidateNumber] = candidateWeight;
  }

  weights[NULL_PREFERENCE_KEY] = nullWeight;

  return weights;
}

/** Completa os pesos salvos com os padrões e descarta destinos que não estão mais na disputa. */
export function resolveTransferWeights(setup: RoundSetup, savedWeights: TransferWeights = {}): TransferWeights {
  const resolved: TransferWeights = {};
  const targets = [...setup.continuing, NULL_PREFERENCE_KEY];

  for (const source of setup.sources) {
    const defaults = createDefaultSourceWeights(source.key, setup.continuing);
    const saved = savedWeights[source.key] ?? {};

    resolved[source.key] = {};

    for (const target of targets) {
      resolved[source.key][target] = saved[target] ?? defaults[target];
    }
  }

  return resolved;
}

export function simulateRound(setup: RoundSetup, weights: TransferWeights): RoundResult {
  const preferences: Record<string, number> = {};
  const keptVotes: Record<string, number> = {};
  const transfers: Record<string, Record<string, number>> = {};
  let nullPreferences = 0;

  for (const candidateNumber of setup.continuing) {
    keptVotes[candidateNumber] = setup.previousPreferences[candidateNumber] ?? 0;
    preferences[candidateNumber] = keptVotes[candidateNumber];
  }

  for (const source of setup.sources) {
    const shares = normalizeWeights(weights[source.key] ?? createDefaultSourceWeights(source.key, setup.continuing));

    transfers[source.key] = {};

    for (const [target, share] of Object.entries(shares)) {
      const votes = Math.round(source.votes * share);

      transfers[source.key][target] = votes;

      if (target === NULL_PREFERENCE_KEY) {
        nullPreferences += votes;
      } else {
        preferences[target] += votes;
      }
    }
  }

  // Vence o mais votado (empate: quem teve mais preferências no 1º turno).
  const candidates = sortByVotes(setup.continuing, preferences, setup.firstRoundPreferences);

  return {
    round: setup.round,
    candidates,
    preferences,
    nullPreferences,
    turnout: setup.turnout,
    sources: setup.sources,
    transfers,
    keptVotes,
    winner: candidates[0],
  };
}

/** Mais votos primeiro. Empate: passa quem teve mais preferências no 1º turno. */
function sortByVotes(
  candidateNumbers: string[],
  preferences: Record<string, number>,
  firstRoundPreferences: Record<string, number>,
): string[] {
  return [...candidateNumbers].sort((first, second) => {
    const votesDifference = preferences[second] - preferences[first];

    if (votesDifference !== 0) {
      return votesDifference;
    }

    return (firstRoundPreferences[second] ?? 0) - (firstRoundPreferences[first] ?? 0);
  });
}

/** Há 2º turno só se ninguém venceu no 1º turno. */
export function hasSecondRound(tally: Tally): boolean {
  return !getFirstRoundWinner(rankCandidates(tally));
}

/** Resultado do 2º turno, se ele já foi apurado (`lastRound` = 2) e se existe. */
export function simulateRounds(tally: Tally, weightsByRound: WeightsByRound, lastRound: RoundNumber): RoundResult[] {
  if (lastRound < 2 || !hasSecondRound(tally)) {
    return [];
  }

  const setup = getSecondRoundSetup(tally);

  return [simulateRound(setup, resolveTransferWeights(setup, weightsByRound[2]))];
}
