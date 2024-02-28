import { createCommand, sendResponse } from "./commands.js";

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
        sendResponse('Pong!', message, {
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
        sendResponse('Ping!', message, {
            reaction: '🏓',
        })
    })
.closeCommand();