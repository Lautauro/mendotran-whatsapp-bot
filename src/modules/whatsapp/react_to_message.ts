import { Message } from "whatsapp-web.js";

export async function react_to_message(reaction: string, message: Message): Promise<void> {
    // if (typeof reaction !== 'string') { 
    //     throw new TypeError('');
    // }
    return message.react(reaction);
}