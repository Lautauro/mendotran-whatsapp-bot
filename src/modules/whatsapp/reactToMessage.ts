import { Message } from "whatsapp-web.js";

export async function reactToMessage(reaction: string, message: Message): Promise<void> {
    await message.react(''); // Clear reaction
    return message.react(reaction);
}