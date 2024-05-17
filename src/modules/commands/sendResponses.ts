import { Message, MessageContent } from "whatsapp-web.js";
import { CommandResponseOptions, CommandResponse } from "../../ts/interfaces/commands.js";
import { CommandResponseCode, CommandResponseType } from "../../ts/enums/commands.js";
import { commandExists } from "./commands.js";
import { readResponse } from "../whatsapp/messageSending.js";
import { commandsPrefix } from "../../index.js";

export async function sendResponse(content: MessageContent | null, message: Message, options?: CommandResponseOptions): Promise<Message | void> {
    let responseType: CommandResponseType = CommandResponseType.UNKNOWN;
    if (content) {
        // Avoid commands that send other commands, as this can generate an infinite loop of sending messages
        if (typeof content === 'string' && content.indexOf(commandsPrefix) === 0) {
            const strHead: string = content.split(" ")[0].slice(commandsPrefix.length);
            if (commandExists(strHead)) {
                throw new Error(
                    `The response to a command cannot contain another command at the beginning, ` +
                    `as this can create an infinite loop.\n\n`+
                    `\tResponse: ` +
                    `"\x1b[41m${commandsPrefix}${strHead}\x1b[0m${content.slice(commandsPrefix.length + strHead.length)}"\n`);
            }
        }

        // Type of response
        if (options && options.asReply === true) {
            responseType = CommandResponseType.REPLY_MESSAGE;
        } else {
            responseType = CommandResponseType.SEND_MESSAGE;
        }
    } else if (options && options.reaction) {
        responseType = CommandResponseType.REACT_TO_MESSAGE;
    }

    const response: CommandResponse = {
        code: options?.asError  
              ? CommandResponseCode.ERROR
              : CommandResponseCode.OK,
        type: responseType,
        data: {
            content: content,
            reaction: options?.reaction,
            options: options?.messageOptions,
        }
    }

    return await readResponse(response, message);
}

export async function sendErrorResponse(content: MessageContent | null, message: Message, options?: CommandResponseOptions | undefined): Promise<Message | void> {
    return await sendResponse(content, message, { ...options, asError: true });
}

export async function sendReactionResponse(reaction: string, message: Message, options?: CommandResponseOptions) {
    const response: CommandResponse = {
        code: options?.asError  
              ? CommandResponseCode.ERROR
              : CommandResponseCode.OK,
              
        type: CommandResponseType.REACT_TO_MESSAGE,
        data: {
            reaction: reaction,
            options: options?.messageOptions,
        }
    }

    return await readResponse(response, message);
}