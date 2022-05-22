<template>
    <div class="max-w-xl mx-auto">
        <div class="text-gray-300 font-medium relative block z-[1] h-48 rounded-md overflow-hidden flex flex-col items-center justify-center text-center" v-if="state == 'FINDING-MATCH'">
            <div class="vimeo-wrapper">
                <iframe
                    allowfullscreen=""
                    class="w-full brightness-90"
                    src="https://player.vimeo.com/video/520235814?title=0&amp;portrait=0&amp;byline=0&amp;autoplay=1&background=1&amp;muted=true&quality=360p" frameborder="0"
                ></iframe> 
            </div>

            Finding a match, this could take a second or few 💖

            <br/>
            <span class="text-xs text-gray-400">
                Leaving this page will remove you from the queue.
            </span>
        </div>

        <div v-if="state == 'FINDING-MATCH'" class="mt-8">
            <h4 class="text-3xl text-primary-400 font-extrabold mb-2"> 
                Did you know?
            </h4>
            <p class="text-gray-200"> 
                {{random_fact}} <span class="text-gray-400">(from {{random_source}})</span>
            </p>
        </div>

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
            random_fact: '',
            random_source: '',
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
                this.random_fact = ''
                fetch('https://uselessfacts.jsph.pl/random.json?language=en').then(resp => resp.json()).then(resp => {
                    this.random_fact = resp.text
                    this.random_source = resp.source
                })
                this.$api.fetch('/join-queue').then(resp => {})
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

<style scoped>
.vimeo-wrapper {
   position: absolute;
   top: 0;
   left: 0;
   width: 100%;
   height: 100%;
   z-index: -1;
   pointer-events: none;
   overflow: hidden;
}
.vimeo-wrapper iframe {
   width: 600%;
   height: 200%; /* Given a 16:9 aspect ratio, 9/16*100 = 56.25 */
   min-width: 100%; /* Given a 16:9 aspect ratio, 16/9*100 = 177.77 */
   position: absolute;
   top: 50%;
   left: 50%;
   transform: translate(-50%, -50%);
}
</style>