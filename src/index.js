const axios = require('axios')
const {EventEmitter} = require('events')
const WebSocket = require('ws')

class HQTrivia extends EventEmitter {

    constructor(token = '', apiURL = 'https://api-quiz.hype.space') {
        super()
        this.token = token
        this.headers = {
            'x-hq-client': 'Android/1.49.9',
            'x-hq-country': 'US',
            'x-hq-lang': 'en',
            'x-hq-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            ...this.token ? {'authorization': `Bearer ${token}`} : {},
            'accept-encoding': 'identity'
        }
        this.axios = axios.create({
            baseURL: apiURL,
            headers: this.headers,
            validateStatus: false
        })
        this.lastQuestion = {}
    }

    setToken(token) {
        this.headers = {
            'user-agent': 'Android/1.49.9',
            'x-hq-client': 'Android/1.49.9',
            'x-hq-country': 'US',
            'x-hq-lang': 'en',
            'x-hq-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            'authorization': `Bearer ${token}`,
            'accept-encoding': 'identity'
        }
        this.token = token
    }

    async sendCode(phone, method = 'sms') {
        const sendCodeRes = await this.axios.post('/verifications', {
            phone: phone,
            method: method
        })

        this.verificationId = sendCodeRes.data.verificationId
        return {
            success: !!sendCodeRes.data.verificationId,
            verificationId: sendCodeRes.data.verificationId
        }
    }

    async confirmCode(code, verificationId = this.verificationId) {
        const confirmCodeRes = await this.axios.post(`verifications/${verificationId}`, {
            code: code
        })

        if (confirmCodeRes.data.auth === null) {
            return {
                success: true,
                accountRegistred: false
            }
        } else if (confirmCodeRes.data.accessToken) {
            return {
                success: true,
                accountRegistred: true,
                token: confirmCodeRes.data.accessToken
            }
        } else if (confirmCodeRes.data.auth.accessToken) {
            return {
                success: true,
                accountRegistred: true,
                token: confirmCodeRes.data.auth.accessToken
            }
        } else {
            return { error: 'Unknown API Error', errorCode: 0 }
        }
    }

    async register(username, referral = null, verificationId = this.verificationId) {
        const registerRes = await this.axios.post('/users', {
            country: 'MQ==',
            language: 'us',
            referringUsername: referral,
            username: username,
            verificationId: verificationId
        })

        if (registerRes.data.error) {
            return registerRes.data
        }

        if (registerRes.data.accessToken) {
            return registerRes.data.accessToken
        } else {
            return { error: 'Unknown API Error', errorCode: 0 }
        }
    }

    async getUserData() {
        const userDataRes = await this.axios.get('/users/me')
        return userDataRes.data
    }

    async getConfig() {
        const configDataRes = await this.axios.get('/config')
        return configDataRes.data
    }

    async getShows() {
        const shows = await this.axios.get('/shows/schedule')
        return shows.data
    }

    async getLeaderboard() {
        const leaderboard = await this.axios.get('/users/leaderboard')
        return leaderboard.data
    }

    async getUserById(id) {
        const userInfo = await this.axios.get(`/users/${id}`)
        return userInfo.data
    }

    async getPayoutsInfo() {
        const payoutsInfo = await this.axios.get('/users/me/payouts')
        return payoutsInfo.data
    }

    async makePayout(email) {
        const makePayout = await this.axios.post('/users/me/payouts', {
            email: email
        })
        return makePayout.data
    }

    async changeUsername(username) {
        const changeUsernameResp = await this.axios.patch('/users/me', {
            username: username
        })
        return changeUsernameResp.data
    }

    async checkUsername(username) {
        const checkUsernameResp = await this.axios.post('/usernames/available', {
            username: username
        })
        return checkUsernameResp.data
    }

    async easterEgg(type = 'makeItRain') {
        const easterEggResp = await this.axios.post(`/easter-eggs/${type}`)
        return easterEggResp.data
    }

    async searchUsers(query) {
        const searchUserRes = await this.axios.get(`/users?q=${encodeURIComponent(query)}`)
        const users = await Promise.all(searchUserRes.data.data.map(async userInfo => {
            const userRes = await this.getUserById(userInfo.userId)
            return userRes
        }))

        return users
    }

    async getFriends() {
        const friendsResp = await this.axios.get('/friends')
        const friends = await Promise.all(friendsResp.data.data.map(async userInfo => {
            const userRes = await this.getUserById(userInfo.userId)
            return userRes
        }))
        return friends
    }

    async acceptFriendRequest(userId) {
        const acceptFriendRes = await this.axios.put(`/friends/${userId}/status`, {
            status: 'ACCEPTED'
        })
        return acceptFriendRes.data.status === 'ACCEPTED'
    }

    async getUpcomingSchedule() {
        const leaderboard = await this.axios.get('/shows/schedule')
        return leaderboard.data.shows
    }

    async addFriend(userId) {
        const addFriendRes = await this.axios.post(`/friends/${userId}/requests`)
        return addFriendRes.data.status === 'PENDING'
    }

    async getIncomingFriendRequests() {
        const friendsResp = await this.axios.get('/friends/requests/incoming')
        const friends = await Promise.all(friendsResp.data.data.map(async userInfo => {
            const userRes = await this.getUserById(userInfo.userId)
            return userRes
        }))
        return friends
    }

    sendAnswer(answerID, questionId) {
        if (!this.WSConn || this.WSConn.readyState !== WebSocket.OPEN) return {error: 'You are not connected to the game'}
        if (this.gameType !== 'trivia') return {error: 'You can not send a letter because this game is not Trivia'}
        this.WSConn.send(JSON.stringify({
            questionId: parseInt(questionId),
            type: 'answer',
            answerId: parseInt(answerID)
        }))
    }

    sendSurveyAnswer(answerID, questionId) {
        if (!this.WSConn || this.WSConn.readyState !== WebSocket.OPEN) return {error: 'You are not connected to the game'}
        if (this.gameType !== 'trivia') return {error: 'You can not send a letter because this game is not Trivia'}
        this.WSConn.send(JSON.stringify({
            surveyQuestionId: parseInt(questionId),
            type: 'surveyAnswer',
            surveyAnswerId: parseInt(answerID),
            broadcastId: this.broadcastId
        }))
    }

    useEraser(questionId) {
        if (!this.WSConn || this.WSConn.readyState !== WebSocket.OPEN) return {error: 'You are not connected to the game'}
        if (this.gameType !== 'trivia') return {error: 'You can not send a letter because this game is not Trivia'}
        this.WSConn.send(JSON.stringify({
            type: 'erase1',
            broadcastId: this.broadcastId,
            questionId: parseInt(questionId)
        }))
    }

    checkpoint(winNow, checkpointId) {
        if (!this.WSConn || this.WSConn.readyState !== WebSocket.OPEN) return {error: 'You are not connected to the game'}
        if (this.gameType !== 'trivia') return {error: 'You can not send a letter because this game is not Trivia'}
        this.WSConn.send(JSON.stringify({
            type: 'checkpointResponse',
            broadcastId: this.broadcastId,
            winNow: winNow,
            checkpointId: parseInt(checkpointId)
        }))
    }

    useExtralife(questionId) {
        if (!this.WSConn || this.WSConn.readyState !== WebSocket.OPEN) return {error: 'You are not connected to the game'}
        if (this.gameType !== 'trivia') return {error: 'You can not send a letter because this game is not Trivia'}
        this.WSConn.send(JSON.stringify({
            type: 'useExtraLife',
            questionId: parseInt(questionId)
        }))
    }

    sendLetter(roundId, showId, letter) {
        if (!this.WSConn || this.WSConn.readyState !== WebSocket.OPEN) return {error: 'You are not connected to the game'}
        if (this.gameType !== 'words') return {error: 'You can not send a letter because this game is not Words'}
        this.WSConn.send(JSON.stringify({
            roundId: parseInt(roundId),
            type: 'guess',
            showId: parseInt(showId),
            letter: letter.toUpperCase()
        }))
    }

    sendWord(roundId, showId, word) {
        if (!this.WSConn || this.WSConn.readyState !== WebSocket.OPEN) return {error: 'You are not connected to the game'}
        if (this.gameType !== 'words') return {error: 'You can not send a letter because this game is not Words'}
        const letters = word.split('')
        letters.forEach((letter) => {
            this.sendLetter(roundId, showId, letter)
        })
    }

    getErasers(friendIds) {
        if (!this.WSConn || this.WSConn.readyState !== WebSocket.OPEN) return {error: 'You are not connected to the game'}
        this.WSConn.send(JSON.stringify({
            type: 'erase1Earned',
            broadcastId: this.broadcastId,
            friendsIds: friendIds
        }))
    }

    chatVisibility(chatState) {
        if (!this.WSConn || this.WSConn.readyState !== WebSocket.OPEN) return {error: 'You are not connected to the game'}
        this.WSConn.send(JSON.stringify({
            type: 'chatVisibilityToggled',
            broadcastId: this.broadcastId,
            chatVisible: chatState
        }))
    }

    async showReferrals() {
        const referralRes = await this.axios.get('/show-referrals')
        return referralRes.data
    }

    async checkReferral(referralCode) {
        const sendCheck = await this.axios.post('/referral-code/valid', {
            referralCode: referralCode
        })
        return !sendCheck.data.error
    }

    async setReferral(referralCode, gameType) {
        const sendReferral = await this.axios.post(`/show-referrals/$(gameType)`, {
            username: referralCode
        })

        if (sendReferral.data.error) {
            return sendReferral.data
        }
        return !!sendReferral.data.success
    }

    async connectToDailyTrivia() {
        let dailyTriviaUrl = 'https://api-quiz.hype.space/offair-trivia/start-game'
        const dailyTriviaRes = this.axios.post(dailyTriviaUrl)
        return dailyTriviaRes.data
    }

    async getDailyTriviaQuestion(gameUuid) {
        let dailyTriviaQuestion = await this.axios.get(`https://api-quiz.hype.space/offair-trivia/${gameUuid}`)
        return dailyTriviaQuestion.data
    }

    async sendDailyTriviaAnswer(gameUuid, offairAnswerId) {
        let dailyTriviaQuestion = await this.axios.post(`https://api-quiz.hype.space/offair-trivia/${gameUuid}`, {
            offairAnswerId: offairAnswerId
        })
        return dailyTriviaQuestion.data
    }

    async connectToGame() {
        let shows = {}
        shows = await this.getShows()
        if (!shows.active) return {error: 'Game is not active'}

        this.WSConn = new WebSocket(shows.broadcast.socketUrl, {
            headers: this.headers
        })
        let pingInterval

        this.WSConn.on('open', () => {
            pingInterval = setInterval(this.WSConn.ping, 5000)
            this.broadcastId = parseInt(shows.broadcast.broadcastId)
            if (shows.nextShowVertical === 'words') {
                this.gameType = 'words'
                this.WSConn.send(JSON.stringify({
                    type: 'subscribe',
                    broadcastId: shows.broadcast.broadcastId,
                    gameType: 'words'
                }))
            } else {
                this.gameType = 'trivia'
            }
            this.emit('connected', {
                gameType: this.gameType
            })
        })

        this.WSConn.on('close', (code) => {
            this.emit('disconnected', code)
            clearInterval(pingInterval)
        })

        this.WSConn.on('message', (rawData) => {
            const data = JSON.parse(rawData)
            this.emit('message', data)
            this.emit(data.type, { // data.type = eventName
                ...data,
                lastQuestion: this.lastQuestion
            })
            if (data.type === 'question' || data.type === 'startRound') {
                this.lastQuestion = data
            }
        })

        return this.WSConn
    }

    async disconnectFromGame() {
        if (!this.WSConn || this.WSConn.readyState !== WebSocket.OPEN) return {error: 'You are not connected to the game'}
        this.WSConn.close()
    }
}

module.exports = HQTrivia
