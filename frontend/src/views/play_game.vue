<template>
    <div class="max-w-xl mx-auto px-4 md:px-0">

        <div v-for="row, rowID in board_state" class="flex flex-row gap-4">

            <div v-if="!row.filter(x => x).length && rowID == 0 && round == 0" class="block md:hidden text-center w-full bg-gray-900 rounded-md text-gray-200">

                <div class="grid grid-cols-5 w-full gap-4 mb-4">
                    <div v-for="guess in ['', '','','','']" :class="`col-span-1 w-full h-8 md:h-16 flex flex-col items-center justify-center rounded-md text-center text-xl md:text-3xl font-bold text-gray-200 ${ guess === '' ? 'bg-gray-800' : get_color_from_guess(guess.split(':')[0]) }`" >
                    </div>
                </div>
            </div>

            <div :class="`grid grid-cols-5 w-full gap-4 mb-4 ${ !row.filter(x => x).length ? 'hidden md:grid' : '' }`">
                <div v-for="guess in row" :class="`col-span-1 w-full h-8 md:h-16 flex flex-col items-center justify-center rounded-md text-center text-xl md:text-3xl font-bold text-gray-200 ${ guess === '' ? 'bg-gray-800' : get_color_from_guess(guess.split(':')[0]) }`" >
                    {{guess.split(':')[1]}}
                </div>
            </div>
        </div>

        <hr class="border-gray-700 my-4"/>

        <div v-if="!finish_state.reason">
            <b class="font-medium text-sm text-gray-200">
                Round {{round + 1}} - {{humanize_duration(time_taken * 1000)}} since last guess
                <br/>
                Your guess:
            </b>

            <div :class="`grid grid-cols-5 gap-4 my-2 relative rounded-md  animate__animated ${guess_error ? 'animate__shakeX' : ''} ${making_guess ? 'opacity-75' : ''} ${letters_input.length == 5 ? 'border-primary-400 ring-primary-400 ring-2' : ''}`">
                <input
                    v-if="device_type() != 'mobile'"
                    id="input"
                    v-model="letters_input"
                    maxlength="5"
                    :disabled="making_guess"
                    autofocus autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                    @keydown="on_key_down"

                    class="absolute top-0 left-0 w-full h-full opacity-0 uppercase bg-gray-800 h-16 text-center flex flex-col items-center text-primary-400 text-3xl font-extrabold justify-center rounded-md focus:outline-none focus:border-primary-400 focus:ring-primary-400 focus:ring-2 disabled:bg-gray-700 disabled:opacity-100"
                />
                <input
                    v-else
                    id="input"
                    :value="letters_input"
                    @input="e => letters_input = e.target.value"
                    maxlength="5"
                    :disabled="making_guess"
                    autofocus autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"

                    class="absolute top-0 left-0 w-full h-full opacity-0 uppercase bg-gray-800 h-16 text-center flex flex-col items-center text-primary-400 text-3xl font-extrabold justify-center rounded-md focus:outline-none focus:border-primary-400 focus:ring-primary-400 focus:ring-2 disabled:bg-gray-700 disabled:opacity-100"
                />
                <div
                    v-for="letter_index in [ 0, 1, 2, 3, 4 ]"
                    :class="`${(letters_input[letter_index - 1] && !letters_input[letter_index]) || (letter_index == 0 && !letters_input.length) ? 'border-primary-400 ring-primary-400 ring-2' : ''} ${ known_bad_characters.includes((letters_input[letter_index] || '').toUpperCase()) ? 'bg-primary-800' : 'bg-gray-800' } col-span-1 uppercase h-16 text-center flex flex-col items-center text-primary-400 text-3xl font-extrabold justify-center rounded-md focus:outline-none disabled:bg-gray-700 disabled:opacity-75`"
                >
                    {{letters_input[letter_index]}}
                </div>
            </div>

            <b class="font-medium text-sm text-gray-200" v-if="!guess_error">
                Press Enter once you are ready to submit your guess!

                <!-- Good lord, this is a mess but it works so /shrug -->
                <span v-if="inputted_bad_characters.length" class="text-primary-400">
                    <br/>
                    {{inputted_bad_characters.join(', ')}} {{inputted_bad_characters.length == 1 ? 'is a' : 'are'}} known invalid character{{inputted_bad_characters.length > 1 ? 's' : ''}}, are you sure you want to make this guess?
                </span>
            </b>
            <b class="font-medium text-sm text-primary-400" v-else>
                {{guess_error}}
            </b>
        </div>

        <div v-else :class="`${ finish_state.winner ? 'bg-green-600' : 'bg-primary-600' } rounded-md p-4 text-gray-200 text-center font-medium`">
            <div v-if="finish_state.reason == 'NO-MORE-ENEMIES'">
                All other players have left the game. You win by default.
            </div>

            <div v-if="finish_state.reason == 'OUT-OF-GUESSES'">
                No one managed to figure out this word, unfortunately. Better luck next time?
            </div>

            <div v-if="finish_state.reason == 'CORRECT-GUESS' && finish_state.winner">
                You got it!! You guessed correctly!
            </div>
            <div v-if="finish_state.reason == 'CORRECT-GUESS' && !finish_state.winner">
                Aw damn! Another player guessed the word before you did. Better luck next time.
            </div>
            <h4 class="font-bold text-3xl text-center mt-2">
                Word was: {{finish_state.word}}
            </h4>
        </div>

        <router-link v-if="game.lobbyID && finish_state.reason" :to="`/lobbies/${game.lobbyID}`" class="button ~green @high w-full mb-4 mt-4">
            Click here to go back to the lobby!
        </router-link>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div v-for="enemy, enemyID in enemy_board_states" class="rounded-md bg-gray-800 p-2">
                <p class="text-gray-400 text-xs mb-2">
                    {{ nicknames[enemyID][1] }}
                    <br/>
                    {{ enemy.filter(row => row.filter(r => r != '').length != 0 ).length }} guesses
                </p>

                <div v-for="row in enemy" class="grid grid-cols-5 gap-2 mb-1">
                    <div v-for="guess in row" :class="`col-span-1 w-full h-6 flex flex-col items-center justify-center ${ get_color_from_guess(guess.split(':')[0]) } rounded-md text-center text-sm font-bold text-gray-200`" >
                        {{guess.split(':')[1]}}
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<script>
    import humanize_duration from 'humanize-duration'

    export default {
        data: () => ({
            humanize_duration,
            game: {},
            log: [],
            last_key: '',
            finish_state: {},
            letters_input: '',
            letters: [
                '', '', '', '', ''
            ],
            time_taken: 0,
            round: 0,
            known_bad_characters: [],
            inputted_bad_characters: [],
            known_good: ['','','','',''],
            board_state: [
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
            ],
            enemy_board_states: [],
            nicknames: [],
            guess_error: '',
            no_set: false,
            making_guess: false,
            callbacks: [],
            timers: []
        }),
        watch: {
            $route() {
                // if the user leaves the game, mark them as left for everyone else.
                if (!this.$route.fullPath.includes('/games')) {
                    this.$api.fetch(`/games/${this.game.id}`, { method: 'DELETE' })
                }
            }
        },
        methods: {
            init() {
                this.time_taken = 0
                this.$api.fetch(`/games/${this.$route.params.gameID}`).then(r=>r.json()).then(resp => {
                    this.game = resp.game

                    // Ensure all players have a nickname if this is a lobby match or public match
                    this.nicknames = (this.game.nicknames || []).length ? this.game.nicknames : this.game.ready_check.map((i, idx) => [ idx, `Enemy #${idx + 1}` ])

                    this.finish_state = this.game.finish_state

                    this.board_state = this.game.your_guesses
                    this.enemy_board_states = this.game.enemy_guesses

                    this.known_bad_characters = this.board_state.map(row => row.filter(char => char.includes('❌'))).flat().map(char => char.split(':')[1])

                    // figure out our current round
                    this.round = this.board_state.filter(row => row.filter(guess => guess != '').length != 0).length
                })
            },
            device_type() {
                const ua = navigator.userAgent;
                if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
                    return "tablet";
                }
                else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
                    return "mobile";
                }
                return "desktop";
            },
            get_color_from_guess(guess_emoji) {
                if (guess_emoji == '🟩') return 'bg-green-600'
                if (guess_emoji == '🟨') return 'bg-yellow-600'
                if (guess_emoji == '❌') return 'bg-gray-700'

                return 'bg-gray-800'
            },
            make_guess() {
                this.making_guess = true
                this.guess_error = ''
                this.$api.fetch(`/games/${this.game.id}/guess`, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ letters: this.letters_input.split('').map(x => x.toUpperCase()), round: this.round, time_taken: this.time_taken }) }).then(r=>r.json()).then(resp => {
                    this.letters_input = ''
                   
                    if (!resp.success) {
                        this.guess_error = resp.error
                        return
                    }
                   
                    this.round += 1
                    this.time_taken = 0

                    setTimeout(() => document.querySelector('#input').focus(), 10)
                }).finally(() => this.making_guess = false)
            },
            on_key_down(e) {
                if (this.letters_input.length == 5 && event.key == 'Enter') {
                    return this.make_guess()
                }

                if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
                    e.preventDefault();
                }

                setTimeout(() => {
                    this.inputted_bad_characters = this.letters_input.split('').map(x => this.known_bad_characters.includes((x || '').toUpperCase()) ? x.toUpperCase() : '' ).filter(x => !!x)
                }, 50)
            },
            select_next_input(event, index) {
                // old code for handling input boxes
                if (index == 4 && event.key == 'Enter') {
                    return this.make_guess()
                }

                this.last_key = event.key

                if (event.key == "Backspace") {
                    this.letters[index] = ''

                    if (index > 0) {
                        try {
                            return document.getElementById(`input_${index - 1}`).focus()
                        } catch (e) {}
                    }
                }

                if (event.key != "Backspace" && index < 5) {
                    this.letters[index] = event.key
                    try {
                        window.requestAnimationFrame(() => {
                            try {
                                document.getElementById(`input_${index + 1}`).focus()
                            } catch (e) {

                            }
                        })
                    } catch (e) {
                        
                    }
                }
            }
        },
        mounted() {
            this.timers.push(setInterval(() => {
                this.time_taken = this.time_taken + 1
            }, 1000))

            this.init()

            const audio = new Audio('./audio/win.wav')

            window.heck = this

            if (this.device_type() == 'mobile') {
                document.querySelector('#input').onkeydown = (e) => {
                    this.on_key_down(e)
                }
            }

            this.callbacks.push(this.$api.events.on('notification', (msg) => {
                if (msg.event == 'BOARD-UPDATE') {
                    this.board_state = msg.parameters.your_guesses
                    this.enemy_board_states = msg.parameters.enemy_guesses

                    this.known_bad_characters = this.board_state.map(row => row.filter(char => char.includes('❌'))).flat().map(char => char.split(':')[1])
                }

                if (msg.event == 'FINISHED') {
                    this.finish_state = msg.parameters.finish_state

                    if (this.finish_state.winner) {
                        audio.play()
                    }
                }
            }))
        },
        beforeDestroy() {
            this.callbacks.map(x => x())
            this.timers.map(clearInterval)
        },
    }
</script>
