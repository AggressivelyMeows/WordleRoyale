<template>
    <div class="max-w-xl mx-auto px-4 md:px-0">

        <div v-for="row, rowID in board_state" class="flex flex-row gap-4">
            <div class="grid grid-cols-5 w-full gap-4 mb-4">
                <div v-for="guess in row" :class="`col-span-1 w-full h-16 flex flex-col items-center justify-center ${ guess === '' ? 'bg-gray-800' : get_color_from_guess(guess.split(':')[0]) } rounded-md text-center text-3xl font-bold text-gray-200`" >
                    {{guess.split(':')[1]}}
                </div>
            </div>
        </div>

        <hr class="border-gray-700 my-4"/>

        <div v-if="!finish_state.reason">
            <b class="font-medium text-sm text-gray-200">
                Round {{round}} - {{time_taken}} seconds since last guess
                <br/>
                Your guess:
            </b>

            <div class="grid grid-cols-5 gap-4 my-2 relative">
                <input
                    v-for="letter, letter_index in letters"
                    :id="`input_${letter_index}`"
                    :ref="`input_${letter_index}`"
                    v-model="letters[letter_index]"
                    maxlength="1"
                    :disabled="making_guess"
                    @keydown="(e) => select_next_input(e, letter_index)"
                    class="col-span-1 uppercase bg-gray-800 h-16 text-center flex flex-col items-center text-primary-400 text-3xl font-extrabold justify-center rounded-md focus:outline-none focus:border-primary-400 focus:ring-primary-400 focus:ring-2 disabled:bg-gray-700 disabled:opacity-75"
                />
            </div>

            <b class="font-medium text-sm text-gray-200">
                Press Enter once you are ready to submit your guess!
            </b>
        </div>

        <div v-else :class="`${ finish_state.winner ? 'bg-green-600' : 'bg-primary-600' } rounded-md p-4 text-gray-200 text-center font-medium`">
            <div v-if="finish_state.reason == 'NO-MORE-ENEMIES'">
                All other players have left the game. You win by default.
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

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div v-for="enemy, enemyID in enemy_board_states" class="rounded-md bg-gray-800 p-2">
                <p class="text-gray-400 text-xs mb-2">
                    Enemy #{{enemyID + 1}}
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
    export default {
        data: () => ({
            game: {},
            finish_state: {},
            letters: [
                '', '', '', '', ''
            ],
            time_taken: 0,
            round: 0,
            board_state: [
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
            ],
            enemy_board_states: [],
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

                    this.finish_state = this.game.finish_state

                    this.board_state = this.game.your_guesses
                    this.enemy_board_states = this.game.enemy_guesses

                    // figure out our current round
                    this.round = this.board_state.filter(row => row.filter(guess => guess != '').length != 0).length
                })
            },
            get_color_from_guess(guess_emoji) {
                if (guess_emoji == '🟩') return 'bg-green-600'
                if (guess_emoji == '🟨') return 'bg-yellow-600'
                if (guess_emoji == '❌') return 'bg-gray-700'

                return 'bg-gray-800'
            },
            make_guess() {
                this.making_guess = true
                this.$api.fetch(`/games/${this.game.id}/guess`, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ letters: this.letters.map(x => x.toUpperCase()), round: this.round, time_taken: this.time_taken }) }).then(resp => {
                    this.letters = ['', '', '', '', '']
                    this.round += 1
                    this.time_taken = 0
                    console.log(this.$refs['input_0'][0])

                    setTimeout(() => this.$refs['input_0'][0].focus(), 0)
                }).finally(() => this.making_guess = false)
            },
            select_next_input(event, index) {
                if (index == 4 && event.key == 'Enter') {
                    return this.make_guess()
                }

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

            this.callbacks.push(this.$api.events.on('notification', (msg) => {
                if (msg.event == 'BOARD-UPDATE') {
                    this.board_state = msg.parameters.your_guesses
                    this.enemy_board_states = msg.parameters.enemy_guesses
                }

                if (msg.event == 'FINISHED') {
                    this.finish_state = msg.parameters.finish_state
                }
            }))
        },
        beforeDestroy() {
            this.callbacks.map(x => x())
            this.timers.map(clearInterval)
        },
    }
</script>