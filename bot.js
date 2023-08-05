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
     * @classdesc Makes Discord API requests
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
     * Command Bot to send a channel text
     * @public Accessible outside class
     * @method Chat
     * @param {String} channelID the id of the channel to send the text to
     * @param {String} msg what you want the bot to say
     */
    Chat(channelID, msg) {
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