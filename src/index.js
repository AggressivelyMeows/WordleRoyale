import router from "./router.js";

import './api_v1/games.js'

export { GameManagerDO } from './durable/game_manager.mjs'
export { RTMDO } from './durable/realtime_messaging.mjs'

export default {
    async fetch(request, env, ctx) {
        globalThis.env = env
        globalThis.ctx = ctx

        // you might be asking why??
        // this is because our router doesnt support middleware due to it using an out of date version
        // and this is because we need WebSocket support built into the router.
        // this work around allows us to have both websockets and easy access to our DOs
        globalThis.$api = {
            game_manager: env.GameManager.get(env.GameManager.idFromName('main')),
            realtime: env.RealTimeService.get(env.RealTimeService.idFromName('main'))
        }

        try {
            return await router.handle(request)
        } catch (e) {
            console.error(e.toString())
        }
        
    }
}
