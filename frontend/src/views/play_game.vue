<template>
    <div class="max-w-xl mx-auto">

        <div v-for="row, rowID in board_state" class="flex flex-row gap-4">
            <div class="grid grid-cols-5 w-full gap-4 mb-4">
                <div v-for="guess in row" :class="`col-span-1 w-full h-16 flex flex-col items-center justify-center ${ guess === '' ? 'bg-gray-800' : get_color_from_guess(guess.split(':')[0]) } rounded-md text-center text-3xl font-bold text-gray-200`" >
                    {{guess.split(':')[1]}}
                </div>
            </div>
        </div>

        <hr class="border-gray-700 my-4"/>

        <b class="font-medium text-sm text-gray-200">
            Your guess:
        </b>

        <div class="grid grid-cols-5 gap-4 my-2">
            <input
                v-for="letter, letter_index in letters"
                :ref="`input_${letter_index}`"
                v-model="letters[letter_index]"
                @keyup="(e) => select_next_input(e, letter_index)"
                class="col-span-1 bg-gray-800 h-16 text-center flex flex-col items-center text-primary-400 text-3xl font-extrabold justify-center rounded-md focus:outline-none focus:border-primary-400 focus:ring-primary-400 focus:ring-2"
            />
        </div>

        <b class="font-medium text-sm text-gray-200">
            Press Enter once you are ready to submit your guess!
        </b>

        <div class="grid grid-cols-4 gap-4 mt-8">
            <div v-for="enemy in enemy_board_states" class="rounded-md bg-gray-800 p-2">
                <div v-for="row in enemy" class="grid grid-cols-5 gap-2">
                    <div v-for="guess in row" :class="`col-span-1 w-full h-6 flex flex-col items-center justify-center ${ get_color_from_guess(guess) } rounded-md text-center text-sm font-bold text-gray-200`" >
                        ?
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
            letters: [
                '', '', '', '', ''
            ],
            round: 0,
            board_state: [
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
                Array.from({length: 5}).map(x => ''),
            ],
            enemy_board_states: [],
            no_set: false,
            callbacks: []
        }),
        methods: {
            init() {
                this.$api.fetch(`/games/${this.$route.params.gameID}`).then(r=>r.json()).then(resp => {
                    this.game = resp.game

                    this.board_state = this.game.your_guesses
                    this.enemy_board_states = this.game.enemy_guesses
                })
            },
            get_color_from_guess(guess_emoji) {
                if (guess_emoji == '🟩') return 'bg-green-600'
                if (guess_emoji == '🟨') return 'bg-yellow-600'

                return 'bg-gray-800'
            },
            make_guess() {
                this.$api.fetch(`/games/${this.game.id}/guess`, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ letters: this.letters, round: this.round }) }).then(resp => {
                    this.letters = ['', '', '', '', '']
                    this.round += 1
                })
            },
            select_next_input(event, index) {
                this.letters[index] = this.letters[index].toUpperCase().replace(' ', '')

                if (index == 4 && event.key == 'Enter') {
                    return this.make_guess()
                }

                const value = this.letters[index]

                if (value.length > 1) {
                    this.letters[index] = value.charAt(0)
                }

                if (event.key === "Backspace") {
                    this.letters[index] = ''
                    if (index > 0) {
                        this.$refs[`input_${index - 1}`][0].focus()
                    }
                } else {
                    if (value.length == 0) { return }
                    if (index < 4) {
                        this.$refs[`input_${index + 1}`][0].focus()
                    }
                }
            }
        },
        mounted() {
            this.init()

            this.callbacks.push(this.$api.events.on('notification', (msg) => {
                if (msg.event == 'BOARD-UPDATE') {
                    this.board_state = msg.parameters.your_guesses
                    this.enemy_board_states = msg.parameters.enemy_guesses
                }
            }))
        },
        beforeDestroy() {
            this.callbacks.map(x => x())
        },
    }
</script>