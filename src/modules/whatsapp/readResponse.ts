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
        let _return = null;

        if (response.data.reaction !== undefined) {
            if (response.type !== CommandResponseType.REACT_TO_MESSAGE) {
                reactToMessage(response.data.reaction, message);
            } else {
                _return = await reactToMessage(response.data.reaction, message);
            }
        }
        
        if (response.data.content) {
            switch (response.type) {
                case CommandResponseType.REPLY_MESSAGE:
                    _return = await replyMessage(response.data.content, message.id, { sendSeen: commandsSettings.sendSeen, ...response.data.options});
                    break;
                case CommandResponseType.SEND_MESSAGE:
                    _return = await sendMessage(response.data.content, message.id, { sendSeen: commandsSettings.sendSeen, ...response.data.options});
                    break;
            }
        }

        botLog('OK RESPONSE:', response);
        if (_return) { return _return; }

    } else if (response.code === CommandResponse.ERROR && typeof response.data.content === 'string') {
        botLogError('ERROR RESPONSE:', response);
        await reactToMessage(response.data.reaction ?? '🚫', message);
        
        return await sendMessage(`🚫 *ERROR* 🚫\n\n${response.data.content}`, message.id, { sendSeen: commandsSettings.sendSeen, ...response.data.options});
    }
}