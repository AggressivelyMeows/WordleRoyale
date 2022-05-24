import Home from './views/Home.vue'
import About from './views/About.vue'
import NotFound from './views/NotFound.vue'

export const routes = [
  { path: '/', component: Home },
  { path: '/find-match', component: () => import('./views/pending.vue') },
  { path: '/games/:gameID', component: () => import('./views/play_game.vue') },

  { path: '/lobbies/:lobbyID', component: () => import('./views/lobby.vue') },
  { path: '/:path(.*)', component: NotFound },
]
