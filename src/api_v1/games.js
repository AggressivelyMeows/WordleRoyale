import router from '../router.js'

router.get(`/v${router.version}/games/:gameID`, async (req, res) => {
    res.body = await $api.game_manager.fetch(
        `http://internal/v1/games/${req.params.gameID}?key=${req.headers.get('Authorization')}`,
    ).then(resp => resp.json())
})

router.get(`/v${router.version}/games/:gameID/accept`, async (req, res) => {
    const state = await $api.game_manager.fetch(
        `http://internal/v1/games/${req.params.gameID}/accept?key=${req.headers.get('Authorization')}`,
    ).then(resp => resp.json())

    res.body = state
})

router.delete(`/v${router.version}/games/:gameID`, async (req, res) => {
    // user has left the page or game, mark them as deleted.
    const state = await $api.game_manager.fetch(
        `http://internal/v1/games/${req.params.gameID}/leave?key=${req.headers.get('Authorization')}`,
    ).then(resp => resp.json())

    res.body = state
})

router.post(`/v${router.version}/games/:gameID/guess`, async (req, res) => {
    const data = req.body

    res.body = await $api.game_manager.fetch(
        `http://internal/v1/games/${req.params.gameID}/guess?key=${req.headers.get('Authorization')}`,
        {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                letters: data.letters,
                round: data.round
            })
        }
    ).then(resp => resp.json())
})
