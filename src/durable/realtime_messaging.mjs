import { response, WebsocketResponse  } from 'cfw-easy-utils'
import Router from '../tsndr_router.js'
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

        router.post('/v1/emit/:channelID', async (req, res) => {
            const data = req.body
            console.log('GOT DATA FROM EMIT!', data)

            if (this.channels[req.params.channelID]) {
                this.channels[req.params.channelID].map(sock => {
                    try {
                        sock.socket.send(JSON.stringify(data))
                    } catch (e) {
                        // cannot communicate with this user.
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
                ws.send(JSON.stringify({ event: 'SESSION-START', parameters: { session_id: id } }))
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

        return await router.handle(request)
    } 
}
