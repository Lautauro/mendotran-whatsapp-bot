import { Message } from "whatsapp-web.js";
import { createCommand, COMMAND_ERROR_MESSAGES } from "./commands.js";
import { sendResponse, sendErrorResponse } from "./sendResponses.js";
import { nearestStopInfo, getMetroArrivals, getStopArrivals, stopsAroundInfo } from "../mendotran/mendotran.js";

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

async function arrivalsByLocation(message: Message, quote: Message, filter?: string) {
    if (quote.location) {
        await nearestStopInfo({ lat: +quote.location.latitude, lon: +quote.location.longitude}, filter)
            .then(async (arrivals) => {
                await sendResponse(arrivals, message, { 
                    reaction: '🚌',
                    messageOptions: { linkPreview: false },
                });
            });
    } else {
        await sendErrorResponse('Para usar este comando debe citar a un mensaje con una ubicación', message);
    }
}

// Micro
createCommand(['micro', 'm', '🚍'], {
    options: {
        disableQuotationMarks: true,
    },
    info: {
        name: 'Mendotran - Micro',
        description: 'Obtener los horarios de un colectivo en una parada.\n\n' +
        '*Opcionalmente puede buscar los horarios de un micro enviando su ubicación.* ' +
        'Primero debe enviar la ubicación y luego citar el mensaje con el comando:\n\n' +
        '*Micro* `Línea`',
    }})
    .addParameter('number', {
        name: 'Línea',
        description: 'La línea de colectivo de la cual desea saber sus horarios.',
        example: '608',
    })
    .addParameter('string', {
        name: 'Nº de parada',
        description: 'El número de parada del colectivo. No es estrictamente necesaria la letra "M" al comienzo.',
        example: 'M1028',
    }, null)
    .setCallback(async function (args, message) {
        if (message.hasQuotedMsg) {
            await message.getQuotedMessage()
                .then(async (quote) => {
                    await arrivalsByLocation(message, quote, args[0]);
                    return;
                });
            return;
        } else {
            if (args[1] === null) {
                // @ts-ignore
                await sendErrorResponse(COMMAND_ERROR_MESSAGES.MISSING_ARGUMENT(this, [args[0]]), message);
                return;
            } else {
                await getStopArrivals(args.slice(1).join(" "), args[0])
                    .then(async (arrivals) => {
                        await sendResponse(arrivals, message, {
                            reaction: '🚌',
                            messageOptions: { linkPreview: false },
                        });
                    });
            }
        }
    })
.closeCommand();

// Parada 
createCommand(['parada', 'p', '🚏'], {
    options: {
        disableQuotationMarks: true,
    },
    info: {
        name: 'Mendotran - Parada',
        description: 'Obtener los horarios de una parada de colectivos.\n\n' +
        '*Opcionalmente puede buscar los horarios de una parada enviando su ubicación.* ' +
        'Primero debe enviar la ubicación y luego citar el mensaje con el comando:\n\n*Parada*',
    }})
    .addParameter('string', {
        name: 'Nº de parada',
        description: 'El número de parada de la cual desea saber sus horarios. ' +
            'No es estríctamente necesaria la letra "M" al comienzo.',
        example: 'M1012',
    }, null)
    .setCallback(async function (args, message) {
        if (message.hasQuotedMsg) {
            await message.getQuotedMessage().then(async (quote) => {
                await arrivalsByLocation(message, quote);
                return;
            })
        } else {
            if (args[0]) {
                await getStopArrivals(args[0])
                    .then(async (arrivals) => {
                        await sendResponse(arrivals, message, { 
                            reaction: '🚌',
                            messageOptions: {
                                linkPreview: false,
                            },
                        });
                    });
            } else {
                // @ts-ignore
                await sendErrorResponse(COMMAND_ERROR_MESSAGES.MISSING_ARGUMENT(this, []), message);
                return;
            }
        }
    })
.closeCommand();

// Paradas cercanas
createCommand(['paradas', '📍'], {
    options: {
        needQuotedMessage: true,
    },
    info: {
        name: 'Mendotran - Paradas cercanas',
        description: 'Permite buscar las paradas más cercanas a una ubicación. ' +
        'Primero debe enviar la ubicación y luego citar el mensaje con el comando:\n\n*Paradas*',
    }})
    .setCallback(async (args, message) => {
        await message.getQuotedMessage().then(async (quote) => {
            if (quote.location) {
                const position = {
                    lat: +quote.location.latitude,
                    lon: +quote.location.longitude,
                };

                await sendResponse(await stopsAroundInfo(position, 4), message, {
                    reaction: '📍'
                });
                return;
            } else {
                await sendErrorResponse('Para usar este comando debe citar a un mensaje con una ubicación', message);
            }
        })
    })
.closeCommand()

// Metrotranvia
createCommand(['metro', 'metrotranvia', 'metrotranvía', 'estacion', 'estación', '🚊'], {
    options: {
        disableQuotationMarks: true,
    },
    info: {
        name: 'Mendotran - Metrotranvía',
        description: 'Obtener los horarios de una estación de metrotranvía.',
    }})
    .addParameter('string', {
        name: 'Nombre de la estación', 
        example: 'Piedra buena'
    })
    .setCallback(async (args, message) => {
        await getMetroArrivals(args[0])
            .then(async (arrivals)=>{
                await sendResponse(arrivals, message, { 
                    reaction: '🚋',
                });
            });
    })
.closeCommand();