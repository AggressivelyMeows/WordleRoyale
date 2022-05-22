<template>
    <div class="bg-gray-900 min-h-screen">
        <header class="">
            <span class="hidden">{{i}}</span>
            <div class="mx-auto max-w-xl py-6 px-4 md:px-0">
                <router-link to="/" class="text-3xl font-extrabold text-primary-400 flex flex-col md:flex-row items-center">
                    <div style="flex-shrink:0;">
                        {{emoji}} {{translation}}
                    </div>

                    <div class="mt-2 md:mt-0 w-full flex flex-grow flex-row items-center">
                        <span class="text-gray-700 text-xs ml-4 animate__animated animate__fadeInUp" v-if="show_about">
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

                <div v-if="!$api.is_connected._value && $api.has_ever_connected._value" class="text-primary-400 text-center text-xs pt-4">
                    We have lost communication with Wordful's game servers, please try refreshing 💖
                </div>
            </div>
        </header>
        <main class="py-2 px-4 md:px-0">
            <router-view />
        </main>
    </div>
</template>

<script>
    const emoji_list = [
        '🍓',
        '🍇',
        '🍕', 
        '📚',
        '🔥',
        '🎨',
        '👑'
    ]

    const translation_list = [
        'Багатослівний',
        'Orðmikið',
        'のような言葉',
        'Wortreich',
        'lleno de palabras',
        'plein de mots',
        'Wordful'
    ]

    export default {
        data: () => ({
            emoji_index: 0,
            emoji: emoji_list[0], 
            translation: translation_list[0],
            show_about: false,
            active_games: 0,
            pending_queue: 0,
            i: 0,
        }),
        mounted() {
            setInterval(() => this.i+=1, 150)
            var clr
            clr = setInterval(() => {
                this.emoji_index += 1
                if (this.emoji_index > emoji_list.length - 1) {
                    clearInterval(clr)
                    this.show_about = true
                    return
                }
                this.emoji = emoji_list[this.emoji_index]
                this.translation = translation_list[this.emoji_index]
            }, 225)

            this.$api.events.on('notification', (msg) => {
                if (msg.event == 'PING') {
                    this.active_games = msg.parameters.games
                    this.pending_queue = msg.parameters.pending
                }
            })
        }
    }
</script>