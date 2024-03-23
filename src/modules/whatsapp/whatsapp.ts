import { LocalAuth, Client, MessageTypes, Message, MessageId, MessageSendOptions, MessageContent } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { getTimeString } from '../../utils/getTimeString.js';
import { botLog, botLogError } from '../../utils/botLog.js';
import { whatsappSettings, commandsSettings, packageInfo } from "../../index.js";

const client = new Client({
    authStrategy: new LocalAuth({ 
            dataPath: `${whatsappSettings.wwebjsCache}/.wwebjs_auth`,
    }),
    restartOnAuthFail: true,
    webVersionCache: {
        type: 'local',
        path: `${whatsappSettings.wwebjsCache}/.wwwebjs_cache`,
    },
    puppeteer: {
        headless: true,
        args: [
            '--disable-gpu',
            '--disable-setuid-sandbox',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--single-process',
        ],
    }
});

client.on('qr', (qr: string) => {
    console.clear();
    console.log("███████████████████████████████████████████████████████\n");
    qrcode.generate(qr, { small: true });
    console.log("Escanee el QR para iniciar sesión en WhatsApp Web\n");
    console.log("███████████████████████████████████████████████████████\n");
});

client.on('authenticated', () => {
    botLog('Autenticado\n');
});

client.on('auth_failure', (msg) => {
    botLogError('Fallo de autenticación\n', msg);
});

client.on('disconnected', (reason) => {
    botLogError('Se ha cerrado la sesión del cliente. Motivo:', reason);
});

client.on('loading_screen', (percent: number) => {
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
        `                █  ${packageInfo.name.toUpperCase()}  █\n\n`   +
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
        `                     Versión: ${packageInfo.version}\n`
    );
    console.log(` ${loading_bar} [ ${percent} % ]\n`);
});

client.on('ready', () => {
    console.clear();
    botLog('El cliente ha iniciado.\n');

    const startTime = Date.now();
    const commandPath: string = '../commands';
    let commandExecution  = require(`${commandPath}/commands.js`).commandExecution;
    require(`${commandPath}/commandsList.js`);
    
    if (!whatsappSettings.showMessagesInTheTerminal) { botLog('Mensajes ocultados.\n'); }

    // Hot-Swap
    if (commandsSettings.hotSwappingEnabled) {
        setInterval(() => {
            try {
                delete require.cache[require.resolve(`${commandPath}/commands.js`)];
                delete require.cache[require.resolve(`${commandPath}/commandsList.js`)];
                delete require.cache[require.resolve(`../mendotran/mendotran.js`)];

                commandExecution = require(`${commandPath}/commands.js`).commandExecution; 
                require(`${commandPath}/commandsList.js`);
            } catch(error) {
                console.error('Error al limpier la memoria caché:', error);
            }
        }, commandsSettings.hotSwappingTimer);
    }

    // Show edited messages in the termianal
    if (whatsappSettings.showMessagesInTheTerminal) {
        client.on('message_edit', async (message: Message) => {
            // Ignore previous messages
            if (message.timestamp * 1000 < startTime) { return; }
            const from: string = message.fromMe ? message.to : message.from;
            printMessage(message, from, true);
        });
    }

    client.on('message_create', async (message: Message) => {
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
    let userName: string = 'DESCONOCIDO';

    if (message.fromMe === true) {
        userName = whatsappSettings.botName;
    } else {
        if (whatsappSettings.showContactName) {
            const contact = await message.getContact();
            userName = (contact.name === undefined) ? contact.pushname : contact.name;
        } else if (whatsappSettings.showUserName) {
            // @ts-ignore            
            userName = message.rawData.notifyName ?? 'INDEFINIDO';
        } else {
            userName = 'OCULTO';
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
                messageMedia = '🔊 Mensaje de voz 🔊';
                break;
            case MessageTypes.STICKER:
                messageMedia = '💟 Sticker 💟 ';
                break;
            case MessageTypes.VIDEO:
                messageMedia = '📹 Vídeo 📹';
                break;
            case MessageTypes.IMAGE:
                messageMedia = '📷 Imagen 📷';
                break;
            case MessageTypes.DOCUMENT:
                messageMedia = '📄 Documento 📄';
                break;
            case MessageTypes.LOCATION:
                // Prevent raw location data from being printed out
                message.body = ''; 
                // @ts-ignore
                if (message.location.description.length) {
                    // @ts-ignore
                    messageMedia = `📍 Ubicación: ${(message.location.description).split('\n').join('. ')} 📍\n`;
                } else {
                    messageMedia = '📍 Ubicación 📍';
                }
                break;
            // @ts-ignore
            case 'gif':
                messageMedia = '🎞️ GIF 🎞️';
                break;
            case MessageTypes.CONTACT_CARD:
                message.body = '';
                messageMedia = '📒 Contacto 📒';
                break;
            case MessageTypes.POLL_CREATION:
                messageMedia = '📊 Encuesta 📊';
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
    if (edited) { terminalText += '[✍️ EDITADO ✍️] '; }

    console.log(`${terminalText}${message.body}`);
}

export async function sendMessage(content: MessageContent, messageId: MessageId, options?: MessageSendOptions | undefined): Promise<Message> {
    if (!client) {
        throw new Error('El cliente de WhatsApp Web no ha sido inicializado.');
    } else {
        return await client.sendMessage(messageId.remote, content, options);
    }
}

export function startWhatsAppWebClient(): void { client.initialize(); }