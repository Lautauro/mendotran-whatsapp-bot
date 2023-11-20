import { MessageMedia } from "whatsapp-web.js";
import { command_example, createCommand, search_command, send_error_response, send_response } from "./commands.js";

/**
 * Genericos
 */
createCommand(['ping'], (args, message) => {
    send_response('Pong!', message, {
        reaction: '🏓',
    })
}, null, {
    name: 'Ping',
    description: 'Ping-pong! 🏓',
}).closeCommand()

createCommand(['pong'], (args, message) => {
    send_response('Ping!', message, {
        reaction: '🏓',
    })
}, null, {
    name: 'Pong',
    description: 'Pong-ping! 🏓',
}).closeCommand()

createCommand(['help'], (args, message) => {
    const command = search_command(args[0]);

    if (command) {
        send_response(command_example(command), message);
    }

}).addParameter('string')
.closeCommand();

createCommand(['view'], async (args, message) => {
    message.getQuotedMessage().then((quotedMsg) => {
        // @ts-ignore
        if (!quotedMsg._data.isViewOnce) {  
            send_error_response('El mensaje citado no es de una sola visualización.', message);
            return;
        }
        quotedMsg.downloadMedia().then((image) => {
            if (image) {
                send_response(new MessageMedia(image.mimetype, image.data, image.filename, image.filesize), message);
            } else {
                send_error_response('No se ha podido descargar el contenido del mensaje.', message);
            }
        });
    })    
    }, {
        needQuotedMessage: true,
        adminOnly: false,
    }).closeCommand();