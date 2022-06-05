import Home from './views/Home.vue'
import About from './views/About.vue'
import NotFound from './views/NotFound.vue'

export const routes = [
  { path: '/', component: Home },
  { path: '/find-match', component: () => import('./views/pending.vue') },
  { path: '/games/:gameID', component: () => import('./views/play_game.vue') },
  { path: '/:p1-:p2-:p3', component: () => Home, beforeEnter: async (to, from, next) => {
    const id = location.pathname.split('/')[1]

    const target = await fetch(`https://${import.meta.env.DEV ? `api-dev.constellations.tech/v1` : 'wordle-royale.sponsus.workers.dev/v1'}/short?id=${id}&type=json`).then(r => r.json())

    next(target.target)
  }},
  { path: '/lobbies/:lobbyID', component: () => import('./views/lobby.vue') },
  { path: '/meta/qr-code', component: () => import('./views/qr_reader.vue') },
  { path: '/:path(.*)', component: NotFound },
]
