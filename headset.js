import WebSocket from "ws"
import dgram from 'node:dgram'
import sodium from 'sodium-native'

import * as fs from 'node:fs'
import disopusdef from "@discordjs/opus"

const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe])
const CHANNELS = 2
const TIMESTAMP_INC = (48000 / 2) * CHANNELS
const MAX_NONCE_SIZE = 2 ** 32 - 1
const ENCRYPTION_MODE = 'xsalsa20_poly1305'

const { OpusEncoder } = disopusdef
const encoder = new OpusEncoder(48000,2)
const buf = fs.readFileSync('perfect-fart.mp3')
const audioBuffer = Buffer.alloc(7680).fill(buf)
audioBuffer.fill(SILENCE_FRAME, buf.length)
console.log(audioBuffer)
const encoded = encoder.encode(audioBuffer)
console.log(encoded)

export class Headset {
    #ws
    #udp

    #session_id
    #token
    #endpoint
    #server_id
    #app_id
    
    #sequence = randomNBit(16)
    #timestamp = randomNBit(32)
    #ssrc
    #secret_key

    #nonce = Buffer.alloc(24)

    constructor(session_id, token, endpoint, server_id, app_id) {
        this.#session_id = session_id
        this.#token = token
        this.#endpoint = endpoint
        this.#server_id = server_id
        this.#app_id = app_id
    }

    Connect() {
        this.#ws = new WebSocket(`wss://${this.#endpoint}/?v=4&encoding=json`)
        this.#ws.addEventListener('error', (event) => { console.log(`voice gate error: ${event}`) })
        this.#ws.addEventListener('open', () => {
            this.#ws.send(JSON.stringify({
                op: 0,
                d: {
                    server_id: this.#server_id,
                    user_id: this.#app_id,
                    session_id: this.#session_id,
                    token: this.#token
                }
            }))
        })
        this.#ws.addEventListener('message', (event) => {
            const payload = JSON.parse(event.data)
            console.log('voice gate message: ')
            console.log(payload)

            if (payload.op === 2) {
                this.#ssrc = payload.d.ssrc
                this.#udp = dgram.createSocket('udp4')
                this.#udp.connect(payload.d.port, payload.d.ip, () => {
                    const address = this.#udp.address()
                    console.log(`udp connect on ${address.address}:${address.port}`)
                    // ip discovery
                    const packet = Buffer.alloc(74)
                    packet.writeUInt16BE(1, 0)
                    packet.writeUInt16BE(70, 2)
                    packet.writeUInt32BE(this.#ssrc, 4)
                    this.#udp.send(packet)
                })
                this.#udp.on('message', (msg, rinfo) => {
                    console.log(`server got: ${msg} from ${rinfo}`)
                    console.log(msg)
                    console.log(Buffer.from(msg).toJSON())
                    if (msg.readUInt16BE(0) === 2) {
                        this.#ws.send(JSON.stringify({
                            op: 1,
                            d: {
                                protocol: 'udp',
                                data: {
                                    address: msg.toString('utf8', 8, 64),
                                    port: msg.readUInt16BE(msg.length - 2),
                                    mode: ENCRYPTION_MODE
                                }
                            }
                        }))
                    }
                })
            }
            else if (payload.op === 8) {
                setInterval(() => {
                    this.#ws.send(JSON.stringify({
                        op: 3,
                        d: Date.now()
                    }))
                }, payload.d.heartbeat_interval)
            }
            else if (payload.op === 6) {
                //this.#nonce = getRandomInt(0, 2000000000000)
            }
            else if (payload.op === 4) {
                this.#secret_key = payload.d.secret_key
                setInterval(() => {
                    this.Talk()
                }, 2000)
            }
        })
        this.#ws.addEventListener('close', (event) => {
            console.log(`voice gate close: ${event}`)
        })


    }

    /**
     * 
     * @param {Buffer} data opus encoded buffer 
     */
    Talk() {
        this.#ws.send(JSON.stringify({
            op: 5,
            d: {
                speaking: 1,
                delay: 0,
                ssrc: this.#ssrc
            }
        }))

        const packet = Buffer.alloc(12)
        packet[0] = 0x80
        packet[1] = 0x78
        packet.writeUIntBE(this.#sequence, 2, 2)
        packet.writeUIntBE(this.#timestamp, 4, 4)
        packet.writeUIntBE(this.#ssrc, 8, 4)
        packet.copy(this.#nonce, 0, 0, 12)

        // encrypt opus encoded buffer
        const ciphertext = Buffer.alloc(encoded.length + sodium.crypto_secretbox_MACBYTES)
        sodium.crypto_secretbox_easy(ciphertext, encoded, this.#nonce, new Uint8Array(this.#secret_key))
        const totalLength = packet.length + ciphertext.length

        const finalPacket = Buffer.concat([packet, ciphertext], totalLength)
        this.#udp.send(finalPacket)
        this.#sequence++
        this.#timestamp += TIMESTAMP_INC
    }
}

/**
 * Returns a random number that is in the range of n bits.
 *
 * @param n - The number of bits
 */
function randomNBit(n) {
	return Math.floor(Math.random() * 2 ** n);
}