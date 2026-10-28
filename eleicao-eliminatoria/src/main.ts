import './style.css';
import { renderHomePage } from './pages/home-page';
import { renderResultsPage } from './pages/results/results-page';
import { renderSimulationPage } from './pages/simulation/simulation-page';
import { renderVoteRecordedPage } from './pages/vote-recorded-page';
import { destroyVotingMachine, renderVotingBoothPage } from './pages/voting-booth-page';
import { parseRound, RESULTS_TAB_PARAM, ROUND_PARAM, ROUTES } from './routes';

function handleRoute() {
  destroyVotingMachine();
  window.scrollTo(0, 0);

  const [path, queryString] = location.hash.replace(/^#/, '').split('?');
  const query = new URLSearchParams(queryString);

  switch (path) {
    case ROUTES.votingBooth:
      renderVotingBoothPage();
      break;

    case ROUTES.voteRecorded:
      renderVoteRecordedPage();
      break;

    case ROUTES.simulation:
      renderSimulationPage(parseRound(query.get(ROUND_PARAM)));
      break;

    case ROUTES.results:
      renderResultsPage(query.get(RESULTS_TAB_PARAM), parseRound(query.get(ROUND_PARAM)));
      break;

    default:
      renderHomePage();
  }
}

window.addEventListener('hashchange', handleRoute);
handleRoute();
