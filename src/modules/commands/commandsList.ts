import { createCommand } from "./commands.js";
import { sendResponse, sendErrorResponse } from "./sendResponses.js";
import { getMetroArrivals, getStopArrivals } from "../mendotran/mendotran.js";

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

/**
 * Mendotran
 */

// Micro
createCommand(['micro', 'm', '🚍'], {
    options: {
        disableQuotationMarks: true,
    },
    info: {
        name: 'Mendotran - Micro',
        description: 'Obtener los horarios de un colectivo en una parada.'
    }})
    .addParameter('number', {
        name: 'Línea',
        description: 'La línea de colectivo de la cual desea saber sus horarios.',
        example: '608',
    })
    .addParameter('string', {
        name: 'Nº de parada',
        description: 'El código de parada del colectivo.',
        example: 'M1028',
    })
    .setCallback(async function (args, message) {
        await getStopArrivals(args.slice(1).join(" "), args[0] ? args[0].toString() : args[0])
        .then(async (arrivals) => {
            await sendResponse(arrivals, message, {
                reaction: '🚌',
                messageOptions: { linkPreview: false },
            });
        });
    })
.closeCommand();

// Parada 
createCommand(['parada', 'p', '🚏'], {
    options: {
        disableQuotationMarks: true,
    },
    info: {
        name: 'Mendotran - Parada',
        description: 'Obtener los horarios de una parada de colectivos.',
    }})
    .addParameter('string', {
        name: 'Nº de parada',
        description: 'El código de parada de la cual desea saber sus horarios.',
        example: 'M1012',
    })
    .setCallback(async function (args, message) {
        await getStopArrivals(args[0])
            .then(async (arrivals) => {
                await sendResponse(arrivals, message, {
                    reaction: '🚌',
                    messageOptions: {
                        linkPreview: false,
                    },
                });
            });
    })
.closeCommand();

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
