// Regras da eleição eliminatória, mostradas na página inicial e no topo da simulação.
import { QUALIFIED_COUNT } from '../election/ranking';

const RULE_STEPS = [
  'Cada eleitor dá <b>1 preferência</b> (quem quer) e <b>1 veto</b> (quem não quer). O mesmo candidato não pode estar nos dois.',
  '<b>Pontuação = preferências − vetos.</b>',
  'Quem tiver <b>mais da metade das preferências válidas</b> e pontuação positiva <b>vence já no 1º turno</b>.',
  `Se ninguém vencer, os <b>2 piores</b> em pontuação são <b>vetados</b>, os <b>${QUALIFIED_COUNT} melhores</b> vão ao <b>2º turno</b> e os demais ficam como <b>não eleitos</b>. Empate: passa quem tiver mais preferências.`,
  '<b>2º turno:</b> duelo só de preferência, sem veto. Vence o mais votado.',
];

const NULL_NOTE = 'O botão <b>Nulo</b> substitui o Branco. Número inexistente também vira Nulo.';

/** Com `collapsible`, as regras ficam num bloco que abre e fecha (usado no topo da simulação). */
export function renderRules({ collapsible = false } = {}): string {
  const title = 'Como funciona o 1º turno eliminatório';
  const steps = RULE_STEPS.map((step) => `<li>${step}</li>`).join('');

  const body = `
    <ol class="rule-steps">${steps}</ol>
    <p class="rule-note">${NULL_NOTE}</p>`;

  if (collapsible) {
    return `
      <details class="rules collapsible" open>
        <summary><h3>${title}</h3></summary>
        ${body}
      </details>`;
  }

  return `
    <section class="rules">
      <h3>${title}</h3>
      ${body}
    </section>`;
}
