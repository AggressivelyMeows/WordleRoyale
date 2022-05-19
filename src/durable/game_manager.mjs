import { response, WebsocketResponse  } from 'cfw-easy-utils'
import Router from '../tsndr_router.js'
import { nanoid } from 'nanoid'

const generate_board = () => {
    return [
        Array.from({length: 5}).map(x => ''),
        Array.from({length: 5}).map(x => ''),
        Array.from({length: 5}).map(x => ''),
        Array.from({length: 5}).map(x => ''),
        Array.from({length: 5}).map(x => ''),
        Array.from({length: 5}).map(x => '')
    ]
}

export class GameManagerDO {
    constructor(state, env) {
        this.state = state
        this.realtime = env.RealTimeService.get(env.RealTimeService.idFromName('main'))

        this.pending = []

        this.games = []

        this.channels = []
    }
  
    async create_match(players) {
        const new_game = {
            id: `game_` + nanoid(),
            state: 'READY-CHECK',
            players,
            word_to_guess: '',
            finish_state: {},
            ready_check: Array.from({length: players.length}, (x, i) => false),
            created_at: new Date(),
            guesses: Array.from({length: players.length}, (x, i) => generate_board())
        }

        const ready_check_clear = setTimeout(async () => {
            // users failed to ready up in time. cancel game
            const game = this.games.find(x => x.id == new_game.id)

            if (game.state != 'READY-CHECK') {
                return
            }

            game.state = 'FAILED-READY-CHECK'

            await this.sync_game_state(game.id)

            this.games = this.games.filter(x => x.id != new_game.id)
            this.pending = this.pending.filter(x => !game.players.includes(x.id))
        }, 10000)

        new_game.ready_check_clear = ready_check_clear

        this.games.push(new_game)

        await this.sync_game_state(
            new_game.id
        )
    }

    async sync_game_state(gameID) {
        const game = this.games.find(x => x.id == gameID)

        for (let user_token of game.players) {

            let finish_state = Object.assign(
                {},
                game.finish_state,
                {
                    winner: game.finish_state.winner == user_token
                }
            )

            await this.realtime.fetch(`http://internal/v1/emit/notifs:${user_token}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    event: game.state,
                    parameters: {
                        game_id: game.id,
                        finish_state,
                        players: game.players,
                        ready_check: game.ready_check,
                    }
                })
            })
        }
    }

    async log(message) {
        await this.fetch(
            'https://discord.com/api/webhooks/858393287982055425/k3THbhJNvijUO62szEx2_u3C93i0IS6xYs536DUDuOqw5Vn5kDZf6KUHiplikwVICOWG',
            {
                method: 'POST',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify({content: message})
            }
        )
    }

    sleep(t) {
        return new Promise(r => setTimeout(r, t * 1000))
    }

    async fetch(request) {
        const router = new Router()

        router.get('/v1/games/:gameID/accept', async (req, res) => {
            // user has accepted game
            const user = req.query.key
            const game = this.games.find(x => x.id == req.params.gameID)

            game.ready_check[game.players.indexOf(user)] = true

            if (game.ready_check.every(x => x)) {
                // all players are ready
                clearTimeout(game.ready_check_clear)

                game.state = 'PLAYING'

                const word = await fetch('https://random-word-api.herokuapp.com/word?length=5').then(resp => resp.json())

                game.word_to_guess = word[0].toUpperCase()
            }

            await this.sync_game_state(
                game.id
            )

            res.body = { success: true }
        })

        router.get('/v1/games/:gameID/leave', async (req, res) => {
            const user = req.query.key
            const game = this.games.find(x => x.id == req.params.gameID)

            game.players = game.players.filter(x => x != user)

            if (game.players.length == 1 && game.state != 'FINISHED') {
                // all enemies have left the game, let the last one know everyone left, tell them the word too.
                game.state = 'FINISHED'

                game.finish_state = {
                    reason: 'NO-MORE-ENEMIES',
                    winner: game.players[0],
                    word: game.word_to_guess
                }
                
                await this.sync_game_state(
                    game.id
                )
            }

            res.body = {
                success: true
            }
        })

        router.get('/v1/games/:gameID', async (req, res) => {
            // user has accepted game
            const user = req.query.key
            const game = this.games.find(x => x.id == req.params.gameID)

            const player_index = game.players.indexOf(req.query.key)

            let finish_state = Object.assign(
                {}, // to prevent overwriting of the game variable in memory.
                game.finish_state,
                {
                    winner: game.finish_state.winner == user
                }
            )

            res.body = {
                success: true,
                'game': {
                    id: game.id,
                    ready_check: game.ready_check,
                    finish_state,
                    yes: 'I know, please dont look at the word below. that is there for testing!',
                    word_to_guess: game.word_to_guess,
                    your_guesses: game.guesses[player_index],
                    enemy_guesses: game.guesses.filter((e, i) => i != player_index).map(rows => rows.map(row => row.map(r => game.state == 'FINISHED' ? r : r.split(':')[0] + ':?')))
                }
            }
        })

        router.post('/v1/games/:gameID/guess', async (req, res) => {
            // user has accepted game
            const data = req.body
            const user = req.query.key
            const game = this.games.find(x => x.id == req.params.gameID)
            const player_index = game.players.indexOf(req.query.key)

            if (game.guesses[player_index][parseInt(data.round)][0] != '') {
                res.body = {
                    success: false,
                    error: 'You have already guesed for this round.'
                }
                return
            }

            game.guesses[player_index][parseInt(data.round)] = data.letters.map((letter, index) => {
                if (game.word_to_guess[index] == letter) {
                    return `🟩:${letter}`
                }
                if (game.word_to_guess.includes(letter)) {
                    return `🟨:${letter}`
                }
                return `❌:${letter}`
            })

            if (game.guesses[player_index][parseInt(data.round)].every(x => x.includes('🟩'))) {
                // we have a winner!!!
                game.state = 'FINISHED'

                game.finish_state = {
                    reason: 'CORRECT-GUESS',
                    winner: user,
                    word: game.word_to_guess
                }

                await this.sync_game_state(
                    game.id
                )

                // teardown this game.
                this.games = this.games.filter(x => x.id != game.id)
            }

            for (let user_token of game.players) {
                const target_index = game.players.indexOf(user_token)

                console.log('GAME STATE!!', game.state)

                this.realtime.fetch(`http://internal/v1/emit/notifs:${user_token}`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        event: `BOARD-UPDATE`,
                        parameters: {
                            game_id: game.id,
                            your_guesses: game.guesses[target_index],
                            enemy_guesses: game.guesses.filter((e, i) => i != target_index).map(rows => rows.map(row => row.map(r => game.state == 'FINISHED' ? r : r.split(':')[0] + ':?' )))
                        }
                    })
                })
            }

            res.body = {
                success: true,
                'game': {
                    id: game.id,
                    ready_check: game.ready_check,
                    your_guesses: game.guesses[player_index],
                    enemy_guesses: game.guesses.filter((e, i) => i != player_index).map(rows => rows.map(row => row.map(r => r.split(':')[0] + ':?')))
                }
            }
        })

        router.get('/v1/leave-queue/:user_token', async (req, res) => {
            // a user has disconnected from us, we need to remove them from the pending queue.
            this.pending = this.pending.filter(x => x.user_token != req.params.user_token)

            this.games.filter(x => x.players.includes(req.params.user_token)).map(async x => {
                clearTimeout(x.ready_check_clear)
                x.state = 'FAILED-READY-CHECK'

                await this.sync_game_state(
                    new_game.id
                )
            })
            
            res.body = { success: true }
        })

        router.get('/v1/current-users', async (req, res) => {
            res.body = {
                success: true,
                pending_games: this.pending.length
            }
        })

        router.get('/v1/state', async (req, res) => {
            res.body = {
                games: this.games.length,
                pending: this.pending.length,
                pending_state: this.pending
            }
        })

        router.get('/v1/join-queue', async (req, res) => {
            // attempt to find a match
            //await this.log(JSON.stringify(this.pending))
            if (this.pending.filter(x => x.user_token == req.query.user_token).length) {
                res.body = {
                    success: false,
                    error: 'You are already in the queue.',
                    code: 'ALREADY_IN_QUEUE'
                }
                res.status = 400
                return
            }

            if (this.pending.filter(x => x.user_token != req.query.user_token).length) {
                const party_size = 2

                var party = [
                    req.query.user_token,
                ]

                party = party.concat(this.pending.filter(x => x.user_token != req.query.user_token).slice(0, party_size - 1).map(x => x.user_token))

                if (party.length == party_size) {
                    // this is an actual user
                    await this.sleep(1)

                    await this.create_match(party)
    
                    this.pending = this.pending.filter(x => !party.includes(x.user_token))

                    res.body = { success: true }

                    return
                }
            }

            this.pending.push({
                user_token: req.query.user_token
            })
            
            res.body = { success: true }
        })

        return await router.handle(request)
    } 
}
