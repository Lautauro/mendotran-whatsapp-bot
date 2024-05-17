export const whatsappSettings = require('../config/whatsapp.json');
export const commandsSettings = require('../config/commands.json');
export const mendotranSettings = require('../config/mendotran.json');
export const packageInfo = require('../package.json');
export const commandsPrefix = commandsSettings.commandPrefix ?? '';

import { startWhatsAppWebClient } from './modules/whatsapp/client.js'; 
import fs from 'node:fs';

if (!fs.existsSync(`./json/${mendotranSettings.dataFile}`) || process.argv[2] == 'refresh') {
    require('./modules/mendotran/generateDatabase.js').getMendotranDatabase()
        .then(() => {
            startWhatsAppWebClient();
        });
} else {
    startWhatsAppWebClient();
}
