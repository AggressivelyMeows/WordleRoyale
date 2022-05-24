import Router from './tsndr_router.js' // modified tsndr router for WebSocket support.
import { response, WebsocketResponse  } from 'cfw-easy-utils'

const router = new Router()

router.version = 1
router.cors()
router.debug(true)

router.get('/v1/join-queue', async (req, res) => {
    const game_manager = env.GameManager.get(env.GameManager.idFromName('main'))

    res.body = await game_manager.fetch(`http://internal/v1/join-queue?user_token=${req.headers.get('Authorization')}&party-size=${req.query['party-size'] || 2}`).then(resp => resp.json())
})

router.get('/v1/state', async (req, res) => {
    res.body = await $api.game_manager.get('http://internal/v1/state').then(resp => resp.data)
})

router.get('/v1/short', async (req, res) => {

    const id = req.query.id

    const data = await env.ShortUrlKV.get(id)

    if (req.query.type == 'json') {
        res.body = {
            success: true,
            target: data.replace('https://wordful.ceru.dev', '')
        }
        return
    }

    res.status = 302
    res.headers['Location'] = data

})

router.get('/v1/leave-queue', async (req, res) => {
    const game_manager = env.GameManager.get(env.GameManager.idFromName('main'))

    res.body = await game_manager.fetch(`http://internal/v1/leave-queue/${req.headers.get('Authorization')}`).then(resp => resp.json())
})

router.get('/v1/live/:channelID', async (req, res) => {
    // setup a connection to the RTM DO.
    const resp = await $api.realtime_raw.fetch(`http://internal/v1/join-channel/${req.params.channelID}`, { headers: {'upgrade': 'websocket'}})

    const socket = resp.webSocket
    socket.accept()

    const ws = new WebsocketResponse()

    var ws_id = null

    var clr

    socket.addEventListener('message', async (msg) => {
        try {
            ws.send(msg.data)
        } catch (e) {
            console.log(`WEBSOCKET DISCONNECT`, req.headers.get('Authorization'))

            if (req.params.channelID.includes('notifs')) {
                // this is the user notifs channel, we need to remove them from the pending games list.
                await $api.realtime.get(`http://internal/v1/leave-queue/${req.params.channelID.split(':')[1]}`)
            }

            clearInterval(clr)
        }
    })

    clr = setInterval(async () => {
        const state = await $api.game_manager.get(`http://internal/v1/state`).then(r => r.data)

        try {
            ws.send(JSON.stringify({ event: 'PING', parameters: state }))
            socket.send(JSON.stringify({ event: 'PING' }))
        } catch (e) {
            console.log(`WEBSOCKET DISCONNECT`, req.headers.get('Authorization'))

            if (req.params.channelID.includes('notifs')) {
                // this is the user notifs channel, we need to remove them from the pending games list.
                await $api.realtime.get(`http://internal/v1/leave-queue/${req.params.channelID.split(':')[1]}`)
            }

            clearInterval(clr)
        }
    }, 5000)

    res.webSocket = ws.client
    res.status = 101
})

router.get('/v1/live/disconnect/:user_token', async (req, res) => {
    console.log(`USER IS LEAVING`, req.params.user_token)
    await $api.game_manager.get(`http://internal/v1/disconnect/${req.params.user_tokenm}`)
    res.status = 201
})

export default router
