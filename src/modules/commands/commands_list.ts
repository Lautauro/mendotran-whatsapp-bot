import { MessageMedia } from "whatsapp-web.js";
import { command_example, createCommand, search_command, send_error_response, send_response } from "./commands.js";

/**
 * Basic commands
 */

createCommand(['ping'],
    (args, message) => {
        send_response('Pong!', message, {
            reaction: '🏓',
        })
    }, null, {
        name: 'Ping',
        description: 'Ping-pong! 🏓',
    })
.closeCommand()

createCommand(['pong'],
    (args, message) => {
        send_response('Ping!', message, {
            reaction: '🏓',
        })
    }, null, {
        name: 'Pong',
        description: 'Pong-ping! 🏓',
    })
.closeCommand()

// Quoted message example:
createCommand(['quote', 'cite'],
    async (args, message) => {
        message.getQuotedMessage().then((quotedMessage) => {
            if (quotedMessage.type === 'chat' || (quotedMessage.type === 'image' && quotedMessage.body.length)) {
                send_response(
                    `*" ${quotedMessage.body} "*\n\n` + 
                    // @ts-ignore
                    `- _${quotedMessage._data.notifyName}_`,
                    message
                );
            }
        })
    },
    {
        needQuotedMessage: true
    },
    {
        name: 'Quote this',
        description: 'This command makes an author quote with the selected message. It needs to quote a message to work.'
    })
.closeCommand();