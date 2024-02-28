export const whatsappSettings = require('../config/whatsapp.json');
export const commandsSettings = require('../config/commands.json');
export const packageInfo = require('../package.json');

import { startWhatsAppWebClient } from './modules/whatsapp/whatsapp.js'; 
import fs from 'node:fs';
import { botLog } from './utils/botLog';

const mendotranSettings = require('../config/mendotran.json');

if (!fs.existsSync(`./json/${mendotranSettings.dataFile}`) || process.argv[2] == 'refresh') {
    botLog('Generando base de datos de Mendotran.');
    require('./modules/mendotran/generate_database.js').get_mendotran_database()
        .then(() => {
            startWhatsAppWebClient();
        });
} else {
    startWhatsAppWebClient();
}
