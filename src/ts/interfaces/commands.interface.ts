import { MessageContent, MessageSendOptions } from "whatsapp-web.js";
import { CommandCallback, ParameterType } from "../types/commands.type";
import { CommandResponse, CommandResponseType } from "../enums/commands.enum";

export interface ParameterInfo {
    name: string;
    description?: string;
    example: string;
}

export interface CommandInfo {
    name: string;
    description?: string;
}

export interface Parameter {
    type: ParameterType[];
    defaultValue?: any;
    info?: ParameterInfo;
}

export interface CommandOptions {
    adminOnly?: boolean;
    needQuotedMessage?: boolean;
}

export interface Command {
    alias: string[];
    parameters: Parameter[] | null;
    options: CommandOptions;
    defaultValues?: any[];
    info?: CommandInfo;
    callback: CommandCallback;
}

export interface CommandResponseOptions {
    reply?: boolean;
    asError?: boolean;
    reaction?: string;
    messageOptions?: MessageSendOptions;
}

export interface CommandReturn {
    code: CommandResponse;
    type: CommandResponseType | null;
    data: {
        content: MessageContent | null;
        reaction?: string;
        options?: MessageSendOptions;
    }
}
