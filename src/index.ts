export const whatsappSettings = require('../config/whatsapp.json');
export const commandsSettings = require('../config/commands.json');
export const mendotranSettings = require('../config/mendotran.json');
export const commandsPrefix = commandsSettings.commandPrefix ?? '';
export const packageInfo = require('../package.json');

import { botLogError } from './utils/botLog.js'

import { startWhatsAppWebClient } from './modules/whatsapp/client.js'; 
import fs from 'node:fs';

// Verificar si la base de datos existe
if (!fs.existsSync(`./json/${mendotranSettings.dataFile}`) || process.argv.includes('refresh')) {
    // Generar base de datos
    if (!process.argv.includes('refresh')) {
        botLogError(`No se ha encontrado el archivo de la base de datos en './json/${mendotranSettings.dataFile}'. `
            + `Se procederá a generar la base de datos.`
        );
    }
    
    require('./modules/mendotran/generateDatabase.js')
        .getMendotranDatabase()
        .then(() => {
            startWhatsAppWebClient();
        });
} else {
    startWhatsAppWebClient();
}
