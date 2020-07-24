### ⚠ WARNING: I will be constantly updating stuff and some features might not work yet ⚠ 
Please open an issue if you find any broken stuff

## HQ Trivia API
This is a Node.JS wrapper for HQ Trivia's API
[![MIT license](https://img.shields.io/badge/License-MIT-blue.svg)](https://lbesson.mit-license.org/)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://GitHub.com/Naereen/StrapDown.js/graphs/commit-activity)
[![forthebadge](https://forthebadge.com/images/badges/designed-in-ms-paint.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/as-seen-on-tv.svg)](https://forthebadge.com)

## Installation
`npm i hqtrivia-api-v2`
-or-
`yarn add hqtrivia-api-v2` (preferred)

## Handling errors
Most functions in this api wrapper return raw JSON responses, If any errors occur they usually come in the format:
```
{
    "error": "Error message (ex. "Authorization Not Found" for a invalid or unset bearer token)"
    "errorCode": someNumberz
}
```

## API Methods
- `hq.getUserData()` - Get the authenticated user data
- `hq.getShows()` - Get the game schedule
- `hq.getLeaderboard()` - Get the game leaderboard
- `hq.getUserById()` - Get user by ID
- `hq.searchUsers()` - Search users
- `hq.getFriends()` - Get all friends
- `hq.acceptFriendRequest(userId)` - Accept friend request
- `hq.addFriend(userId)` - Add friend
- `hq.getIncomingFriendRequests()` - Get incoming friend requests
- `hq.connectToGame()` - Connect to the game
- `hq.disconnectFromGame()` - Disconnect from the game
- `hq.getUpcomingSchedule()` - Get upcoming games schedule
- `hq.setToken(token)` - Sets token for requests
- `hq.changeUsername(username)` - Change username
- `hq.checkUsername(username)` - Check username
- `hq.makePayout(email)` - Make payout (Have not tested. I think hq uses a captcha for payouts. WILL FIX LATER)
- `hq.easterEgg()` - Gives you extra life (You can only use every 30 days)
- `hq.setReferral(referralCode, gameType ['general' = trivia referral, 'sports' = sports referral, 'words' = words referral] THEY ALL USE THE SAME REFERRAL CODE SYNTAX)` - Add a referral code to an account after register/login
- `hq.checkReferral()` - Check if a referral code is valid

## Registration methods
- `hq.sendCode(phone, [method])` - Sends the code to the specified phone
- `hq.confirmCode(code, [verificationId])` - Confirm code
- `hq.register(username, [referral], [verificationId])` - Register an account if it is not registered


## Trivia Game Methods
- `hq.sendAnswer(answerID, questionId)` - Send an answer to HQ
- `hq.sendSurveyAnswer(answerID, questionId)` - Send a survey answer to HQ
- `hq.useExtralive(questionId)` - Use extra live
- `hq.useEraser(questionId)` - Use eraser
- `hq.getErasers(friendIds)` - Get erasers

## Daily Trivia Methods
- `hq.connectToDailyTrivia()` - Returns a JSON object containing the gameUuid Which is needed to get the questions and send answers in the daily trivia. Also contains useful information such as the amount of erasers you have and the category of the trivia.

- `hq.getDailyTriviaQuestion(gameUuid)` - Returns a JSON object containing the question text and the possible answer choices. Also cointains the category of the question.

## Words Game Methods
- `hq.sendLetter(roundId, showId, letter)` - Send a letter to HQ
- `hq.sendWord(roundId, showId, word)` - Send a word to HQ

## Events
- `connected` - Called when successfully connected to the game (Words, Trivia)
- `disconnected` - Called when disconnected from the game (Words, Trivia)
- `question` - Called when a question is received from the server (Trivia)
- `questionClosed` - Called when a question is closed (Trivia)
- `questionSummary` - Called when the summary of a question is received from the server (Trivia)
- `questionFinished` - Called when question is finished (Trivia)
- `gameStatus` - Called when the game status is received from the server (Words, Trivia)
- `startRound` - Called when the round starts (Words)
- `letterReveal` - Called when letter reveal (Words)
- `endRound` - Called when round ends (Words)
- `showWheel` - Called when wheel shows (Words)
- `hideWheel` - Called when wheel becomes hidden (Words)
- `guessResponse` - Called after sending a letter or word (Words)

## Trivia Example
```js
const HQTrivia = require('hqtrivia-api')
const hq = new HQTrivia('[token]')

hq.connectToGame()

hq.on('connected', () => {
    console.log('Connected to HQ WS')
})

hq.on('question', (data) => { 
    console.log(`Question #${data.questionNumber}/${data.questionCount}`) // Question #3/12
    console.log(data.question) // In a jazz band, which instrument would be in the rhythm section?
    console.log(data.answers.map(answer => answer.text).join(' | ')) // Trombone | Guitar | Violin | 

    hq.sendAnswer(data.answers[1].answerId, data.questionId) // Sends the answer "Guitar"
})

hq.on('disconnected', (code) => {
    console.log('Disconnected from HQ WS')
})
```

## Words Example
```js
const HQTrivia = require('hqtrivia-api')
const hq = new HQTrivia('[token]')

hq.connectToGame()

hq.on('connected', () => {
    console.log('Connected to HQ WS')
})

hq.on('startRound', (data) => { 
    console.log(`Round Number #${data.roundNumber}/${data.totalRounds}`) // Round Number #9/10
    console.log(`Hint: ${data.hint}`) // Hint: Circus Performance
    console.log(`Puzzle: `) // Puzzle: 
    console.log(data.puzzleState.join(' | ')) // ******** | ******** | C********

    hq.sendWord(data.roundId, data.showId, 'JUGGLING') // Send the letters "J", "U", "G", ...etc
    hq.sendWord(data.roundId, data.showId, 'MULTIPLE') // Send the letters "M", "U", "L", ...etc
    hq.sendWord(data.roundId, data.showId, 'CHAINSAWS') // Send the letters "C", "H", "I", ...etc
    
    // or
    
    hq.sendLetter(data.roundId, data.showId, 'J') // Send the letter "J"
    hq.sendLetter(data.roundId, data.showId, 'U') // Send the letter "U"
    hq.sendLetter(data.roundId, data.showId, 'G') // Send the letter "G"
}) 

hq.on('disconnected', (code) => {
    console.log('Disconnected from HQ WS')
})
```

## Daily Trivia Example
```js
const HQTrivia = require('hqtrivia-api')
const hq = new HQTrivia('[token]')

dailyTrivia = hq.connectToDailyTrivia()
if (dailyTrivia.error) {
    console.error(`Error connecting to DailyTrivia\n$(dailyTrivia.error)\n$(dailyTrivia.errorCode)`)
} else {
    dailyTriviaUuid = dailyTrivia.gameUuid
    dailyTriviaQuestion = hq.getDailyTriviaQuestion(dailyTriviaUuid)
}
```

## Register Example
```js
const HQTrivia = require('hqtrivia-api')
const hq = new HQTrivia()

await hq.sendCode('+11111111111', [referral code])
const response = await hq.confirmCode('0228')
if (response.accountRegistred) {
    console.log(`token: ${response.token}`)
    hq.setToken(response.token)
} else {
    const token = await hq.register('name1', 'name2')
    console.log(`token: ${token}`)
    hq.setToken(token)
}
```
## Todo
- Add Daily Challenge ("offlineTrivia")
- Get link to video when joining game
- Add chat support
- Add app notification support
- Update some ws stuff
- Add some EPIC tests
