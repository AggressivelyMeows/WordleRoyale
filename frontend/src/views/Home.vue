<template>
    <div class="max-w-xl mx-auto pb-24">
        <img class="w-full h-48 object-cover rounded-md mb-4 overflow-hidden" src="https://images.unsplash.com/photo-1537429149818-2d0e3e20857b?crop=entropy&cs=tinysrgb&fm=jpg&ixlib=rb-1.2.1&q=60&raw_url=true&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MzJ8fGFic3RyYWN0fGVufDB8MXwwfGJsYWNrfA%3D%3D&auto=format&fit=crop&w=900"/>
        <p class="text-gray-200 font-medium">
            The ultimate test in how good you really are at Wordle. Race against others to figure out the word the fastest, but be warned! You only have 6 guesses before its game over 💖
        </p>
        <router-link to="/find-match" class="button ~primary @high w-full mt-4">
            Jump into a match!
        </router-link>

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
