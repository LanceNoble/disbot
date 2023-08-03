import fetch from "node-fetch"

/**
 * Makes requests to Discord API
 */
export class Bot {
    #token
    #id
    #intents
    constructor(token, id, intents) {
        this.#token = token
        this.#id = id
        this.#intents = intents
    }
    /**
     * Make the bot send a text to a channel (NOT A DM).
     * The bot doesn't have to be connected to the gateway,
     * but it must be in the guild that it's sending a text to
     * with appropriate permissions (e.g. can Send Messages).
     * @param {int} channelID the id of the channel to send the text to
     * @param {string} msg what you want the bot to say
     */
    chat(channelID, msg) {
        this.#request(`channels/${channelID}/messages`, 'POST', {content: msg});
    }
    async #request(end, method = 'GET', body = undefined) {
        const options = { method: method }
        const headers = {
            'Authorization': `Bot ${this.#token}`,
            'User-Agent': 'DiscordBot (https://github.com/LanceNoble/bot, 1.0.0)'
        }
        if (body) {
            headers['Content-Type'] = 'application/json'
            options.body = JSON.stringify(body)
        }
        options.headers = headers
        const res = await fetch(`https://discord.com/api/v10/${end}`, options)
        console.log(res)
        const resJSON = await res.json()
        return resJSON
    }
}