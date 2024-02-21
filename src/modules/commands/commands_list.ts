import { createCommand, send_response } from "./commands.js";

/**
 * Basic commands
 */

createCommand(['ping'], {
    info: {
        name: 'Ping',
        description: 'Ping-pong! 🏓',
    }
    })
    .setCallback((args, message) => {
        send_response('Pong!', message, {
            reaction: '🏓',
        })
    })
.closeCommand();

createCommand(['pong'], {
    info: {
        name: 'Pong',
        description: 'Ping-pong! 🏓',
    }
    })
    .setCallback(function (args, message) {
        send_response('Ping!', message, {
            reaction: '🏓',
        })
    })
.closeCommand();