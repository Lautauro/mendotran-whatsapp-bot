import fs from 'node:fs';
import mendotranSettings from './config/mendotran.json';
import { start_whatsappweb_client } from './modules/whatsapp/whatsapp';
import { bot_log } from './utils/bot_log';

if (!fs.existsSync(`./json/${mendotranSettings.dataFile}`) || process.argv[2] == 'refresh') {
    bot_log('Generando base de datos de Mendotran.');
    require('./modules/mendotran/generate_database.js').get_mendotran_database()
        .then(() => {
            start_whatsappweb_client();
        });
} else {
    start_whatsappweb_client();
}