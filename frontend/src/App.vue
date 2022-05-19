<template>
    <div class="bg-gray-900 min-h-screen">
        <header class="">
            <div class="mx-auto max-w-xl py-6  px-4 md:px-0">
                <router-link to="/" class="text-3xl font-extrabold text-primary-400 flex flex-col md:flex-row items-center">
                    <div style="flex-shrink:0;">
                        👑 Wordful
                    </div>

                    <div class="mt-2 md:mt-0 w-full flex flex-grow flex-row items-center">
                        <span class="text-gray-700 text-xs ml-4">
                            Multiplayer Wordle<br/>
                            Built by Cerulean
                        </span>
                        <div class="flex-grow"></div>
                        <span class="text-gray-700 text-xs ml-4 text-right">
                            {{active_games}} games<br/>
                            {{pending_queue}} waiting for a game
                        </span>                    

                    </div>
                </router-link>
            </div>
        </header>
        <main class="py-6  px-4 md:px-0">
            <router-view />
        </main>
    </div>
</template>

<script>
    export default {
        data: () => ({
            active_games: 0,
            pending_queue: 0,
        }),
        mounted() {
            this.$api.events.on('notification', (msg) => {
                if (msg.event == 'PING') {
                    this.active_games = msg.parameters.games
                    this.pending_queue = msg.parameters.pending
                }
            })
        }
    }
</script>