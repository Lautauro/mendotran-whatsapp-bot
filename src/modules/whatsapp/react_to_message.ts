import { Message } from "whatsapp-web.js";

export async function react_to_message(reaction: string, message: Message): Promise<void> {
    return message.react(reaction);
}