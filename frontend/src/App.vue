<template>
    <div class="bg-gray-900 min-h-screen">
        <header class="">
            <div class="mx-auto max-w-xl py-6">
                <router-link to="/" class="text-3xl font-extrabold text-primary-400">
                    👑 Wordle Royale
                </router-link>
            </div>
        </header>
        <main>
            <router-view />
        </main>
    </div>
</template>
