<template>
    <div class="max-w-xl mx-auto pb-24">
        <img class="w-full h-48 object-cover rounded-md mb-4 overflow-hidden" src="https://images.unsplash.com/photo-1537429149818-2d0e3e20857b?crop=entropy&cs=tinysrgb&fm=jpg&ixlib=rb-1.2.1&q=60&raw_url=true&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MzJ8fGFic3RyYWN0fGVufDB8MXwwfGJsYWNrfA%3D%3D&auto=format&fit=crop&w=900"/>
        
        <p class="text-gray-200 font-medium">
            The ultimate test in how good you really are at Wordle. Race against others to figure out the word the fastest, but be warned! You only have 6 guesses before its game over 💖
        </p>

        <router-link to="/find-match?party-size=4" class="button ~primary @high w-full mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Jump into a match!
        </router-link>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mt-1">
            <router-link to="/find-match?party-size=2" class="button ~primary @high w-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                One-Vs-One
            </router-link>

            <router-link to="/" disabled class="button ~primary @high w-full disabled:opacity-75">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Vs AI
            </router-link>
            
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mt-2">
            <a @click="create_private_lobby" class="button ~primary @high w-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Create private lobby
            </a>

            <router-link to="/meta/qr-code" class="button ~primary @high w-full">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Join lobby via QR
            </router-link>
        </div>

        <div class="rounded-md p-4 text-gray-200 font-bold my-8 space-y-6" style="background:url(https://payloadcms.com/images/speckled-black.jpg);background-position:center;">
            <div class="">
                <b class="text-primary-400">Wordful</b> is the greatest Wordle clone of them all.
                <p class="text-sm text-gray-300">
                    ~ Cerulean
                </p>
            </div>
            <div>
                <b class="text-primary-400">Wordful</b> is the greatest Wordle clone of them all.
                <p class="text-sm text-gray-300">
                    ~ Cerulean
                </p>
            </div>
            <div class="">
                <b class="text-primary-400">Wordful</b> is the greatest Wordle clone of them all.
                <p class="text-sm text-gray-300">
                    ~ Cerulean
                </p>
            </div>
        </div>


        <div class="mt-4">
            <h4 class="text-3xl text-primary-400 font-extrabold">
                What is Wordful?
            </h4>
            
            <p class="text-gray-200 text-sm mt-2">
                A one-vs-one match to find out whos faster at Wordle. Our matchmaking system allows you to get into a game fast and painless. Just hit the button above to get started! This is a prototype and some functions or features may break or be removed in the final build.
            </p>

            <h4 class="text-3xl text-primary-400 font-extrabold mt-4">
                Why?
            </h4>
            <p class="text-gray-200 text-sm mt-2">
                Wordful was created as part of the Cloudflare spring challenge, to create something innovative that uses their product stack. I had the idea for a multiplayer Wordle for months but didnt have the time to put together a prototype. Now, its finally here! Welcome to Wordful.
            </p>
        </div>
    </div>
</template>

<script>
    export default {
        data: () => ({
            loading_private: false,
        }),
        methods: {
            create_private_lobby() {
                this.loading_private = true

                fetch('https://wordle-royale.sponsus.workers.dev/v1/lobbies', { method: 'post', headers: { Authorization: 'usr_111' } }).then(r => r.json()).then(console.log)

                this.$api.fetch(`/lobbies`, {
                    method: 'POST'
                }).then(r=>r.json()).then(resp => {
                    this.$router.push(`/lobbies/${resp.lobby.id}`)
                }).finally(() => this.loading_private = false)
            }
        }
    }
</script>