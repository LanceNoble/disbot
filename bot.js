import fetch from "node-fetch"

/**
 * @author Lance Noble
 */
export class Bot {
    #token

    /**
     * Creates a new Bot
     * @param {String} token Bot Token
     * @class 
     * @classdesc Makes requests to Discord's API
     */
    constructor(token) {
        this.#token = token
    }

    /**
     * Request a Gateway URL from Discord's API
     * @async Should be awaited
     * @public 
     * @method GetGateURL
     * @returns {Promise<String>} Gateway URL
     */
    async GetGateURL() {
        let url = await this.#Request('gateway/bot')
        url = url.url
        return url
    }

    /**
     * Make the bot send a text to a channel (NOT A DM).
     * The bot doesn't have to be connected to the gateway,
     * but it must be in the guild that it's sending a text to
     * with appropriate permissions (e.g. can Send Messages).
     * @param {String} channelID the id of the channel to send the text to
     * @param {String} msg what you want the bot to say
     */
    chat(channelID, msg) {
        this.#Request(`channels/${channelID}/messages`, 'POST', {content: msg});
    }

    /**
     * Makes requests to Discord's API
     * @async Should be awaited
     * @private Only accessible within this class
     * @method Request
     * @param {String} end The endpoint of the requested resource
     * @param {String} method The request's method
     * @param {Object} body The request's body
     * @returns {Promise<Object>} The response's body
     */
    async #Request(end, method = 'GET', body = null) {
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