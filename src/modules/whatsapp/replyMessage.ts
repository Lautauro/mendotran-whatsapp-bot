import { MessageSendOptions, MessageId, MessageContent, Message } from "whatsapp-web.js";
import { sendMessage } from "./whatsapp.js";

export async function replyMessage(content: MessageContent, messageId: MessageId, options?: MessageSendOptions | undefined): Promise<Message> {
    return await sendMessage(content, messageId, { ...options, quotedMessageId: messageId._serialized });
}