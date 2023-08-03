import WebSocket from "ws"
import { EventEmitter } from "events"

/**
 * Notifies user about discord server events in real time
 */
export class Messenger {
    #eventEmitter = new EventEmitter()

    #wssURL
    #token
    #intents

    #sequence = null
    #sessionID = null
    #resumeURL = null
    #cycle = 0
    #heartbeatInterval = null
    #timer = null

    #ws

    /**
     * Creates a new instance of Messenger
     * @param {string} url gateway url
     * @param {string} token bot token
     * @param {int} intents gateway intents
     */
    constructor(url, token, intents) {
        this.#wssURL = url
        this.#token = token
        this.#intents = intents
    }

    get emitter() { return this.#eventEmitter }

    /**
     * Connects messenger instance to gateway
     */
    connect() {
        this.#ws = new WebSocket(this.#wssURL)
        this.#ws.addEventListener('error', (event) => { console.log(`gate error: ${event}`) })
        this.#ws.addEventListener('open', () => {
            console.log(`gate open`)
            if (this.#ws.url === this.#wssURL) this.#reset()
            else this.#sendPayload(6)
        }, { once: true })
        this.#ws.addEventListener('message', (event) => {
            const payload = JSON.parse(event.data)
            console.log(`gate message: ${payload.op}\n`)
            payload.t ? console.log(`event name: ${payload.t}`) : () => { }
            this.#sequence = payload.s
            if (payload.op === 10) {
                this.#heartbeatInterval = payload.d.heartbeat_interval
                setTimeout(() => {
                    this.#beat()
                    setInterval(() => { this.#beat() }, this.#heartbeatInterval)
                }, this.#heartbeatInterval * Math.random())
            }
            else if (payload.op === 11) {
                this.#cycle === 0 ? this.#sendPayload(2) : () => { }
                this.#cycle++
            }
            else if (payload.op === 1) this.#beat()
            else if (payload.t === 'READY') {
                this.#sessionID = payload.d.session_id
                this.#resumeURL = payload.d.resume_gateway_url
            }
            else if (payload.op === 7) this.#ws.close()
            else if (payload.op === 9) !payload.d ? this.#ws.close(4016, 'invalid session: false') : this.#ws.close(4017, 'invalid session: true')
            else this.#eventEmitter.emit('event', payload.d)
        })
        this.#ws.addEventListener('close', (event) => {
            if (!event.code || event.code >= 4000 && event.code <= 4003 || event.code >= 4005 && event.code <= 4009) {
                this.connect(this.#resumeURL)
                return
            }
            this.#eventEmitter.emit('reconnect')
        })
    }

    /**
     * sends heartbeat to gateway
     */
    #beat() {
        this.#sendPayload(1)
        const prevCyc = this.#cycle
        setTimeout(() => {
            this.#cycle === prevCyc ? this.#ws.close(4015, 'heartbeat not received') : () => { }
        }, this.#heartbeatInterval)
    }

    /**
     * reset messenger's gateway connection information
     */
    #reset() {
        this.#sequence = null
        this.#sessionID = null
        this.#resumeURL = null
        this.#cycle = 0
        this.#heartbeatInterval = null
        clearInterval(this.#timer)
        this.#timer = null
    }

    /**
     * send payload to gateway
     * @param {int} op 
     */
    #sendPayload(op) {
        const payload = { op: op }
        if (op === 1) {
            payload['d'] = this.#sequence
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
        else if (op === 6) {
            payload['d'] = {
                token: this.#token,
                session_id: this.#sessionID,
                seq: this.#sequence
            }
        }
        this.#ws.send(JSON.stringify(payload))
    }
}