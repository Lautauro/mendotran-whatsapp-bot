import { LocalAuth, Client, MessageTypes, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { botLog, botLogError, botLogOk } from '../../utils/botLog.js';
import { whatsappSettings, commandsSettings, packageInfo } from "../../index.js";
import { printMessage } from './printMessage.js';

export const wwebClient = new Client({
    authStrategy: new LocalAuth({
        dataPath: `${whatsappSettings.wwebjsCache}/.wwebjs_auth`,
    }),
    restartOnAuthFail: true,
    puppeteer: {
        executablePath: '/usr/bin/chromium',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-gpu',
            '--no-experiments',
            '--hide-scrollbars',
            '--disable-plugins',
            '--disable-infobars',
            '--disable-translate',
            '--disable-pepper-3d',
            '--disable-extensions',
            '--disable-dev-shm-usage',
            '--disable-notifications',
            '--disable-setuid-sandbox',
            '--disable-crash-reporter',
            '--disable-smooth-scrolling',
            '--disable-login-animations',
            '--disable-dinosaur-easter-egg',
            '--disable-accelerated-2d-canvas',
            '--disable-rtc-smoothness-algorithm',
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
    console.log("Escanee el QR para iniciar sesión en WhatsApp Web\n");
    console.log("███████████████████████████████████████████████████████\n");
});

wwebClient.on('authenticated', () => {
    botLog('Autenticado.');
});

wwebClient.on('auth_failure', (msg) => {
    botLogError('Fallo de autenticación.', msg);
});

wwebClient.on('disconnected', (reason) => {
    botLogError('Se ha cerrado la sesión del cliente. Motivo:', reason);
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
        `                        Version: ${packageInfo.version}\n`+
        `                  whatsapp-web.js: 1.34.4\n`
    );
    console.log(` ${loading_bar} [ ${percent} % ]\n`);
});

wwebClient.on('ready', () => {
    if (clientStarted === false) {
        clientStarted = true;
    } else { return; }

    console.clear();
    botLog('El cliente ha iniciado.');

    const startTime = Date.now();
    const commandPath: string = '../commands';
    let commandExecution = require(`${commandPath}/commands.js`).commandExecution;
    require(`${commandPath}/commandsList.js`);
    botLogOk("Comandos cargados.")

    if (!whatsappSettings.showMessagesInTheTerminal) { botLog('Mensajes ocultos.'); }

    // Hot-Swap
    if (commandsSettings.hotSwappingEnabled) {
        setInterval(() => {
            try {
                delete require.cache[require.resolve(`${commandPath}/commands.js`)];
                delete require.cache[require.resolve(`${commandPath}/commandsList.js`)];
                delete require.cache[require.resolve(`${commandPath}/sendResponses.js`)];
                delete require.cache[require.resolve(`./messageSending.js`)];
                delete require.cache[require.resolve(`../mendotran/mendotran.js`)];

                commandExecution = require(`${commandPath}/commands.js`).commandExecution;
                require(`${commandPath}/commandsList.js`);
            } catch (error) {
                console.error('Error al limpier la memoria caché:', error);
            }
        }, commandsSettings.hotSwappingTimer);
    }

    // Show edited messages in the terminal
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

        // Setting: Show messages in the terminal
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
