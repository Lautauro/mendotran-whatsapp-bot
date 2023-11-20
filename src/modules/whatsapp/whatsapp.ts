import whatsappSettings from '../../config/whatsapp.json';
import { commandPrefix } from '../../config/commands.json';
import { LocalAuth, Client, MessageTypes, Message, MessageId, MessageSendOptions, MessageContent } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { get_time_string } from '../../utils/get_time_string.js';
import commandsSettings from '../../config/commands.json';
import { bot_log } from '../../utils/bot_log';

const startTime = Date.now();

// Configuración
const client = new Client({
    restartOnAuthFail: true,
    webVersionCache: {
        type: 'local',
        path: `${whatsappSettings.wwebjsCache}/.wwwebjs_cache`,
    },
    authStrategy: new LocalAuth({ dataPath: `${whatsappSettings.wwebjsCache}/.wwebjs_auth`}),
    puppeteer: {
        headless: true,
        args: [
            '--disable-gpu',
            // '--no-sandbox', 
            '--disable-accelerated-2d-canvas'
        ],
    }
});

// Autenticación
client.on('qr', (qr: string) => {

    console.log("███████████████████████████████████████████████████████\n");

    qrcode.generate(qr, {
        small: true
    });

    console.log("Escanee el QR para iniciar sesión\n");

    console.log("███████████████████████████████████████████████████████\n");
    
});

client.on('authenticated', () => {
    console.log('Autenticado\n');
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE\n', msg);
});

// Carga de mensajes
client.on('loading_screen', (percent: number) => {
    // Barra de carga
    let loading_bar = '';

    for(let i = 0; i < percent/2; ++i) {
        loading_bar += '█';
    }
    
    console.clear();
    console.log('█ Cargando mensajes █\n');
    console.log(`${loading_bar}${percent < 100 && percent >= 0 ? '▄▀' : ''} [ ${percent}% ]`);

    if (percent >= 100) {
        console.log('');
    }
});

// Cliente iniciado
client.on('ready', () => {
    console.clear();
    bot_log('El cliente está listo.\n');
    
    if (!whatsappSettings.showMessagesInTheTerminal) {
        bot_log('Mensajes ocultos.\n');
    }

    const commandPath = '../commands'
    let exec_command  = require(`${commandPath}/commands.js`).exec_command;
    require('../commands/commands_list.js');

    // HotSwap
    if (commandsSettings.hotSwappingEnabled) {
        setInterval(() => {
            try {
                // Limpiar cache
                delete require.cache[require.resolve(`${commandPath}/commands.js`)];
                delete require.cache[require.resolve(`${commandPath}/commands_list.js`)];

                // Reasignar variables
                exec_command = require(`${commandPath}/commands.js`).exec_command; 
                require(`${commandPath}/commands_list.js`);
            } catch(error) {
                console.error('Error al limpiar los caches:', error);
            }
        }, commandsSettings.hotSwappingTimer);
    } else {
        require(`${commandPath}/commands_list.js`);
    }

    const lastMessage: Map<string, number> = new Map();

    // Mensaje recibido
    client.on('message_create', async (message: Message) => {

        // Ignorar estados y mensajes pasados
        if (message.isStatus || (message.timestamp * 1000 < startTime)) { return; }

        // Setting: Ignorar mensajes con "media"
        if (whatsappSettings.ignoreMedia && message.hasMedia) { return; }

        // Mostrar mensajes en la terminal
        const from: string = message.fromMe ? message.to : message.from;

        if (whatsappSettings.showMessagesInTheTerminal) {
            let terminalText = '';
            let time: string | null = null;

            // Timestamp: Hora en la que se envió el mensaje
            if (whatsappSettings.showTimestamp) {
                time = get_time_string(message.timestamp * 1000, true, true, true);
            }

            // Mostrar nombre del contacto, si es que está agendado
            let userName: string = message.fromMe ? whatsappSettings.botName : '';
    
            if (!userName.length) {
                if (whatsappSettings.showContactName) {
                    const contact = await message.getContact();
                    userName = contact.name == undefined ? contact.pushname : contact.name;
                } else if (whatsappSettings.showUserName) {
                    // @ts-ignore
                    userName = message._data.notifyName;
                } else {
                    userName = 'HIDDEN';
                }
            }
            
            // Media: Audio, mensaje de voz, video, imagen, etc
            let messageMedia = '';
            // @ts-ignore
            if (message.isGif) { message.type = 'gif'; }
            if (message.hasMedia || message.location) {
                switch (message.type) {
                    case MessageTypes.AUDIO:
                        messageMedia = '🔊 Audio 🔊';
                    break;
                    case MessageTypes.VOICE:
                        messageMedia = '🔊 Mensaje de Voz 🔊';
                        break;
                    case MessageTypes.STICKER:
                        messageMedia = '💟 Sticker 💟 ';
                        break;
                    case MessageTypes.VIDEO:
                        messageMedia = '📹 Video 📹';
                        break;
                    case MessageTypes.IMAGE:
                        messageMedia = '📷 Imagen 📷';
                        break;
                    case MessageTypes.DOCUMENT:
                        messageMedia = '📄 Documento 📄';
                        break;
                    case MessageTypes.LOCATION:
                        message.body = ''; // Evitar que se impriman datos brutos sobre la ubicación
                        // @ts-ignore
                        if (message.location.description.length) {
                            // @ts-ignore
                            messageMedia = `📍 ${(message.location.description).split('\n').join('. ')} 📍\n`;
                        } else {
                            messageMedia = '📍 Ubicación 📍';
                        }
                        break;
                    // @ts-ignore
                    case 'gif':
                        messageMedia = '🎞️ GIF 🎞️';
                        break;
                    default:
                        messageMedia = `${message.type} `;
                        break;
                }
                if (message.body.length) { messageMedia += ': '; }
            }

            // Setting: Hora de envio
            if (time) { terminalText += `[${time}] `; }

            // Setting: Número de teléfono
            if (whatsappSettings.showContactPhone) { terminalText += `${from}`; }
            
            // Nombre de usuario
            terminalText += `| <${userName}> `;

            // Media
            if (messageMedia) {
                terminalText += messageMedia;
            }
            console.log(`${terminalText}${message.body}`);
        }

        // Setting: Ignorar comandos que no vengan del admin
        if ((whatsappSettings.adminOnly && !message.fromMe) || message.type !== MessageTypes.TEXT) { return; }

        // Cooldown
        if (message.fromMe || !lastMessage.has(from) || (Date.now() - Number(lastMessage.get(from)) >= whatsappSettings.cooldownTime) ) {

            // Checkear comandos
            if (exec_command && message.body.lastIndexOf(commandPrefix) == 0) {
                try {
                    exec_command(message);
                    lastMessage.set(from, Date.now());
                } catch(error) {
                    console.log();
                    console.error(error);
                }
            }
        }
    });
});

/**
 * Funciones
 */

export function start_whatsappweb_client(): void {
    client.initialize();
}

export async function send_message(content: MessageContent, messageId: MessageId, options?: MessageSendOptions | undefined): Promise<Message> {
    //return new Promise((resolve, reject) => {
        if (!client) {
            throw new Error('No se a inicializado el cliente Whatsapp.');
        } else {
            // try {
            //     client.sendMessage(messageId.remote, content, options)
            //     .then((message) => resolve(message))
            //     .catch((err) => {
            //         throw err;
            //     });
            // } catch(err) {
            //     console.error(err);
            //     reject(err);
            // }
            return await client.sendMessage(messageId.remote, content, options);
        }
}
