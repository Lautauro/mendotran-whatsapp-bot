import { MessageSendOptions, MessageId, MessageContent, Message } from "whatsapp-web.js";
import { send_message } from "./whatsapp.js";

export async function reply_message(content: MessageContent, messageId: MessageId, options?: MessageSendOptions | undefined): Promise<Message> {
    options = {
        ...options,
        quotedMessageId: messageId._serialized,
    };

    return await send_message(content, messageId, options);
}
