import { Bot } from "./bot.js";
import { Messenger } from "./messenger.js";
import { Intents } from "./intents.js";
import { Headset } from "./headset.js";
import 'dotenv/config'

const appID = process.env.APP_ID
const token = process.env.BOT_TOKEN
const intents = Intents.GUILD_VOICE_STATES.bit + Intents.GUILD_MESSAGES.bit
const testGuildID = '1085099345487089684'
const testChannelID = '1085099346208497667'

let info
const bot = new Bot(token)
const gateURL = await bot.GetGateURL()
console.log(gateURL)
const messenger = new Messenger(gateURL, token, intents, appID)
let headset
messenger.Connect()
messenger.Emitter.addListener('event', async (payload) => {
   if (payload.t === 'MESSAGE_CREATE' && payload.d.content === '~join' && payload.d.author.username === 'ltnwarrior') {
       //bot.Chat(payload.d.channel_id, 'hi')
       info = await messenger.JoinVoice(testGuildID, testChannelID)
       console.log(info)
       headset = new Headset(info.voice_session_id, info.token, info.endpoint, testGuildID, appID)
       headset.Connect()
       //headset.Talk()
     
   }
})