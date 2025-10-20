import { CommandResponse } from "../../ts/interfaces/commands.js";
import { CommandResponseCode, CommandResponseType } from "../../ts/enums/commands.js";
import { Message, MessageContent, MessageId, MessageSendOptions } from "whatsapp-web.js";
import { botLog, botLogError, botLogOk } from '../../utils/botLog';
import { commandsSettings } from "../../index.js";
import { wwebClient } from "./client.js";
import { whatsappSettings } from "../../index.js";

const RESPONSE_TYPE: string[] = [];
RESPONSE_TYPE[CommandResponseType.SEND_MESSAGE] = 'SEND_MESSAGE';
RESPONSE_TYPE[CommandResponseType.REPLY_MESSAGE] = 'REPLY_MESSAGE';
RESPONSE_TYPE[CommandResponseType.REACT_TO_MESSAGE] = 'REACT_TO_MESSAGE';
RESPONSE_TYPE[CommandResponseType.UNKNOWN] = 'UNKNOWN';

const RESPONSE_CODE: string[] = [];
RESPONSE_CODE[CommandResponseCode.OK] = 'OK';
RESPONSE_CODE[CommandResponseCode.ERROR] = 'ERROR';

async function sendMessage(content: MessageContent, messageId: MessageId, options?: MessageSendOptions | undefined): Promise<Message> {
    return await wwebClient.sendMessage(messageId.remote, content, options);
}

async function sendReplyMessage(content: MessageContent, messageId: MessageId, options?: MessageSendOptions | undefined): Promise<Message> {
    return await sendMessage(content, messageId, { ...options, quotedMessageId: messageId._serialized });
}

async function sendReaction(reaction: string, message: Message): Promise<Message> {
    await message.react(''); // Clear reaction
    await message.react(reaction);
    return message;
}

export async function readResponse(response: CommandResponse, message: Message): Promise<Message | void> {
    if (!wwebClient) { throw new Error('El cliente de WhatsApp Web no ha sido inicializado.'); }

    const msgOptions: MessageSendOptions = {
        sendSeen: commandsSettings.sendSeen,
        ...response.data.options
    };
    let _return = null;
    const logString: string = JSON.stringify({
                                  ...response,
                                  type: RESPONSE_TYPE[response.type] ?? response.type,
                                  code: RESPONSE_CODE[response.code] ?? response.code,
                                }) + `; message.id.remote = ` +
                                (whatsappSettings.showPhoneNumber === true ? "${message.id.remote}" : "OCULTO" );

    if (response.code === CommandResponseCode.OK) {
        if (response.data.reaction !== undefined) {
            if (response.type !== CommandResponseType.REACT_TO_MESSAGE) {
                sendReaction(response.data.reaction, message);
            } else {
                _return = await sendReaction(response.data.reaction, message);
            }
        }

        if (response.data.content) {
            switch (response.type) {
                case CommandResponseType.REPLY_MESSAGE:
                    _return = await sendReplyMessage(response.data.content, message.id, msgOptions);
                    break;
                case CommandResponseType.SEND_MESSAGE:
                    _return = await sendMessage(response.data.content, message.id, msgOptions);
                    break;
            }
        }
        
        botLogOk('OK RESPONSE:', logString);
    } else {
        await sendReaction(response.data.reaction ?? '😵', message);
        if (response.data.content && typeof response.data.content === 'string') {
            _return = await sendMessage(`⚠️ *Ha ocurrido un error* ⚠️\n\n${response.data.content}`, message.id, msgOptions);
        }

        botLogError('ERROR RESPONSE:', logString);
    }

    if (_return) { return _return; }
}
