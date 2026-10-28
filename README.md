# Eleição Eliminatória · Simulador

Simulador de um 1º turno **eliminatório** para presidente, usando as preferências reais do 1º turno de 2026 (TSE). O eleitor vota numa urna 3D e vê quem seria eliminado.

## O cálculo

Cada eleitor dá **1 preferência** (quem quer) e **1 veto** (quem não quer). O mesmo candidato não pode receber os dois.

```
Pontuação = Preferências − Vetos
```

- Quem tiver **mais da metade das preferências válidas** (sem contar nulos) e **pontuação positiva** vence já no 1º turno. Como o 2º turno é um duelo só de preferência, essa pessoa venceria qualquer 2º turno; o veto só decide quando ninguém tem maioria.
- Se ninguém vencer, os **2 candidatos com a menor pontuação** são **vetados** (com 4 ou mais candidatos).
- Dos demais, **só os 2 melhores** passam ao 2º turno; os outros ficam como **não eleitos**.
- Empate na pontuação: passa quem tiver mais preferências.
- **Nulo** substitui o Branco; número inexistente também conta como Nulo.

Regra em [src/election/ranking.ts](src/election/ranking.ts).

## A simulação

As preferências são as reais. Como os vetos não existem na eleição real, eles são estimados ([src/election/simulation.ts](src/election/simulation.ts)):

Eleitores de Lula vetam Flávio e vice-versa. O resto é configurável no painel "Cenário":

| Parâmetro | O que faz |
| --- | --- |
| Voto tático | Parte dos eleitores dos líderes veta o 3º colocado em vez do rival. |
| Ausentes que passam a votar | Parte dos ausentes de 2026 que vai votar por causa do veto. |
| Brancos e nulos que passam a votar | Parte de quem votou branco ou nulo em 2026 que agora escolhe candidato e veta. |
| Margem de erro | Cada candidato pode ter até ±X% de preferências, sorteado a cada apuração. |

**Filtros avançados:**

- **Quem os eleitores de cada candidato vetam:** para os eleitores de cada candidato (fora Lula e Flávio), quanto do veto vai para Lula e quanto para Flávio.
- **Em quem os ausentes votam:** pesos de cada candidato e do Nulo; a % mostrada é a parte de cada um no total. Todos que voltam vetam, conforme o **Veto dos ausentes**.
- **Em quem os brancos e nulos votam:** por padrão usa os mesmos filtros dos ausentes (switch); desligando, ganha pesos e veto próprios.

**Botões:** **Hipótese do autor** carrega o cenário do autor (voto tático 1%, ausentes 5%, brancos e nulos 60% e os filtros definidos em `AUTHOR_PARAMS`). **Limpar filtros** volta ao 1º turno de 2026 puro, com os vetos dos demais candidatos divididos 50/50.

O voto do usuário é somado à apuração.

## 2º turno

Só acontece se ninguém venceu no 1º turno. Nele só há preferência (sem veto). Quem segue na disputa mantém os votos; o usuário escolhe, por pesos, em quem votam os eleitores de cada vetado, dos não eleitos (num grupo só) e os que anularam (incluindo a opção Nulo).

- É um duelo entre os 2 melhores do 1º turno, como no sistema atual: vence o mais votado.
- Empate: vence quem teve mais preferências no 1º turno.

Regras em [src/election/runoff.ts](src/election/runoff.ts). Nos resultados, o seletor "Turno" mostra o 2º turno depois de apurado.

## Como rodar

```bash
npm install
npm run dev     # desenvolvimento
npm run build   # checa tipos e gera dist/
```

## Estrutura

```
src/
  election/        regras, dados de 2026 e simulação
  pages/           telas (início, urna, voto computado, simulação, resultados)
  components/      pedaços de HTML reutilizados
  voting-machine/  urna 3D (Three.js) e 2D (HTML), regras do voto, tela e sons
  utils/           formatação, DOM e localStorage
  main.ts          rotas
```
