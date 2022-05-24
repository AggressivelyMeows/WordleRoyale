import { response, WebsocketResponse  } from 'cfw-easy-utils'
import Router from '../tsndr_router.js'
import { captureError } from '@cfworker/sentry'
import { nanoid } from 'nanoid'

export class RTMDO {
    constructor(state, env) {
        this.state = state
        this.env = env
        
        this.channels = {}
    }
  
    async fetch(request) {
        const game_manager = this.env.GameManager.get(this.env.GameManager.idFromName('main'))
        const router = new Router()

        router.debug(false)

        router.post('/v1/emit/:channelID', async (req, res) => {
            const data = req.body
            console.log('GOT DATA FROM EMIT!', data)

            if (this.channels[req.params.channelID]) {
                this.channels[req.params.channelID].map(async sock => {
                    try {
                        sock.socket.send(JSON.stringify(data))
                    } catch (e) {
                        console.log(e.toString())

                        if (e.toString().includes('accept()')) {
                            sock.socket.accept() // huh???
                            sock.socket.send(JSON.stringify(data))
                        }

                        // cannot communicate with this user.
                        const { event_id, posted } = captureError(
                            'https://c1820993fb8c4de49298ecf29e019cfb@o225929.ingest.sentry.io/6424888',
                            'production',
                            '0',
                            e,
                            request,
                            ''
                        );
            
                        await posted;

                        sock.socket.close()
                        this.channels[req.params.channelID] = this.channels[req.params.channelID].filter(x => x.id != sock.id)
                    }
                })
            }
            
            res.body = { success: true }
        })

        router.get('/v1/disconnect/:channelID', async (req, res) => {
            this.channels[req.params.channelID].filter(x => x.id != req.query.ws_id)
        })

        router.get('/v1/join-channel/:channelID', async (req, res) => {
            const ws = new WebsocketResponse()
            const id = `sock_${nanoid()}`

            ws.on('message', (msg) => {
                if (msg == 'Hello Server!') {
                    ws.send(JSON.stringify({ event: 'SESSION-START', parameters: { session_id: id } }))
                }

                if (msg == '{"event":"PING"}') {
                    ws.send(JSON.stringify({ event: 'PING-BACK', parameters: { alive: true } }))
                }
            })

            if (this.channels[req.params.channelID]) {
                // this channel already exists, add this user to the list of listeners
                this.channels[req.params.channelID].push({
                    id,
                    socket: ws
                })
            } else {
                this.channels[req.params.channelID] = [{
                    id,
                    socket: ws
                }]
            }

            res.webSocket = ws.client
            res.status = 101
        })

        try {
            return await router.handle(request)
        } catch (e) {
            const { event_id, posted } = captureError(
                'https://c1820993fb8c4de49298ecf29e019cfb@o225929.ingest.sentry.io/6424888',
                'production',
                '0',
                e,
                request,
                ''
            );

            await posted;

            return response.json({
                success: false,
                error: 'Internal server error',
                event_id
            })
        }
    } 
}
