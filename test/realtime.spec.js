import test from "ava"
import { create } from "domain"
import { Miniflare } from "miniflare"
import WebSocket from 'ws'

const user_1_token = `usr_TEST_01`
const user_2_token = `usr_TEST_02`

test.beforeEach((t) => {
    // Create a new Miniflare environment for each test
    const mf = new Miniflare({
        // Autoload configuration from `.env`, `package.json` and `wrangler.toml`
        envPath: true,
        packagePath: true,
        wranglerConfigPath: true,
        // We don't want to rebuild our worker for each test, we're already doing
        // it once before we run all tests in package.json, so disable it here.
        // This will override the option in wrangler.toml.
        buildCommand: undefined,
    })
    t.context = { mf }
})

test('[LIVE] Server responds with PING after connecting', async (t) => {
    const { mf } = t.context

    t.plan(2)

    const res = await mf.dispatchFetch(
        `ws://api-dev.constellations.tech/v1/live/notifs:usr_M4EXATKFR3rR_6eqWCbzM`
    )

    // Force AVA to wait for our WS responses
    let resolve = null
    let reject = null
    const prom = new Promise((res, rej) => {
        resolve = res
        reject = rej
    })

    const webSocket = res.webSocket
    webSocket.accept()

    webSocket.addEventListener('open', () => {
        // Websocket didnt finish in time. Time out this test.
        setTimeout(() => {
            reject()
        }, 6000)
    })

    webSocket.addEventListener("message", (event) => {
        try {
            // would use CONST but thanks to scoping CONST breaks in try blocks *lmao*
            var data = JSON.parse(event.data)
        } catch (e) {
            t.fail('JSON parse failed on call to read from WS')
        }
        
        // PING is the Worker responding to the PING
        if (data.event == 'PING') {
            t.pass()
        }
        
        // PING-BACK is the DurableObject responding to the PING
        if (data.event == 'PING-BACK') {
            t.pass()
            resolve()
        }

        
    })
    
    webSocket.send("Hello Server!")

    await prom
})

test('[MATCHMAKING] Two users can find each other via ONE-VS-ONE', async (t) => {
    const { mf } = t.context

    // Force AVA to wait for our WS responses
    let resolve = null
    let reject = null
    const prom = new Promise((res, rej) => {
        resolve = res
        reject = rej
    })

    t.plan(2)

    const create_websocket = async (userID, on_msg) => {
        const res = await mf.dispatchFetch(
            `ws://api-dev.constellations.tech/v1/live/notifs:${userID}`
        )
    
        const webSocket = res.webSocket
        webSocket.accept()
    
        webSocket.addEventListener("message", (event) => {
            if (event.data.includes(userID)) {
                t.fail(`UserID was returned in the WS message: ${event.data}`)
                reject()
            }
            on_msg(JSON.parse(event.data))
        })
        
        webSocket.send("Hello Server!")
    }

    const found = [false, false]
    var game_id = ''

    const on_message = (usr_index) => {
        return (msg) => {
            if (msg.event == 'READY-CHECK') {
                // we found each other!
                if (!game_id) {
                    game_id = msg.parameters.game_id
                    t.pass()
                } else {
                    if (game_id != msg.parameters.game_id) {
                        t.fail(`Game ID does not match.`)
                        return
                    }

                    t.pass()
                    resolve()
                }
            }
        }
    }

    const user_1 = await create_websocket(
        'usr_test_1',
        on_message(0)
    )

    const user_2 = await create_websocket(
        'usr_test_2',
        on_message(1)
    )

    // ok send the join queue requests
    await mf.dispatchFetch(
        `https://internal.com/v1/join-queue?party-size=2`,
        { headers: { 'Authorization': 'usr_test_1' } }
    )
    
    await mf.dispatchFetch(
        `https://internal.com/v1/join-queue?party-size=2`,
        { headers: { 'Authorization': 'usr_test_2' } }
    )

    await prom
})

test('[MATCHMAKING] Four users can find each other via GROUP-MATCH', async (t) => {
    const { mf } = t.context

    // Force AVA to wait for our WS responses
    let resolve = null
    let reject = null
    const prom = new Promise((res, rej) => {
        resolve = res
        reject = rej
    })

    t.plan(4)

    const create_websocket = async (userID, on_msg) => {
        const res = await mf.dispatchFetch(
            `ws://api-dev.constellations.tech/v1/live/notifs:${userID}`
        )

        mf.dispatchFetch(
            `https://internal.com/v1/join-queue?party-size=4`,
            { headers: { 'Authorization': userID } }
        )
    
        const webSocket = res.webSocket
        webSocket.accept()
    
        webSocket.addEventListener("message", (event) => {
            if (event.data.includes(userID)) {
                t.fail(`UserID was returned in the WS message: ${event.data}`)
                reject()
            }
            on_msg(JSON.parse(event.data))
        })
        
        webSocket.send("Hello Server!")
        return webSocket
    }

    const sockets = []
    const found = [false, false, false, false]
    var game_id = ''

    const on_message = (usr_index) => {
        return (msg) => {
            if (msg.event == 'READY-CHECK') {
                // we found each other!
                if (!game_id) {
                    game_id = msg.parameters.game_id
                    t.pass()
                    found[usr_index] = true
                } else {
                    if (game_id != msg.parameters.game_id) {
                        t.fail(`Game ID does not match.`)
                        return
                    }

                    t.pass()

                    found[usr_index] = true

                    if (found.every(x => x)) {
                        sockets.map(x => x.close())
                        resolve()
                    }
                }
            }
        }
    }
    

    sockets.push(await create_websocket(
        'usr_test_1',
        on_message(0)
    ))

    sockets.push(await create_websocket(
        'usr_test_2',
        on_message(1)
    ))

    sockets.push(await create_websocket(
        'usr_test_3',
        on_message(2)
    ))

    sockets.push(await create_websocket(
        'usr_test_4',
        on_message(3)
    ))

    await prom
})

test('[MATCHMAKING] Users fail READY-CHECK after 10 seconds', async (t) => {
    const { mf } = t.context

    // Force AVA to wait for our WS responses
    let resolve = null
    let reject = null
    const prom = new Promise((res, rej) => {
        resolve = res
        reject = rej
    })

    t.plan(4)

    const create_websocket = async (userID, on_msg) => {
        const res = await mf.dispatchFetch(
            `ws://api-dev.constellations.tech/v1/live/notifs:${userID}`
        )
    
        const webSocket = res.webSocket
        webSocket.accept()
    
        webSocket.addEventListener("message", (event) => {
            on_msg(JSON.parse(event.data))
        })
        
        webSocket.send("Hello Server!")
    }

    const found = [false, false]
    const failed = [false, false]
    var game_id = ''

    const on_message = (usr_index) => {
        return (msg) => {
            if (msg.event == 'READY-CHECK') {
                // we found each other!
                if (!game_id) {
                    game_id = msg.parameters.game_id
                    t.pass()
                } else {
                    if (game_id != msg.parameters.game_id) {
                        t.fail(`Game ID does not match.`)
                        return
                    }

                    t.pass()
                }
            }

            if (msg.event == 'FAILED-READY-CHECK') {
                t.pass()

                failed[usr_index] = true

                if (failed.every(x => !!x)) {
                    resolve()
                }
            }
        }
    }

    const user_1 = await create_websocket(
        'usr_test_1',
        on_message(0)
    )

    const user_2 = await create_websocket(
        'usr_test_2',
        on_message(1)
    )

    // ok send the join queue requests
    await mf.dispatchFetch(
        `https://internal.com/v1/join-queue`,
        { headers: { 'Authorization': 'usr_test_1' } }
    )
    
    await mf.dispatchFetch(
        `https://internal.com/v1/join-queue`,
        { headers: { 'Authorization': 'usr_test_2' } }
    )

    await prom
})