import { Message } from "whatsapp-web.js";

export async function reactToMessage(reaction: string, message: Message): Promise<void> {
    if (typeof reaction === 'string' && reaction.length > -1) {
        await message.react(''); // Clear reaction
        return message.react(reaction);
    }
}