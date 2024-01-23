import { LocalAuth, Client, MessageTypes, Message, MessageId, MessageSendOptions, MessageContent } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { get_time_string } from '../../utils/get_time_string.js';
import { bot_log, bot_log_error } from '../../utils/bot_log';

const whatsappSettings = require('../../../config/whatsapp.json');
const commandsSettings = require('../../../config/commands.json');

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
    console.log("Scan the QR to log in\n");
    console.log("███████████████████████████████████████████████████████\n");
});

client.on('authenticated', () => {
    bot_log('Authenticated\n');
});

client.on('auth_failure', (msg) => {
    bot_log_error('Authentication failure\n', msg);
});

client.on('disconnected', (reason) => {
    bot_log_error('Client was logged out. Reason:', reason);
});

client.on('loading_screen', (percent: number) => {
    // Loading bar
    let loading_bar = '';

    for(let i = 0; i < percent/2; ++i) { loading_bar += '█'; }
    
    console.clear();
    console.log('█ Loading messages █\n');
    console.log(`${loading_bar}${percent < 100 && percent >= 0 ? '▄▀' : ''} [ ${percent}% ]`);

    if (percent >= 100) { console.log(''); }
});

client.on('ready', () => {
    const startTime = Date.now();
    const commandPath = '../commands'
    let exec_command  = require(`${commandPath}/commands.js`).exec_command;
    require('../commands/commands_list.js');

    console.clear();
    bot_log('The client is ready.\n');
    
    if (!whatsappSettings.showMessagesInTheTerminal) { bot_log('Hidden messages.\n'); }

    // Hot-Swap
    if (commandsSettings.hotSwappingEnabled) {
        setInterval(() => {
            try {
                delete require.cache[require.resolve(`${commandPath}/commands.js`)];
                delete require.cache[require.resolve(`${commandPath}/commands_list.js`)];

                exec_command = require(`${commandPath}/commands.js`).exec_command; 
                require(`${commandPath}/commands_list.js`);
            } catch(error) {
                console.error('Error while clearing caches:', error);
            }
        }, commandsSettings.hotSwappingTimer);
    } else {
        require(`${commandPath}/commands_list.js`);
    }

    // Save timestamp of last command
    const lastMessage: Map<string, number[]> = new Map();

    // Auto-clear history
    setInterval(() => { clear_commands_history(); }, commandsSettings.clearCommandsHistoryEvery);

    // Show edited messages in the termianal
    if (whatsappSettings.showMessagesInTheTerminal) {
        client.on('message_edit', async (message: Message) => {
            const from: string = message.fromMe ? message.to : message.from;
            print_message(message, from, true);
        });
    }

    client.on('message_create', async (message: Message) => {
        // Ignore status messages and previous messages
        if (message.isStatus || (message.timestamp * 1000 < startTime)) { return; }

        // Setting: Ignore "media" messages
        if (whatsappSettings.ignoreMedia && message.hasMedia) { return; }

        const from: string = message.fromMe ? message.to : message.from;

        // Setting: Show messages in the termianal
        if (whatsappSettings.showMessagesInTheTerminal) { print_message(message, from); }

        /* Commands */ 
        
        // Setting: Ignore commands not coming from admin
        if (whatsappSettings.adminOnly && !message.fromMe) { return; }
        
        if (exec_command === undefined) { return; }

        if (message.body.lastIndexOf(commandsSettings.commandPrefix) === 0 && typeof message.body === 'string' && message.type === MessageTypes.TEXT) {
            // Cooldown
            if (verify_command_permission(message, from)) {
                // Check commands
                try {
                    exec_command(message);
                    cooldown_update(from);
                } catch(error) {
                    console.log();
                    console.error(error);
                }
            }
        }


    });

    const cooldownMultiplier = [
        1.5, // 0
        2,   // 1
        2.5, // 2
        3    // 3
    ];

    function clear_commands_history() {
        if (lastMessage.size === 0) { return; }
        
        bot_log('Clearing command timestamp history:\n');  
        const now = Date.now();
        for (let [user, timestampList] of lastMessage) {
            if (now - timestampList[timestampList.length - 1] >= commandsSettings.cooldownTime * cooldownMultiplier[3]) {
                lastMessage.delete(user);
                bot_log(user, '=>', timestampList);
            }
        }
        bot_log('Command timestamp history cleared.');
    }

    function cooldown_update(from: string) {
        if (lastMessage.has(from)) {
            const timestampList = lastMessage.get(from);
            if (timestampList !== undefined) {
                if (timestampList.length >= cooldownMultiplier.length) { timestampList.splice(0, 1); }
                timestampList.push(Date.now());
            }
        } else {
            lastMessage.set(from, [ Date.now() ]);
        }
    }

    function verify_command_permission(message: Message, from: string): boolean {
        if (message.fromMe === true) { return true; }
        if (lastMessage.has(from)) {
            const timestampList = lastMessage.get(from);
            const now = Date.now();
            
            if (timestampList === undefined) { return false; }

            const timeElapsed = now - timestampList[timestampList.length - 1];

            if (timeElapsed >= commandsSettings.cooldownTime) {
                if (timestampList.length === 1) {
                    if (timeElapsed >= commandsSettings.cooldownTime * cooldownMultiplier[0]) { timestampList.splice(0, 1); }
                    return true;
                }

                if (timeElapsed >= commandsSettings.cooldownTime * cooldownMultiplier[timestampList.length] ||
                    timeElapsed >= (commandsSettings.cooldownTime * cooldownMultiplier[timestampList.length - 1]) + commandsSettings.cooldownTime) {
                    timestampList.splice(0, timestampList.length - 1);
                }

                if (timeElapsed >= commandsSettings.cooldownTime * cooldownMultiplier[timestampList.length - 1]) {
                    return true;
                }
            }
        } else {
            return true;
        }
        return false;
    }
});

// Functions

async function print_message(message: Message, from: string, edited?: boolean): Promise<void> {
    let terminalText = '';
    // Timestamp: Time the message was sent
    const time: string | null = whatsappSettings.showTimestamp ? get_time_string(message.timestamp * 1000, true, true, true) : null;
    if (time) { terminalText += `[${time}] `; }

    // Show contact name if it is booked
    let userName: string = message.fromMe ? whatsappSettings.botName : '';

    if (userName.length > 0) {
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
    
    // Media: Audio, voice message, video, image, etc
    let messageMedia = '';

    // @ts-ignore
    if (message.isGif) { message.type = 'gif'; }
    if (message.hasMedia || message.location) {
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
                    messageMedia = `📍 ${(message.location.description).split('\n').join('. ')} 📍\n`;
                } else {
                    messageMedia = '📍 Location 📍';
                }
                break;
            // @ts-ignore
            case 'gif':
                messageMedia = '🎞️ GIF 🎞️';
                break;
            default:
                messageMedia = `${message.type}`;
                break;
        }
        if (message.body.length > 0) { messageMedia += ': '; }
    }

    // Setting: Show phone number
    if (whatsappSettings.showPhoneNumber) { terminalText += `${from}`; }
    // User name
    terminalText += `| <${userName}> `;
    // Media
    if (messageMedia) { terminalText += messageMedia; }
    // Edited
    if (edited) { terminalText += '[✍️ EDITED ✍️] '; }

    console.log(`${terminalText}${message.body}`);
}

export async function send_message(content: MessageContent, messageId: MessageId, options?: MessageSendOptions | undefined): Promise<Message> {
    if (!client) {
        throw new Error('The Whatsapp Web client has not been initialised.');
    } else {
        return await client.sendMessage(messageId.remote, content, options);
    }
}

export function start_whatsappweb_client(): void { client.initialize(); }