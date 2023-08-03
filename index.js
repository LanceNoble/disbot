import { Bot } from "./bot.js";
import { Messenger } from "./messenger.js";

const token = 'ODk5NTYwNjA0MDkwNjM0Mjgx.GQOQtU.BQJpuF7eZui0C38YZsD81m-QepxEv_gjBCzamc'
const channelID = '1085099346208497666'

const bot = new Bot(token)
const gatewayURL = await bot.obtainGatewayURL()
const messenger = new Messenger(gatewayURL, token, 640)
await messenger.connect()

// messenger.emitter.addListener('event', (data) => {

//     bot.chat('1085099346208497666', 'i love you')
// })

export {Bot, Messenger}