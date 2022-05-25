import router from "./router.js";
import axios from 'axios'
import durable_object_adapter from './durable_object_adapter.js'
import './api_v1/games.js'
import './api_v1/lobbies.js'

export { GameManagerDO } from './durable/game_manager.mjs'
export { RTMDO } from './durable/realtime_messaging.mjs'

console.log(durable_object_adapter)

export default {
    async fetch(request, env, ctx) {
        globalThis.env = env
        globalThis.ctx = ctx

        // you might be asking why??
        // this is because our router doesnt support middleware due to it using an out of date version
        // and this is because we need WebSocket support built into the router.
        // this work around allows us to have both websockets and easy access to our DOs
        globalThis.$api = {
            game_manager: axios.create({
                baseURL: 'http://game-manager.com/v1',
                validateStatus: false, // we're mostly proxying data to and from the DO using this, no need to catch that error
                adapter: durable_object_adapter,
                durableObject: env.GameManager.get(env.GameManager.idFromName('main'))
            }),
            realtime: axios.create({
                baseURL: 'http://realtime-manager.com/v1',
                validateStatus: false,
                adapter: durable_object_adapter,
                durableObject: env.RealTimeService.get(env.RealTimeService.idFromName('main'))
            }),
            // for websocket connections
            realtime_raw: env.RealTimeService.get(env.RealTimeService.idFromName('main'))
        }

        if (!globalThis.MINIFLARE) {
            router.corsConfig.allowOrigin = 'https://wordful.ceru.dev'
        }

        console.log(
            request.url,
            Object.fromEntries(request.headers.entries())
        )

        try {
            return await router.handle(request)
        } catch (e) {
            console.error(e.toString())
        }
        
    }
}
