import { nanoid } from 'nanoid'
import { createNanoEvents } from 'nanoevents'

export default class API {
    constructor () {
        this.user_token = localStorage.user_token || 'usr_' + nanoid()
        localStorage.user_token = this.user_token
        this.api_base = `api-dev.constellations.tech/v1`

        this.events = createNanoEvents()

        this.live(`notifs:${this.user_token}`, (msg) => {
            this.events.emit(`notification`, msg)
        })
    }

    live(channelID, msg_callback) {
        // Create WebSocket connection.
        const socket = new WebSocket(`wss://${this.api_base}/live/${channelID}`);

        // Connection opened
        socket.addEventListener('open', function (event) {
            socket.send('Hello Server!');
        });

        // Listen for messages
        socket.addEventListener('message', (msg) => {
            msg_callback(JSON.parse(msg.data))
        })
    }

    async fetch(route, options) {
        if (!options) {var options = {}}

        if (!options.headers) {options.headers = {}}

        options.headers['Authorization'] = this.user_token

        return fetch(
            'https://' + this.api_base + route,
            options
        )
    }
}