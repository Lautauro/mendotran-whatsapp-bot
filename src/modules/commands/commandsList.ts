import { createCommand } from "./commands.js";
import { sendResponse } from "./sendResponses.js";

/**
 * Basic commands
 */

createCommand(['ping'], {
    info: {
        name: 'Ping',
        description: 'Ping-pong! 🏓',
    }
    })
    .setCallback(async (args, message) => {
        await sendResponse('Pong!', message, {
            reaction: '🏓',
        });
    })
.closeCommand();

createCommand(['pong'], {
    info: {
        name: 'Pong',
        description: 'Ping-pong! 🏓',
    }
    })
    .setCallback(async (args, message) => {
        await sendResponse('Ping!', message, {
            reaction: '🏓',
        });
    })
.closeCommand();