import fetch from "node-fetch"

/**
 * Makes requests to Discord API
 */
export class Bot {
    #token

    /**
     * Creates a new instance of Bot
     * @param {string} token bot token found on your Discord application's page
     */
    constructor(token) {
        this.#token = token
    }

    /**
     * obtain gateway url
     * user should await this
     * @returns gateway url
     */
    async obtainGatewayURL() {
        let url = await this.#request('gateway/bot')
        url = url.url
        return url
    }

    /**
     * Make the bot send a text to a channel (NOT A DM).
     * The bot doesn't have to be connected to the gateway,
     * but it must be in the guild that it's sending a text to
     * with appropriate permissions (e.g. can Send Messages).
     * @param {string} channelID the id of the channel to send the text to
     * @param {string} msg what you want the bot to say
     */
    chat(channelID, msg) {
        this.#request(`channels/${channelID}/messages`, 'POST', {content: msg});
    }

    /**
     * A private helper function for making Discord API requests
     * @param {string} end 
     * @param {string} method 
     * @param {object} body 
     * @returns A promise that resolves to an object
     */
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
        console.log(`${res.status}: ${res.statusText}`)
        const resJSON = await res.json()
        return resJSON
    }
}