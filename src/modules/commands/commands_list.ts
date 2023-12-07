import { createCommand, send_response } from "./commands.js";

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