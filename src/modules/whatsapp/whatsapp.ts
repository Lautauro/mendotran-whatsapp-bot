import { LocalAuth, Client, MessageTypes, Message, MessageId, MessageSendOptions, MessageContent } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { getTimeString } from '../../utils/getTimeString.js';
import { botLog, botLogError } from '../../utils/botLog.js';
import { whatsappSettings, commandsSettings, packageInfo } from "../../index.js";

export const wwebClient = new Client({
    authStrategy: new LocalAuth({ 
            dataPath: `${whatsappSettings.wwebjsCache}/.wwebjs_auth`,
    }),
    restartOnAuthFail: true,
    puppeteer: {
        headless: true,
        args: [
            '--disable-gpu',
            '--disable-setuid-sandbox',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--single-process',
        ],
    },
    webVersionCache: {
        type: 'local',
        path: `${whatsappSettings.wwebjsCache}/.wwebjs_cache`,
    },
});

wwebClient.on('qr', (qr: string) => {
    console.clear();
    console.log("███████████████████████████████████████████████████████\n");
    qrcode.generate(qr, { small: true });
    console.log("Scan the QR to log in\n");
    console.log("███████████████████████████████████████████████████████\n");
});

wwebClient.on('authenticated', () => {
    botLog('Authenticated\n');
});

wwebClient.on('auth_failure', (msg) => {
    botLogError('Authentication failure\n', msg);
});

wwebClient.on('disconnected', (reason) => {
    botLogError('Client was logged out. Reason:', reason);
});

wwebClient.on('loading_screen', (percent: number) => {
    let loading_bar: string = '';
    while (loading_bar.length < Math.round(100 * .5)) {
        if (loading_bar.length < Math.round(percent * .5)) {
            loading_bar += '█';
        } else {
            loading_bar += ':';
        }
    }

    console.clear();
    console.log('\n'                                                    +
        `                 █  ${packageInfo.name.toUpperCase()}  █\n\n`  +
        '                          ##########\n'                        +
        '                      #################\n'                     +
        '                    #####            #####\n'                  +
        '                  ####                  ####\n'                +
        '                 ###                      ###\n'               +
        '                ###     ####               ###\n'              +
        '               ###     #####                ###\n'             +
        '               ###     #####                ###\n'             +
        '               ###      ###                 ###\n'             +
        '               ###       ####               ###\n'             +
        '               ###         ####   ####      ###\n'             +
        '                ###         ##########     ###\n'              +
        '                 ###            #####     ###\n'               +
        '                 ###                    ####\n'                +
        '                ###                  #####\n'                  +
        '                #######################\n'                     +
        '               ########   ##########\n\n'                      +
        `                    Version: ${packageInfo.version}\n`
    );
    console.log(` ${loading_bar} [ ${percent} % ]\n`);
});

wwebClient.on('ready', () => {
    console.clear();
    botLog('The client is ready.\n');

    const startTime = Date.now();
    const commandPath: string = '../commands';
    let commandExecution  = require(`${commandPath}/commands.js`).commandExecution;
    require(`${commandPath}/commandsList.js`);
    
    if (!whatsappSettings.showMessagesInTheTerminal) { botLog('Hidden messages.\n'); }

    // Hot-Swap
    if (commandsSettings.hotSwappingEnabled) {
        setInterval(() => {
            try {
                delete require.cache[require.resolve(`${commandPath}/commands.js`)];
                delete require.cache[require.resolve(`${commandPath}/commandsList.js`)];

                commandExecution = require(`${commandPath}/commands.js`).commandExecution; 
                require(`${commandPath}/commandsList.js`);
            } catch(error) {
                console.error('Error while clearing cache:', error);
            }
        }, commandsSettings.hotSwappingTimer);
    }

    // Show edited messages in the termianal
    if (whatsappSettings.showMessagesInTheTerminal) {
        wwebClient.on('message_edit', async (message: Message) => {
            // Ignore previous messages
            if (message.timestamp * 1000 < startTime) { return; }
            const from: string = message.fromMe ? message.to : message.from;
            printMessage(message, from, true);
        });
    }

    wwebClient.on('message_create', async (message: Message) => {
        // Ignore status messages and previous messages
        if (message.isStatus || (message.timestamp * 1000 < startTime)) { return; }

        // Setting: Ignore "media" messages
        if (whatsappSettings.ignoreNonTextMessages === true && message.type !== MessageTypes.TEXT) { return; }

        if (message.type === MessageTypes.E2E_NOTIFICATION || message.type === MessageTypes.NOTIFICATION_TEMPLATE ||
            message.type === MessageTypes.NOTIFICATION || message.type === MessageTypes.GROUP_NOTIFICATION ||
            message.type === MessageTypes.UNKNOWN) { return; }

        const from: string = message.fromMe ? message.to : message.from;

        // Setting: Show messages in the termianal
        if (whatsappSettings.showMessagesInTheTerminal) { printMessage(message, from); }

        /* Commands */ 
        
        if (commandExecution === undefined) { return; }
        
        // Setting: Ignore commands not coming from admin
        if (whatsappSettings.adminOnly && !message.fromMe) { return; }

        if (message.body.indexOf(commandsSettings.commandPrefix) === 0 && typeof message.body === 'string' && message.type === MessageTypes.TEXT) {          
            commandExecution(message);
        }
    });
});

// Functions

async function printMessage(message: Message, from: string, edited?: boolean): Promise<void> {
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
                    message.body += `\n  ${i+1}) - ${message.pollOptions[i].name}`;
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

export function startWhatsAppWebClient(): void { wwebClient.initialize(); }