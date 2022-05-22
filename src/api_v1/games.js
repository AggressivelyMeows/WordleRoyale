import router from '../router.js'

router.get(`/v${router.version}/games/:gameID`, async (req, res) => {
    const state = await $api.game_manager.get(
        `/games/${req.params.gameID}?key=${req.headers.get('Authorization')}`,
    )

    res.body = state.data
    res.status = state.status
})

router.get(`/v${router.version}/games/:gameID/accept`, async (req, res) => {
    const state = await $api.game_manager.get(
        `/games/${req.params.gameID}/accept?key=${req.headers.get('Authorization')}`,
    )

    res.body = state.data
    res.status = state.status
})

router.delete(`/v${router.version}/games/:gameID`, async (req, res) => {
    // user has left the page or game, mark them as deleted.
    const state = await $api.game_manager.get(
        `/games/${req.params.gameID}/leave?key=${req.headers.get('Authorization')}`,
    )

    res.body = state.data
    res.status = state.status
})

router.post(`/v${router.version}/games/:gameID/guess`, async (req, res) => {
    const data = req.body

    const resp = await $api.game_manager.post(
        `http://internal/v1/games/${req.params.gameID}/guess?key=${req.headers.get('Authorization')}`,
        {
            letters: data.letters,
            round: data.round
        }
    )

    res.body = resp.data
    res.status = resp.status
})
