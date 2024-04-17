import { LocalAuth, Client, MessageTypes, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { botLog, botLogError } from '../../utils/botLog.js';
import { whatsappSettings, commandsSettings, packageInfo } from "../../index.js";
import { printMessage } from './printMessage.js';

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

let clientStarted: boolean = false;

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
    if (clientStarted === true) { return; }

    let loading_bar: string = '';
    while (loading_bar.length < Math.round(100 * .5)) {
        if (loading_bar.length < Math.round(percent * .5)) {
            loading_bar += '█';
        } else {
            loading_bar += ':';
        }
    }

    console.clear();
    console.log('\n' +
        `                 █  ${packageInfo.name.toUpperCase()}  █\n\n` +
        '                          ##########\n' +
        '                      #################\n' +
        '                    #####            #####\n' +
        '                  ####                  ####\n' +
        '                 ###                      ###\n' +
        '                ###     ####               ###\n' +
        '               ###     #####                ###\n' +
        '               ###     #####                ###\n' +
        '               ###      ###                 ###\n' +
        '               ###       ####               ###\n' +
        '               ###         ####   ####      ###\n' +
        '                ###         ##########     ###\n' +
        '                 ###            #####     ###\n' +
        '                 ###                    ####\n' +
        '                ###                  #####\n' +
        '                #######################\n' +
        '               ########   ##########\n\n' +
        `                    Version: ${packageInfo.version}\n`
    );
    console.log(` ${loading_bar} [ ${percent} % ]\n`);
});

wwebClient.on('ready', () => {
    if (clientStarted === false) {
        clientStarted = true;
    } else { return; }

    console.clear();
    botLog('The client is ready.\n');

    const startTime = Date.now();
    const commandPath: string = '../commands';
    let commandExecution = require(`${commandPath}/commands.js`).commandExecution;
    require(`${commandPath}/commandsList.js`);

    if (!whatsappSettings.showMessagesInTheTerminal) { botLog('Hidden messages.\n'); }

    // Hot-Swap
    if (commandsSettings.hotSwappingEnabled) {
        setInterval(() => {
            try {
                delete require.cache[require.resolve(`${commandPath}/commands.js`)];
                delete require.cache[require.resolve(`${commandPath}/commandsList.js`)];
                delete require.cache[require.resolve(`${commandPath}/sendResponses.js`)];
                delete require.cache[require.resolve(`./messageSending.js`)];

                commandExecution = require(`${commandPath}/commands.js`).commandExecution;
                require(`${commandPath}/commandsList.js`);
            } catch (error) {
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
        if (commandsSettings.adminOnly && !message.fromMe) { return; }

        if (message.body.indexOf(commandsSettings.commandPrefix) === 0 && typeof message.body === 'string' && message.type === MessageTypes.TEXT) {
            commandExecution(message);
        }
    });
});

export function startWhatsAppWebClient(): void { wwebClient.initialize(); }