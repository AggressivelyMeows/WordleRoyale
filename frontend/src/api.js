import { nanoid } from 'nanoid'
import { createNanoEvents } from 'nanoevents'
import { ref, watch } from 'vue'

export default class API {
    constructor () {
        this.user_token = localStorage.user_token || 'usr_' + nanoid()
        localStorage.user_token = this.user_token
        this.api_base = import.meta.env.DEV ? `api-dev.constellations.tech/v1` : 'wordle-royale.sponsus.workers.dev/v1'

        this.events = createNanoEvents()

        this.live(`notifs:${this.user_token}`, (msg) => {
            this.events.emit(`notification`, msg)
        })

        this.has_ever_connected = ref(false)
        this.is_connected = ref(false)
        setTimeout(() => this.has_ever_connected.value = true, 2000)
    }

    live(channelID, msg_callback) {
        // Create WebSocket connection.
        console.log('[WS] Connecting to channel', channelID)
        const socket = new WebSocket(`wss://${this.api_base}/live/${channelID}`);

        // Connection opened
        socket.addEventListener('open', (event) => {
            socket.send('Hello Server!')
            
            if (channelID.includes('notifs')) {
                this.is_connected.value = true
                this.has_ever_connected.value = true
            }
        })

        socket.addEventListener('close', () => {
            console.log('[WS] RTM Connection lost for channelID', channelID)
            if (channelID.includes('notifs')) {
                this.is_connected.value = false
            }

            // reconnect
            setTimeout(() => {
                console.log('[WS] Reconnecting to RTM service')
                this.live(channelID, msg_callback)
            }, 1000)
        })

        // Listen for messages
        socket.addEventListener('message', (msg) => {
            if (channelID.includes('notifs')) {
                this.is_connected.value = true
                this.has_ever_connected.value = true
            }
            msg_callback(JSON.parse(msg.data))
        })
    }

    async fetch(route, options) {
        console.log(
            'OPTIONS',
            JSON.stringify(arguments),
            JSON.stringify(options),
            JSON.stringify({ x: !!options })
        )
        if (!options) {var options = {}}

        options.mode = 'cors'

        if (!options.headers) {options.headers = {}}

        options.headers['Authorization'] = this.user_token

        console.log(
            'FETCH OPTIONS:',
            'https://' + this.api_base + route,
            options
        )

        return fetch(
            'https://' + this.api_base + route,
            options
        )
    }
}