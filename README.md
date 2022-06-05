# 👑 Wordful - The multiplayer Wordle
*Powered by Cloudflare's Workers™ platform for their Spring Developers Challenge*

![](https://images.weserv.nl/?url=https://nyc3.digitaloceanspaces.com/cerulean/screenshots/2022/05/Screen%20Shot%202022-05-23%20at%2014.37.21.png&h=200&w=700&fit=cover)

Play against friendly strangers across the world in this fast paced rendition of Wordle.

*In theory, this thing can widthstand a lot of players before slowing down, however if it does start breaking, i'll invest into the platform to grant it more resources*

## Todo:
- Accounts: For saving and retreieving games and statistics
    - Win rate
    - Round speed
    - Potentially MMR (if we want to do MMR based matchmaking, see below)
    - User profiles

## Notes about MMR
The big first question about MMR matchmaking is how are we going to base MMR on a basic Wordle game? My first instinct is to use some kind of system to track guess speed, correct guesses in a single round (other than winning), the amount of rounds it too, and win rate.

Each win giving at minium 10 MMR points
```js
const mmr = 10 + ( 6 - Round number ) / ( Average seconds to complete round / 100 )

// If a user completes the game within 3 rounds, with an average round time of 35 seconds:
const mmr = 10 + (6 - 3) / (35 / 100) = 18
// If a user did it in 5 rounds:
const mmr = 10 + (6 - 5) / (35 / 100) = 12
// Got a super lucky hit, second round in 20 seconds:
const mmr = 10 + (6 - 2) / (20 / 100) = 30
```

Each loss taking 20 points, but this can be reduced by how many green squares you have at the end of the game. Down to a minium of -5 MMR loss.