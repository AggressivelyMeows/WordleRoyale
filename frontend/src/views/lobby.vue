<template>
    <div class="max-w-xl mx-auto">

        <h4 class="text-3xl font-extrabold text-primary-400 mb-4">
            Private lobby
        </h4>

        <b v-if="error" class="text-primary-400 text-2xl">
            Error: {{error}}
        </b>

        <div class="bg-gray-800 rounded-md p-4 text-gray-200" v-if="!error">
            <a class="button ~primary @high w-full mb-2" v-if="lobby.is_owner" @click="start_game">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Start game
            </a>

            <p class="text-gray-400 text-sm mb-2">
                Share this URL to invite people:<br/>
                {{lobby.short_url}}
            </p>

            <p v-if="!lobby.is_owner" class="text-gray-400 mb-2 block">
                🍹 Please wait for the lobby owner to start the game! 
            </p>

            <b class="label">
                Nickname
            </b>
            <input
                class="my-1 w-full bg-gray-800 border border-gray-700 p-2 rounded-md focus:outline-none focus:border-primary-400 focus:ring-primary-400 focus:ring-2 disabled:bg-gray-700"
                v-model="nickname"
                @keydown.enter="change_nickname"
            />
            <p class="support">
                Press Enter to set your nickname. This will also be saved so you dont have to type it every time.
            </p>

            <div class="my-4"></div>

            <div v-for="nickname, idx in lobby.nicknames" class="flex flex-row items-center mb-2">
                <div class="w-10 h-10 rounded-md mr-2" :style="{ background: gradient(lobby.nicknames[idx]) }"></div>
                <b>
                    {{nickname}} <span v-if="player_index == idx" class="text-gray-400 text-sm">You</span>
                </b>
                
            </div>
        </div>
    </div>
</template>

<script>
    import gradient from 'random-gradient'

    export default {
        data: () => ({
            gradient,
            state: 'FINDING-MATCH',
            random_fact: '',
            random_source: '',
            callbacks: [],
            timers: [],
            lobby: {},
            nickname: '',
            player_index: -1,
            error: ''
        }),
        methods: {
            init() {
                this.state = 'JOINING-LOBBY'
                
                this.$api.fetch(`/lobbies/${this.$route.params.lobbyID}`).then(r=>r.json()).then(resp => {
                    if (!resp.success) {
                        this.error = resp.error
                        return
                    }

                    this.lobby = resp.lobby

                    this.player_index = this.lobby.player_index
                    this.nickname = this.lobby.nicknames[this.player_index]

                    this.$api.fetch(`/lobbies/${this.$route.params.lobbyID}/join`, { method: 'POST', headers: JSONPostHeaders, body: JSON.stringify({ nickname: localStorage.nickname || '' }) }).then(r=>r.json()).then(resp => {
                        //this.nickname = msg.parameters.lobby.nicknames[msg.parameters.player_index]
                        this.state = 'WAITING-FOR-GAME'

                        if (!resp.success) {
                            // there was an error
                            if (resp.code == 'ALREADY-IN-LOBBY') {
                                return
                            }

                            this.error = resp.error
                        }
                    }).catch(e => {
                        console.log(e)
                    })
                })
            },  
            start_game() {
                this.$api.fetch(`/lobbies/${this.$route.params.lobbyID}/create-match`, { method: 'POST' }).then(r=>r.json()).then(resp => {

                })
            },
            change_nickname() {
                localStorage.nickname = this.nickname

                this.$api.fetch(`/lobbies/${this.$route.params.lobbyID}/nickname`, {
                    method: 'POST',
                    headers: JSONPostHeaders,
                    body: JSON.stringify({
                        nickname: this.nickname
                    })
                })
            },
            accept_match() {
                this.$api.fetch(`/games/${this.game_id}/accept`).then(resp => {
                    this.accepted = true
                })
            }
        },
        watch: {
            $route() {
                if (!this.$route.fullPath.includes('/games')) {
                    this.$api.fetch(`/leave-queue`)
                }
            }
        },
        mounted() {
            this.timers.push(setInterval(() => {
                this.timer = this.timer - 1
            }, 1000))

            this.callbacks.push(this.$api.events.on('notification', (msg) => {
                if (msg.event == 'READY-CHECK') {
                    if (this.state != 'READY-CHECK') {
                        this.timer = 10
                    }

                    this.state = 'READY-CHECK'
                    this.game_id = msg.parameters.game_id
                    this.players = msg.parameters.ready_check
                }

                if (msg.event == 'FAILED-READY-CHECK') {
                    this.state = 'FAILED-READY-CHECK'
                }

                if (msg.event == 'LOBBY-PLAYER-UPDATE') { 
                    this.lobby = msg.parameters.lobby

                    this.nickname = msg.parameters.lobby.nicknames[msg.parameters.player_index]
                    this.player_index = msg.parameters.player_index
                }

                if (msg.event == 'PLAYING') {
                    this.$router.push(`/games/${msg.parameters.game_id}`)
                }
            }))

            this.init()
        },
        beforeDestroy() {
            this.callbacks.map(x => x())
            this.timers.map(x => clearInterval(x))
        },
    }
</script>