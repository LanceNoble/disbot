import WebSocket from "ws"
import { EventEmitter } from "node:events"

const BOT_VOICE_JOIN = 'botvoicejoin'
const VOICE_GATE_INFO = 'voicegateinfo'
const DEATH = 'death'
const EVENT = 'event'

/**
 * @author Lance Noble
 */
export class Messenger {
    #guildEvents = new EventEmitter()
    #wsEvents = new EventEmitter()

    #url
    #token
    #intents
    #id

    #s = null
    #session_id = null
    #resume_gateway_url = null
    #heartbeat_interval = null
    #timer = null
    #cycle = 0

    #ws

    /**
     * Creates a new Messenger
     * @param {String} url Gateway URL
     * @param {String} token Bot Token
     * @param {Int} intents Bitwise Gateway Intents
     * @param {String} id App ID
     * @class 
     * @classdesc Relays guild events
     */
    constructor(url, token, intents, id) {
        this.#url = url
        this.#token = token
        this.#intents = intents
        this.#id = id
    }

    get Emitter() { return this.#guildEvents }

    /**
     * Connects messenger instance to gateway
     */
    Connect() {
        this.#ws = new WebSocket(this.#url)
        this.#ws.addEventListener('error', (event) => { console.log(`gate error: ${event}`) })
        this.#ws.addEventListener('open', () => {
            console.log(`gate open`)
            if (this.#ws.url === this.#url) this.#Reset()
            else this.#SendPayload(6)
        }, { once: true })
        this.#ws.addEventListener('message', (event) => {
            const payload = JSON.parse(event.data)
            console.log('gate message: ')
            console.log(payload)

            this.#s = payload.s
            if (payload.op === 10) {
                this.#heartbeat_interval = payload.d.heartbeat_interval
                setTimeout(() => {
                    this.#Beat()
                    setInterval(() => { this.#Beat() }, this.#heartbeat_interval)
                }, this.#heartbeat_interval * Math.random())
            }
            else if (payload.op === 11) {
                this.#cycle === 0 ? this.#SendPayload(2) : () => { }
                this.#cycle++
            }
            else if (payload.op === 1) this.#Beat()
            else if (payload.t === 'READY') {
                this.#session_id = payload.d.session_id
                this.#resume_gateway_url = payload.d.resume_gateway_url
            }

            else if (payload.op === 7) this.#ws.close()
            else if (payload.op === 9) !payload.d ?
                this.#ws.close(4016, 'invalid session: false')
                : this.#ws.close(4017, 'invalid session: true')

            else if (payload.t === 'VOICE_STATE_UPDATE'
                && payload.d.user_id === this.#id
                && payload.d.channel_id) {
                this.#wsEvents.emit(BOT_VOICE_JOIN, payload.d.session_id)
            }
            else if (payload.t === 'VOICE_SERVER_UPDATE') {
                this.#wsEvents.emit(VOICE_GATE_INFO, payload.d)
            }

            else {
                this.#guildEvents.emit(EVENT, payload)
            }
        })
        this.#ws.addEventListener('close', (event) => {
            console.log(`gate close: ${event}`)
            if (!event.code
                || event.code >= 4000 && event.code <= 4003
                || event.code >= 4005 && event.code <= 4009) {
                this.Connect(this.#resume_gateway_url)
                return
            }
            this.#guildEvents.emit(DEATH)
        })
    }

    /**
     * 
     * @async
     * @param {String} guildID 
     * @param {String} channelID 
     * @param {Boolean} selfMute 
     * @param {Boolean} selfDeaf 
     */
    async JoinVoice(guildID, channelID, selfMute, selfDeaf) {
        let voiceSessionID
        this.#wsEvents.once(BOT_VOICE_JOIN, (session_id) => {
            voiceSessionID = session_id
        })
        const promise = new Promise((resolve, reject) => {
            this.#wsEvents.once(VOICE_GATE_INFO, (info) => {
                resolve({
                    token: info.token,
                    voice_session_id: voiceSessionID,
                    guild_id: info.guild_id,
                    endpoint: info.endpoint
                })
            })
        })
        this.#SendPayload(4, guildID, channelID, selfMute, selfDeaf)
        return promise
    }

    /**
     * sends heartbeat to gateway
     */
    #Beat() {
        this.#SendPayload(1)
        const prevCyc = this.#cycle
        setTimeout(() => {
            this.#cycle === prevCyc ?
                this.#ws.close(4015, 'heartbeat not received')
                : () => { }
        }, this.#heartbeat_interval)
    }

    /**
     * reset messenger's gateway connection information
     */
    #Reset() {
        this.#s = null
        this.#session_id = null
        this.#resume_gateway_url = null
        this.#cycle = 0
        this.#heartbeat_interval = null
        clearInterval(this.#timer)
        this.#timer = null
    }

    /**
     * send payload to gateway
     * @param {int} op 
     */
    #SendPayload(op, guildID, channelID, selfMute, selfDeaf) {
        const payload = { op: op }
        if (op === 1) {
            payload['d'] = this.#s
        }
        else if (op === 2) {
            payload['d'] = {
                token: this.#token,
                properties: {
                    os: 'windows',
                    browser: 'disbot',
                    device: 'disbot'
                }
            }
            payload['intents'] = this.#intents
        }
        else if (op === 4) {
            if (!guildID || !channelID) return
            selfMute ? selfMute = true : selfMute = false
            selfDeaf ? selfDeaf = true : selfDeaf = false
            payload['d'] = {
                guild_id: guildID,
                channel_id: channelID,
                self_mute: selfMute,
                self_deaf: selfDeaf,
            }
        }
        else if (op === 6) {
            payload['d'] = {
                token: this.#token,
                session_id: this.#session_id,
                seq: this.#s
            }
        }
        this.#ws.send(JSON.stringify(payload))
    }
}