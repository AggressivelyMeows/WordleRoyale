import router from '../router.js'

// create a new private game
router.post(`/v1/lobbies`, async (req, res) => {
    const state = await $api.game_manager.post(
        `/lobbies?key=${req.headers.get('Authorization')}`,
    )

    res.body = state.data
    res.status = state.status
})

router.get(`/v1/lobbies/:lobbyID`, async (req, res) => {
    const state = await $api.game_manager.get(
        `/lobbies/${req.params.lobbyID}?key=${req.headers.get('Authorization')}`,
    )

    res.body = state.data
    res.status = state.status
})

router.post(`/v1/lobbies/:lobbyID/join`, async (req, res) => {
    const state = await $api.game_manager.post(
        `/lobbies/${req.params.lobbyID}/join?key=${req.headers.get('Authorization')}`,
        {
            nickname: req.body.nickname || ''
        }
    )

    res.body = state.data
    res.status = state.status
})

router.post(`/v1/lobbies/:lobbyID/create-match`, async (req, res) => {
    const state = await $api.game_manager.post(
        `/lobbies/${req.params.lobbyID}/create-match?key=${req.headers.get('Authorization')}`
    )

    res.body = state.data
    res.status = state.status
})

router.post(`/v1/lobbies/:lobbyID/nickname`, async (req, res) => {
    const state = await $api.game_manager.post(
        `/lobbies/${req.params.lobbyID}/nickname?key=${req.headers.get('Authorization')}`,
        {
            nickname: req.body.nickname
        }
    )

    res.body = state.data
    res.status = state.status
})