import { MessageTypes, Message } from 'whatsapp-web.js';
import { getTimeString } from '../../utils/getTimeString.js';
import { whatsappSettings } from "../../index.js";

// Functions
export async function printMessage(message: Message, from: string, edited?: boolean): Promise<void> {
    let terminalText: string = '';

    // Timestamp: Time the message was sent
    if (whatsappSettings.showTimestamp === true) {
        terminalText += `[${getTimeString(message.timestamp * 1000, true, true, true)}] `;
    }

    // Show contact name if it is booked
    let userName: string = 'UNKNOWN';

    if (message.fromMe === true) {
        userName = whatsappSettings.botName;
    } else {
        if (whatsappSettings.showContactName) {
            const contact = await message.getContact();
            userName = (contact.name === undefined) ? contact.pushname : contact.name;
        } else if (whatsappSettings.showUserName) {
            // @ts-ignore            
            userName = message.rawData.notifyName ?? 'UNDEFINED';
        } else {
            userName = 'HIDDEN';
        }
    }

    // Media: Audio, voice message, video, image, etc
    let messageMedia: string = '';

    // @ts-ignore
    if (message.isGif) { message.type = 'gif'; }
    if (message.hasMedia === true || message.type !== MessageTypes.TEXT) {
        switch (message.type) {
            case MessageTypes.AUDIO:
                messageMedia = '🔊 Audio 🔊';
                break;
            case MessageTypes.VOICE:
                messageMedia = '🔊 Voice message 🔊';
                break;
            case MessageTypes.STICKER:
                messageMedia = '💟 Sticker 💟 ';
                break;
            case MessageTypes.VIDEO:
                messageMedia = '📹 Video 📹';
                break;
            case MessageTypes.IMAGE:
                messageMedia = '📷 Image 📷';
                break;
            case MessageTypes.DOCUMENT:
                messageMedia = '📄 Document 📄';
                break;
            case MessageTypes.LOCATION:
                // Prevent raw location data from being printed out
                message.body = '';
                // @ts-ignore
                if (message.location.description.length) {
                    // @ts-ignore
                    messageMedia = `📍 Location: ${(message.location.description).split('\n').join('. ')} 📍\n`;
                } else {
                    messageMedia = '📍 Location 📍';
                }
                break;
            // @ts-ignore
            case 'gif':
                messageMedia = '🎞️ GIF 🎞️';
                break;
            case MessageTypes.CONTACT_CARD:
                message.body = '';
                messageMedia = '📒 Contact card 📒';
                break;
            case MessageTypes.POLL_CREATION:
                messageMedia = '📊 Poll 📊';
                message.body = `\n"${message.body}":`;
                for (let i = 0; i < message.pollOptions.length; i++) {
                    // @ts-ignore
                    message.body += `\n  ${i + 1}) - ${message.pollOptions[i].name}`;
                }
                break;
            default:
                messageMedia = `${message.type}`;
                break;
        }
        if (message.body.length > 0) { messageMedia += ': '; }
    }

    // Setting: Show phone number
    if (whatsappSettings.showPhoneNumber === true) { terminalText += `${from}`; }
    // User name
    terminalText += `| <${userName}> `;
    // Media
    if (messageMedia) { terminalText += messageMedia; }
    // Edited
    if (edited) { terminalText += '[✍️ EDITED ✍️] '; }

    console.log(`${terminalText}${message.body}`);
}
