export const whatsappSettings = require('../config/whatsapp.json');
export const commandsSettings = require('../config/commands.json');
export const packageInfo = require('../package.json');

import { start_whatsappweb_client } from './modules/whatsapp/whatsapp'; 

start_whatsappweb_client();