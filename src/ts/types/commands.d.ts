import { Message } from "whatsapp-web.js";

export type ParameterType = 'string' | 'number' | 'boolean' | 'any';
export type CommandCallback = (args: any[], message: Message) => void | Promise<void>;