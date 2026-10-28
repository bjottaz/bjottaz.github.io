import type { Tally, Vote } from './election/ranking';
import { simulateRounds, type RoundNumber, type RoundResult, type WeightsByRound } from './election/runoff';
import { createDefaultParams, simulateElection, type SimulationParams } from './election/simulation';
import { readFromStorage, saveToStorage } from './utils/storage';

const STORAGE_KEYS = {
  vote: 'vote',
  // "v3": nova hipótese do autor e o grupo de brancos e nulos, então os formatos antigos são ignorados.
  simulationParams: 'simulationParams.v3',
  roundWeights: 'roundWeights.v1',
  lastSimulatedRound: 'lastSimulatedRound.v1',
};

export const appState = {
  vote: readFromStorage<Vote>(STORAGE_KEYS.vote),
  simulationParams: readSimulationParams(),
  tally: null as Tally | null,
  /** Pesos de transferência escolhidos para o 2º turno. */
  roundWeights: readFromStorage<WeightsByRound>(STORAGE_KEYS.roundWeights) ?? {},
  /** Último turno que o usuário apurou (1 = só o 1º turno). */
  lastSimulatedRound: readFromStorage<RoundNumber>(STORAGE_KEYS.lastSimulatedRound) ?? 1,
  rounds: null as RoundResult[] | null,
};

/** Parâmetros salvos, completados com o padrão caso falte algum campo. */
function readSimulationParams(): SimulationParams {
  const defaults = createDefaultParams();
  const stored = readFromStorage<Partial<SimulationParams>>(STORAGE_KEYS.simulationParams);

  if (!stored) {
    return defaults;
  }

  return {
    ...defaults,
    ...stored,
    vetoSplitByCandidate: { ...defaults.vetoSplitByCandidate, ...stored.vetoSplitByCandidate },
    abstainerPreferenceWeights: { ...defaults.abstainerPreferenceWeights, ...stored.abstainerPreferenceWeights },
    blankNullPreferenceWeights: { ...defaults.blankNullPreferenceWeights, ...stored.blankNullPreferenceWeights },
  };
}

/** Apuração atual, simulada só quando for necessária. */
export function getCurrentTally(): Tally {
  appState.tally ??= simulateElection(appState.simulationParams, appState.vote);

  return appState.tally;
}

/** 2º turno, se já apurado, calculado só quando for necessário. */
export function getRounds(): RoundResult[] {
  appState.rounds ??= simulateRounds(getCurrentTally(), appState.roundWeights, appState.lastSimulatedRound);

  return appState.rounds;
}

export function saveVote(vote: Vote) {
  appState.vote = vote;
  appState.tally = null;
  appState.rounds = null;
  saveToStorage(STORAGE_KEYS.vote, vote);
}

/** Nova apuração do 1º turno: os turnos seguintes precisam ser apurados de novo. */
export function setFirstRoundTally(tally: Tally) {
  appState.tally = tally;
  setLastSimulatedRound(1);
}

export function saveRoundWeights() {
  appState.rounds = null;
  saveToStorage(STORAGE_KEYS.roundWeights, appState.roundWeights);
}

export function setLastSimulatedRound(round: RoundNumber) {
  appState.lastSimulatedRound = round;
  appState.rounds = null;
  saveToStorage(STORAGE_KEYS.lastSimulatedRound, round);
  saveToStorage(STORAGE_KEYS.roundWeights, appState.roundWeights);
}

export function saveSimulationParams() {
  saveToStorage(STORAGE_KEYS.simulationParams, appState.simulationParams);
}
