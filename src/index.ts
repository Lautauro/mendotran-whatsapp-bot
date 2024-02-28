export const whatsappSettings = require('../config/whatsapp.json');
export const commandsSettings = require('../config/commands.json');
export const packageInfo = require('../package.json');

import { startWhatsAppWebClient } from './modules/whatsapp/whatsapp.js'; 

startWhatsAppWebClient();