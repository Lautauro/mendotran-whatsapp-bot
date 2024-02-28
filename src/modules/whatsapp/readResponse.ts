import { CommandReturn } from "../../ts/interfaces/commands.js";
import { CommandResponse, CommandResponseType } from "../../ts/enums/commands.js";
import { Message } from "whatsapp-web.js";
import { replyMessage } from "./replyMessage.js";
import { sendMessage } from "./whatsapp.js";
import { reactToMessage } from "./reactToMessage.js";
import { botLog, botLogError } from '../../utils/botLog';
import { commandsSettings } from "../../index.js";

export async function readResponse(response: CommandReturn, message: Message): Promise<Message | void> {
    if (response.code === CommandResponse.OK) {
        if (typeof response.data.reaction === 'string' && response.data.reaction.length) {
            await reactToMessage(response.data.reaction, message);
        }

        if (response.data.content) {
            switch (response.type) {
                case CommandResponseType.REPLY_MESSAGE:
                    return await replyMessage(response.data.content, message.id, { sendSeen: commandsSettings.sendSeen, ...response.data.options});
                case CommandResponseType.SEND_MESSAGE:
                    return await sendMessage(response.data.content, message.id, { sendSeen: commandsSettings.sendSeen, ...response.data.options});
            }
        }
        botLog('Command response: OK\n', response);
    } else if (response.code === CommandResponse.ERROR && typeof response.data.content === 'string') {
        botLogError('Command response: ERROR\n', response);
        await reactToMessage(response.data.reaction ?? '😵', message);
        return await sendMessage(`⚠️ *Ha ocurrido un error* ⚠️\n\n${response.data.content}`, message.id, { sendSeen: commandsSettings.sendSeen, ...response.data.options});
    }
}