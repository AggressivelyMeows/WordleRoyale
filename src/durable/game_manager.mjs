import { response, WebsocketResponse  } from 'cfw-easy-utils'
import { captureError } from '@cfworker/sentry'
import Router from '../tsndr_router.js'
import { nanoid } from 'nanoid'
import { answer_words, valid_words } from '../words.js'


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
        this.env = env
        this.state = state
        this.realtime = env.RealTimeService.get(env.RealTimeService.idFromName('main'))

        this.frontend_host = 'wordful.ceru.dev'

        this.pending = []
        this.games = []
        this.channels = []
        this.lobbies = []
        this.messages = []
    }
  
    async create_match(players, opt) {
        const options = Object.assign({ skip_ready: false }, opt || {})

        const new_game = {
            id: `game_` + nanoid(),
            state: options.skip_ready ? 'PLAYING' : 'READY-CHECK',
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
            
            await this.env.GameManagerKV.delete(`game:${new_game.id}`)

        }, 10000)

        if (!options.skip_ready) {
            new_game.ready_check_clear = ready_check_clear
        }

        this.games.push(new_game)

        // no need to send to KV as sync will do that for us.
        await this.sync_game_state(
            new_game.id
        )

        return new_game
    }

    async sync_game_state(gameID) {
        // sends the game state to all players involved
        // also saves the game to the KV for retrieval after the fact.
        // or if the DO dies at some point
        const game = this.games.find(x => x.id == gameID)

        const clone = Object.assign({}, game)
        clone.ready_check_clear = {}

        this.env.GameManagerKV.put(`game:${game.id}`, JSON.stringify(clone))

        for (let user_token of game.players) {
            let finish_state = Object.assign(
                {},
                game.finish_state,
                {
                    winner: game.finish_state.winner == user_token
                }
            )

            this.realtime.fetch(`http://internal/v1/emit/notifs:${user_token}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    event: game.state,
                    parameters: {
                        game_id: game.id,
                        finish_state,
                        lobbyID: game.lobbyID,
                        players: game.players,
                        ready_check: game.ready_check,
                    }
                })
            })
        }
    }

    async send_to_lobby(lobbyID, event, parameters) {
        // sends the lobby state to all players involved
        // also saves the lobby to the KV for retrieval after the fact.
        // or if the DO dies at some point
        const lobby = this.lobbies.find(x => x.id == lobbyID)

        await this.env.GameManagerKV.put(`lobby:${lobby.id}`, JSON.stringify(lobby))

        for (let user_token of lobby.players) {
            let clone = JSON.parse(JSON.stringify(parameters))
            clone.player_index = lobby.players.indexOf(user_token)

            clone.lobby.is_owner = user_token === lobby.creator
            delete clone.lobby.players
            delete clone.lobby.bans
            delete clone.lobby.creator

            await this.realtime.fetch(`http://gm-to-realtime.co/v1/emit/notifs:${user_token}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    event,
                    'parameters': clone
                })
            })
        }
    }

    sleep(t) {
        return new Promise(r => setTimeout(r, t * 1000))
    }

    async get_game(gameID) {
        let game = this.games.find(x => x.id == gameID)

        if (!game) {
            game = await this.env.GameManagerKV.get(`game:${gameID}`, { type: 'json' })

            if (game) {
                // this game wasnt previously in the in-memory cache, so we need to readd it.
                this.games.push(game)
            }
        }

        return game || null
    }

    async get_lobby(lobbyID) {
        let lobby = this.lobbies.find(x => x.id == lobbyID)

        if (!lobby) {
            lobby = await this.env.GameManagerKV.get(`lobby:${lobbyID}`, { type: 'json' })

            if (lobby) {
                // this lobby wasnt previously in the in-memory cache, so we need to readd it.
                this.lobbies.push(lobby)
            }
        }

        return lobby || null
    }

    async fetch(request) {
        const router = new Router()

        // Ready check accept
        // Sent once a user clicks the ready check button
        // also manages moving the game state to PLAYING once all ready checks have been accepted
        router.get('/v1/games/:gameID/accept', async (req, res) => {
            // user has accepted game
            const user = req.query.key
            const game = await this.get_game(req.params.gameID)

            game.ready_check[game.players.indexOf(user)] = true

            if (game.ready_check.every(x => x)) {
                // all players are ready
                clearTimeout(game.ready_check_clear)

                game.state = 'PLAYING'

                const word = answer_words[~~(answer_words.length * Math.random())]

                game.word_to_guess = word.toUpperCase()
            }

            await this.sync_game_state(
                game.id
            )

            res.body = { success: true }
        })

        // If the user leaves the game half way through, kick them out
        // If theres no more users left, send the FINISHED state and delete the game from memory.
        router.get('/v1/games/:gameID/leave', async (req, res) => {
            const user = req.query.key
            const game = await this.get_game(req.params.gameID)

            if (!game) {
                res.body = {
                    success: false,
                    error: 'This game does not exist'
                }
                res.status = 404
                return
            }

            const index = game.players.indexOf(user)

            game.players[index] = 'REMOVED_USER'

            if (game.players.length == 1 && game.state != 'FINISHED') {
                // all enemies have left the game, let the last one know everyone left, tell them the word too.
                game.state = 'FINISHED'

                game.finish_state = {
                    reason: 'NO-MORE-ENEMIES',
                    winner: game.players[0],
                    word: game.word_to_guess
                }

                this.games = this.games.filter(x => x.id != game.id)
            }

            await this.sync_game_state(
                game.id
            )

            res.body = {
                success: true
            }
        })

        // Get the game state
        router.get('/v1/games/:gameID', async (req, res) => {
            // user has accepted game
            const user = req.query.key
            const game = await this.get_game(req.params.gameID)

            if (!game) {
                res.body = {
                    success: false,
                    error: 'This game does not exist'
                }
                res.status = 404
                return
            }

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
                    lobbyID: game.lobbyID,
                    nicknames: game.nicknames,
                    player_index,
                    yes: 'I know, please dont look at the word below. that is there for testing!',
                    word_to_guess: game.word_to_guess,
                    your_guesses: game.guesses[player_index],
                    enemy_guesses: game.guesses.filter((e, i) => i != player_index).map(rows => rows.map(row => row.map(r => game.state == 'FINISHED' ? r : r.split(':')[0] + ':?')))
                }
            }
        })

        // makes a guess for the current game
        // if all users have run out of guesses, it will fire the FINISHED state and mark everyone has losers 😏
        // if someone has a row with all greens, they win.
        router.post('/v1/games/:gameID/guess', async (req, res) => {
            // user has accepted game
            const data = req.body
            const user = req.query.key
            const game = await this.get_game(req.params.gameID)
            const player_index = game.players.indexOf(req.query.key)

            console.log(player_index, game.players)

            if (data.round >= 6) {
                res.body = {
                    success: false,
                    error: 'Cannot have more than 6 guesses'
                }
                res.status = 400
                return
            }

            if (game.guesses[player_index][parseInt(data.round)][0] != '') {
                res.body = {
                    success: false,
                    error: 'You have already guesed for this round.'
                }
                res.status = 400
                return
            }

            const word = data.letters.join('')

            if (!valid_words.find(x => x.toUpperCase() == word.toUpperCase())) {
                res.body = {
                    success: false,
                    error: `${word} is not a valid word in our dictionary!`
                }
                res.status = 400
                return
            }

            // convert the guess into `emoji:guess`
            // this is used to signal to the UI and the GameManager who has what guesses
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

            // check if all players have their boards filled in.
            const full_boards = game.guesses.filter(player_board => player_board.every(rows => rows.every(row => row != ''))).length

            if (full_boards == game.players.length) {
                // all boards are full, we need to kill the game with no one being the winner :(
                // we have a winner!!!
                game.state = 'FINISHED'

                game.finish_state = {
                    reason: 'OUT-OF-GUESSES',
                    winner: '',
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
                pending_state: this.pending,
                version: 2
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
                const party_size = parseInt(req.query['party-size'])

                var party = [
                    req.query.user_token,
                ]

                party = party.concat(this.pending.filter(x => x.user_token != req.query.user_token && x.party_size == party_size).slice(0, party_size - 1).map(x => x.user_token))

                if (party.length == party_size) {
                    // this is an actual user
                    // delay for WebSocket connections to be settled up first before sending the notification
                    await this.sleep(1)

                    await this.create_match(party)
    
                    this.pending = this.pending.filter(x => !party.includes(x.user_token))

                    res.body = { success: true }

                    return
                }
            }

            this.pending.push({
                user_token: req.query.user_token,
                party_size: parseInt(req.query['party-size']),
            })
            
            res.body = { success: true }
        })

        // create a new private lobby
        router.post('/v1/lobbies', async (req, res) => {
            const user = req.query.key

            const new_lobby = {
                id: `lobby_${nanoid()}`,
                creator: user,
                short_url: '',
                players: [],
                bans: [],
                nicknames: [],
                game_history: [],
            }
            
            const id = [
                Array.from({ length: 3 }).map(x => (Math.random() * 10).toFixed(0)).join(''),
                Array.from({ length: 3 }).map(x => (Math.random() * 10).toFixed(0)).join(''),
                Array.from({ length: 3 }).map(x => (Math.random() * 10).toFixed(0)).join('')
            ].join('-')

            new_lobby.short_url = `https://${this.frontend_host}/${id}`

            await this.env.ShortUrlKV.put(id, `https://${this.frontend_host}/lobbies/${new_lobby.id}`)

            this.lobbies.push(new_lobby)

            res.body = { success: true, lobby: new_lobby }
        })

        // get the lobbys metadata
        router.get('/v1/lobbies/:lobbyID', async (req, res) => {
            const user = req.query.key
            const lobby = await this.get_lobby(req.params.lobbyID)

            if (!lobby) {
                res.body = {
                    success: false,
                    code: 'NOT-FOUND',
                    error: 'This lobby does not exist or is already full'
                }
                res.status = 404
                return
            }

            const clone = JSON.parse(JSON.stringify(lobby))

            clone.player_index = lobby.players.indexOf(user)
            clone.is_owner = clone.creator == user
            delete clone.creator
            delete clone.players

            res.body = { success: true, 'lobby': clone }
        })

        // create a new private lobby
        router.post('/v1/lobbies/:lobbyID/join', async (req, res) => {
            const user = req.query.key
            const lobby = await this.get_lobby(req.params.lobbyID)

            if (!lobby) {
                res.body = {
                    success: false,
                    code: 'NOT-FOUND',
                    error: 'This lobby does not exist or is already full'
                }
                res.status = 404
                return
            }

            if (lobby.players.find(x => x == user)) {
                res.body = {
                    success: false,
                    code: 'ALREADY-IN-LOBBY',
                    error: 'You are already in this lobby'
                }
                res.status = 400
                return
            }
            
            lobby.players.push(user)
            lobby.nicknames.push(req.body.nickname || `Player ${lobby.players.length}` )

            await this.sleep(0.5)

            this.send_to_lobby(
                lobby.id,
                'LOBBY-PLAYER-UPDATE',
                {
                    lobby
                }
            )

            res.body = { success: true }
        })

        router.post('/v1/lobbies/:lobbyID/create-match', async (req, res) => {
            const user = req.query.key
            const lobby = await this.get_lobby(req.params.lobbyID)

            if (!lobby) {
                res.body = {
                    success: false,
                    code: 'NOT-FOUND',
                    error: 'This lobby does not exist or is already full'
                }
                res.status = 404
                return
            }

            if (user != lobby.creator) {
                res.body = {
                    success: false,
                    code: 'NOT-OWNER',
                    error: 'You are not the owner of this lobby and cannot start matches'
                }
                res.status = 403
                return
            }
        
            const game = await this.create_match(lobby.players, { skip_ready: true })

            const word = answer_words[~~(answer_words.length * Math.random())]

            game.word_to_guess = word.toUpperCase()

            // for us to save the results of this game too later.
            // this allows us to save it to the lobby game history
            game.lobbyID = lobby.id
            game.nicknames = JSON.parse(JSON.stringify( lobby.nicknames.map((nick, idx) => [idx, nick]) ))

            lobby.players = [] // kick everyone out so its clearer who has returned after the match!
            lobby.nicknames = []

            res.body = { success: true }
        })

        // leave the lobby
        router.post('/v1/lobbies/:lobbyID', async (req, res) => {
            const user = req.query.key
            const lobby = await this.get_lobby(req.params.lobbyID)

            if (!lobby) {
                res.body = {
                    success: false,
                    code: 'NOT-FOUND',
                    error: 'This lobby does not exist or is already full'
                }
                res.status = 404
                return
            }
            
            const index = lobby.players.indexOf(user)
            lobby.players = lobby.players.slice(index, 1)
            lobby.nicknames =  lobby.nicknames.slice(index, 1)

            this.send_to_lobby(
                lobby.id,
                'LOBBY-PLAYER-UPDATE',
                {
                    lobby
                }
            )

            res.body = { success: true, lobby }
        })

        router.post('/v1/lobbies/:lobbyID/nickname', async (req, res) => {
            const user = req.query.key
            const lobby = await this.get_lobby(req.params.lobbyID)

            if (!lobby) {
                res.body = {
                    success: false,
                    code: 'NOT-FOUND',
                    error: 'This lobby does not exist or is already full'
                }
                res.status = 404
                return
            }
            
            const index = lobby.players.indexOf(user)
            lobby.nicknames[index] = req.body.nickname

            this.send_to_lobby(
                lobby.id,
                'LOBBY-PLAYER-UPDATE',
                {
                    lobby
                }
            )

            res.body = { success: true, lobby }
        })
        
        try {
            return await router.handle(request)
        } catch (e) {
            const { event_id, posted } = captureError(
                'https://83cf15913dac433c94fa650c13f9c5a0@o225929.ingest.sentry.io/6424014',
                'production',
                '0',
                e,
                request,
                ''
            )

            await posted

            return response.json({
                success: false,
                error: 'Internal server error',
                event_id
            })
        }
    } 
}
