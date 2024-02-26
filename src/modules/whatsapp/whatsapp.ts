import { LocalAuth, Client, MessageTypes, Message, MessageId, MessageSendOptions, MessageContent } from 'whatsapp-web.js';
import { command_exists } from '../commands/commands'
import * as qrcode from 'qrcode-terminal';
import { get_time_string } from '../../utils/get_time_string.js';
import { bot_log, bot_log_error } from '../../utils/bot_log';

const whatsappSettings = require('../../../config/whatsapp.json');
const commandsSettings = require('../../../config/commands.json');
const packageInfo = require('../../../package.json');

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

client.on('ready', () => {
    console.clear();
    bot_log('The client is ready.\n');

    const startTime = Date.now();
    const commandPath: string = '../commands';
    let exec_command  = require(`${commandPath}/commands.js`).exec_command;
    require(`${commandPath}/commands_list.js`);
    
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
                console.error('Error while clearing cache:', error);
            }
        }, commandsSettings.hotSwappingTimer);
    }

    // Save timestamp of last command
    const lastMessage: Map<string, number[]> = new Map();

    // Auto-clear history
    setInterval(() => { clear_commands_history(); }, commandsSettings.clearCommandsHistoryEvery);

    // Show edited messages in the termianal
    if (whatsappSettings.showMessagesInTheTerminal) {
        client.on('message_edit', async (message: Message) => {
            // Ignore previous messages
            if (message.timestamp * 1000 < startTime) { return; }
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

        if (message.body.indexOf(commandsSettings.commandPrefix) === 0 && typeof message.body === 'string' && message.type === MessageTypes.TEXT) {
            if (commandsSettings.commandPrefix.length === 0) {
                const checkCommand: string[] | null = message.body.match(/[a-z]+/i);
                if (checkCommand && !command_exists(checkCommand[0])) { return; }
            }
            
            // Cooldown
            if (can_execute(message, from)) {
                exec_command(message);
                cooldown_update(from);
            }
        }
    });

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

    const cooldownMultiplier = [ 1.4, 2, 2.5, 3];

    function can_execute(message: Message, from: string): boolean {
        if (message.fromMe === true) { return true; }

        // Cooldown check
        if (lastMessage.has(from)) {
            const timestampList = lastMessage.get(from);

            if (timestampList === undefined) { return false; }

            const now = Date.now();
            const timeElapsed = now - timestampList[timestampList.length - 1];
            
            if (timeElapsed >= commandsSettings.cooldownTime) {
                const actualCooldown = commandsSettings.cooldownTime * cooldownMultiplier[timestampList.length - 1];
                const nextCooldown = actualCooldown + commandsSettings.cooldownTime;

                if (timeElapsed >= nextCooldown) {
                    timestampList.splice(0, timestampList.length);
                    return true;
                } else if (timeElapsed >= actualCooldown) {
                    return true;
                }
            }
        } else {
            return true;
        }
        return false;
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
});

// Functions

async function print_message(message: Message, from: string, edited?: boolean): Promise<void> {
    let terminalText: string = '';

    // Timestamp: Time the message was sent
    if (whatsappSettings.showTimestamp === true) { 
        terminalText += `[${get_time_string(message.timestamp * 1000, true, true, true)}] `;
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
    if (message.hasMedia === true || message.location) {
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
    if (whatsappSettings.showPhoneNumber === true) { terminalText += `${from}`; }
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