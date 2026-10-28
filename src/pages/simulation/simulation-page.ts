import { renderLayout } from '../../components/layout';
import { renderRules } from '../../components/rules';
import {
  getSecondRoundSetup,
  hasSecondRound,
  resolveTransferWeights,
  simulateRound,
  type RoundNumber,
  type RoundSetup,
} from '../../election/runoff';
import { appState, getCurrentTally, saveRoundWeights, setLastSimulatedRound } from '../../state';
import { appRoot, queryElement } from '../../utils/dom';
import { renderEmptyRoundScoreboard, renderEmptyScoreboard, renderLiveCount, startCount, startRoundCount } from './live-count';
import { bindRoundControls, renderRoundPanel } from './round-controls';
import { bindControls, renderControlPanel } from './simulation-controls';

export function renderSimulationPage(round: RoundNumber) {
  // Com vencedor no 1º turno não há 2º turno para simular.
  if (round === 1 || !hasSecondRound(getCurrentTally())) {
    renderFirstRound();

    return;
  }

  renderRunoffRound(getSecondRoundSetup(getCurrentTally()));
}

function renderFirstRound() {
  const params = appState.simulationParams;

  const content = `
    <div class="page simulation-layout">
      ${renderRules({ collapsible: true })}
      ${renderControlPanel()}
      ${renderLiveCount('Apuração · Pontuação')}
    </div>`;

  appRoot.innerHTML = renderLayout(content);

  bindControls(params);
  renderEmptyScoreboard(params);

  queryElement('#start-count').addEventListener('click', () => startCount(params));
}

function renderRunoffRound(setup: RoundSetup) {
  const weights = resolveTransferWeights(setup, appState.roundWeights[setup.round]);

  appState.roundWeights[setup.round] = weights;

  const content = `
    <div class="page simulation-layout">
      ${renderRoundPanel(setup)}
      ${renderLiveCount(`Apuração · ${setup.round}º turno`)}
    </div>`;

  appRoot.innerHTML = renderLayout(content);

  bindRoundControls(setup, weights, () => {
    // Mudou os pesos de um turno já apurado: ele (e os seguintes) precisam ser apurados de novo.
    if (appState.lastSimulatedRound >= setup.round) {
      setLastSimulatedRound((setup.round - 1) as RoundNumber);
    }

    saveRoundWeights();
  });

  // Antes da apuração, todos zerados na ordem do turno anterior (sem revelar o resultado).
  renderEmptyRoundScoreboard({ ...simulateRound(setup, weights), candidates: setup.continuing });

  queryElement('#start-count').addEventListener('click', () => {
    setLastSimulatedRound(setup.round);
    startRoundCount(simulateRound(setup, weights));
  });
}
