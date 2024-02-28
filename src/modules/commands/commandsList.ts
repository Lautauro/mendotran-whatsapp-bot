import { COMMAND_ERROR_MESSAGES, createCommand, sendErrorResponse, sendResponse } from "./commands.js";
import { get_arrivals_by_location, get_metro_arrivals, get_stop_arrivals } from "../mendotran/mendotran.js";
import { Message } from "whatsapp-web.js";

/**
 * Genéricos
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

/**
 * Mendotran
 */

function arrivals_location(message: Message, quote: Message, filter?: string) {
    if (quote.location) {
        get_arrivals_by_location({ lat: +quote.location.latitude, lon: +quote.location.longitude}, filter)
            .then((arrivals) => {
                sendResponse(arrivals, message, { 
                    reaction: '🚌',
                    messageOptions: { linkPreview: false },
                });
            })
            .catch((error) => {
                sendErrorResponse(error, message);
            });
    } else {
        sendErrorResponse('Para usar este comando debe citar a un mensaje con una ubicación', message);
    }
}

// Micro
createCommand(['micro', 'm'], {
    info: {
        name: 'Mendotran - Micro',
        description: 'Obtener los horarios de un colectivo en una parada.\n\n' +
        '*Opcionalmente puede buscar los horarios de un micro enviando su ubicación.* ' +
        'Primero debe enviar su ubicación actual y luego citarla con el comando:\n\n' +
        '*Micro { Línea }*',
    }})
    .addParameter('number', {
        name: 'Línea',
        description: 'La línea de colectivo de la cual desea saber sus horarios.',
        example: '330',
    })
    .addParameter('string', {
        name: 'Nº de parada',
        description: 'El número de parada del colectivo.',
        note: 'No es estríctamente necesaria la "M".',
        example: 'M1056',
    }, null)
    .setCallback(async function (args, message) {
        if (message.hasQuotedMsg) {
            message.getQuotedMessage()
                .then((quote) => {
                    arrivals_location(message, quote, args[0]);
                });
            return;
        } else {
            if (args[1] === null) {
                // @ts-ignore
                return sendErrorResponse(COMMAND_ERROR_MESSAGES.MISSING_ARGUMENT(this, [args[0]]), message);
            } else {
                get_stop_arrivals(args[1], args[0])
                    .then((arrivals) => {
                        sendResponse(arrivals, message, {
                            reaction: '🚌',
                            messageOptions: { linkPreview: false },
                        });
                    })
                    .catch((error) => {
                        sendErrorResponse(error, message);
                    });
            }
        }
    })
.closeCommand();

// Parada 
createCommand(['parada', 'p'], {
    info: {
        name: 'Mendotran - Parada',
        description: 'Obtener los horarios de una parada de colectivos.\n\n' +
        '*Opcionalmente puede buscar los horarios de una parada enviando su ubicación.* ' +
        'Primero debe enviar su ubicación actual y luego citarla con el comando: *Parada*',
    }})
    .addParameter('string', {
        name: 'Nº de parada',
        description: 'El número de parada de la cual desea saber sus horarios.',
        example: 'M1056',
    }, null)
    .setCallback(async function (args, message) {
        if (message.hasQuotedMsg) {
            message.getQuotedMessage().then((quote) => {
                arrivals_location(message, quote);
                return;
            })
        } else {
            if (args[0]) {
                get_stop_arrivals(args[0])
                    .then((arrivals) => {
                        sendResponse(arrivals, message, { 
                            reaction: '🚌',
                            messageOptions: {
                                linkPreview: false,
                            },
                        });
                    })
                    .catch((error) => {
                        sendErrorResponse(error, message);
                    });
            } else {
                // @ts-ignore
                return sendErrorResponse(COMMAND_ERROR_MESSAGES.MISSING_ARGUMENT(this, []), message);
            }
        }
    })
.closeCommand();

// Metrotranvia
createCommand(['metro', 'metrotranvia', 'metrotranvía', 'estacion', 'estación'], {
    info: {
        name: 'Mendotran - Metrotranvía',
        description: 'Obtener los horarios de una estación de metrotranvía.',
    }})
    .addParameter('string', {
        name: 'Nombre de la estación', 
        example: 'Piedra buena'
    })
    .setCallback(async (args, message) => {
        get_metro_arrivals(args.join(' '))
            .then((arrivals)=>{
                sendResponse(arrivals, message, { 
                    reaction: '🚋',
                });
            })
            .catch((error) => {
                sendErrorResponse(error, message);
            })
    })
.closeCommand();