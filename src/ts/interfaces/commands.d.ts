import { MessageContent, MessageSendOptions } from "whatsapp-web.js";
import { CommandCallback, ParameterType } from "../types/commands";
import { CommandResponse, CommandResponseType } from "../enums/commands";

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
    isOptional: boolean;
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
    hasOptionalValues: boolean;
    info?: CommandInfo;
    callback: CommandCallback;
}

export interface CommandData {
    options?: CommandOptions;
    info?: CommandInfo;
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
