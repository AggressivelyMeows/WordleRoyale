<template>
    <div class="max-w-xl mx-auto">
        <p class="text-gray-400 font-medium" v-if="state == 'FINDING-MATCH'">
            Please wait while we set you up with another person!!
        </p>

        <div class="bg-gray-800 border border-gray-700 rounded-md p-4 text-gray-200 flex flex-col" v-if="state == 'READY-CHECK'">
            Hey!! We found all the players we need! Click the button below to indicate you are still there!

            <div class="flex flex-wrap gap-2 mt-4">
                <div v-for="state in players" :class="`h-12 w-12 rounded-md ${state ? 'bg-green-600' : 'bg-gray-700'}`"></div>
            </div>

            <p class="text-lg text-center block mt-2 font-medium">
                
            </p>

            <a class="button ~primary @high mt-4" @click="accept_match" v-if="!accepted"> 
                {{timer}} - Im ready!
            </a>
            
            <a v-else class="w-full bg-gray-700 text-center py-1 mt-4 rounded-md">
                {{timer}}
            </a>
        </div>

        <div class="bg-gray-800 border border-gray-700 rounded-md p-4 text-gray-200 flex flex-col" v-if="state == 'FAILED-READY-CHECK'">
            Damn, not all players responded in time. To join back into the queue, click the button below:
            <a class="button ~primary @high mt-4" @click="init"> 
                Rejoin queue
            </a>
        </div>
    </div>
</template>

<script>
    export default {
        data: () => ({
            state: 'FINDING-MATCH',
            callbacks: [],
            timers: [],
            players: [],
            game_id: 0,
            accepted: false,
            timer: 10
        }),
        methods: {
            init() {
                this.state = 'FINDING-MATCH'
                this.accepted = false
                this.$api.fetch('/join-queue').then(resp => {})
            },
            accept_match() {
                this.$api.fetch(`/games/${this.game_id}/accept`).then(resp => {
                    this.accepted = true
                })
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