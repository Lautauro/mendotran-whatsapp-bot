import { CommandReturn } from "../../ts/interfaces/commands.js";
import { CommandResponse, CommandResponseType } from "../../ts/enums/commands.js";
import { Message } from "whatsapp-web.js";
import { reply_message } from "./reply_message.js";
import { send_message } from "./whatsapp.js";
import { react_to_message } from "./react_to_message.js";
import { bot_log, bot_log_error } from '../../utils/bot_log';

const commandsSettings = require('../../../config/commands.json');

export async function read_response(response: CommandReturn, message: Message): Promise<Message | void> {
    if (response.code === CommandResponse.OK) {
        if (typeof response.data.reaction === 'string' && response.data.reaction.length) {
            react_to_message(response.data.reaction, message);
        }

        if (response.data.content) {
            switch (response.type) {
                case CommandResponseType.REPLY_MESSAGE:
                    return await reply_message(response.data.content, message.id, { sendSeen: commandsSettings.sendSeen, ...response.data.options});
                case CommandResponseType.SEND_MESSAGE:
                    return await send_message(response.data.content, message.id, { sendSeen: commandsSettings.sendSeen, ...response.data.options});
            }
        }
        bot_log('Command response: OK\n', response);
    } else if (response.code === CommandResponse.ERROR && typeof response.data.content === 'string') {
        bot_log_error('Command response: ERROR\n', response);
        react_to_message('🚫', message);
        return await send_message(`🚫 *ERROR* 🚫\n\n${response.data.content}`, message.id, { sendSeen: commandsSettings.sendSeen, ...response.data.options});
    }
}