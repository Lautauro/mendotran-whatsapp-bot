import { command_example, createCommand, search_command, send_error_response, send_response } from "./commands.js";
import { get_arrivals_by_location, get_metro_arrivals, get_stop_arrivals } from "../mendotran/mendotran.js";
import { Message } from "whatsapp-web.js";

/**
 * Genéricos
 */

createCommand(['ping'], (args, message) => {
        send_response('Pong!', message, {
            reaction: '🏓',
        })
    }, null, {
        name: 'Ping',
        description: 'Ping-pong! 🏓',
    })
.closeCommand();

/**
 * Mendotran
 */

function arrivals_location(message: Message, quote: Message, filter?: string) {
    if (quote.location) {
        get_arrivals_by_location({ lat: +quote.location.latitude, lon: +quote.location.longitude}, filter)
            .then((arrivals) => {
                send_response(arrivals, message, { 
                    reaction: '🚌',
                    messageOptions: {
                        linkPreview: false,
                    },
                });
            })
            .catch((error) => {
                send_error_response(error, message);
            });
    } else {
        send_error_response('Para usar este comando debe citar a un mensaje con una ubicación', message);
    }
}

// Micro
createCommand(['micro', 'm'], async (args, message) => {
        await send_response(null, message, { reaction: '⏳' });
        if (message.hasQuotedMsg) {
            message.getQuotedMessage().then((quote) => {
                arrivals_location(message, quote, args[0]);
                return;
            })
        } else {
            if (args[1]) {
                get_stop_arrivals(args[1], args[0])
                    .then((arrivals) => {
                        send_response(arrivals, message, { 
                            reaction: '🚌',
                            messageOptions: {
                                linkPreview: false,
                            },
                        });
                    })
                    .catch((error) => {
                        send_error_response(error, message);
                    });
            } else {
                send_error_response('Debe indicar un número de parada.', message);
                // @ts-ignore
                const example = command_example(search_command('micro'));
                send_response(example, message);
            }
        }
    }, null, {
        name: 'Mendotran - Micro',
        description: 'Obtener los horarios de un colectivo en una parada.\n\n' +
        '*Opcionalmente puede buscar los horarios de un micro enviando su ubicación.* ' +
        'Primero debe enviar su ubicación actual y luego citarla con el comando:\n\n' +
        '*Micro { Línea }*',
    })
    .addParameter('string', undefined, {
        name: 'Línea',
        description: 'La línea de colectivo de la cual desea saber sus horarios.',
        example: '330',
    })
    .addParameter('string', null, {
        name: 'Nº de parada',
        description: 'El número de parada del colectivo.',
        example: 'M1056',
    })
.closeCommand();

// Parada 
createCommand(['parada', 'p'], async (args, message) => {
        await send_response(null, message, { reaction: '⏳' });
        if (message.hasQuotedMsg) {
            message.getQuotedMessage().then((quote) => {
                arrivals_location(message, quote);
                return;
            })
        } else {
            if (args[0]) {
                get_stop_arrivals(args[0])
                    .then((arrivals) => {
                        send_response(arrivals, message, { 
                            reaction: '🚌',
                            messageOptions: {
                                linkPreview: false,
                            },
                        });
                    })
                    .catch((error) => {
                        send_error_response(error, message);
                    });
            } else {
                send_error_response('Debe indicar un número de parada.', message);
                // @ts-ignore
                const example = command_example(search_command('parada'));
                send_response(example, message);
            }
        }
    }, null, {
        name: 'Mendotran - Parada',
        description: 'Obtener los horarios de una parada de colectivos.\n\n' +
        '*Opcionalmente puede buscar los horarios de una parada enviando su ubicación.* ' +
        'Primero debe enviar su ubicación actual y luego citarla con el comando: *Parada*',
    })
    .addParameter('string', null, {
        name: 'Nº de parada',
        description: 'El número de parada de la cual desea saber sus horarios.',
        example: 'M1056',
    })
.closeCommand();

// Metrotranvia
createCommand(['metro', 'metrotranvia', 'metrotranvía', 'estacion', 'estación'], async (args, message) => {
    await send_response(null, message, { reaction: '⏳' });
    get_metro_arrivals(args.join(' '))
        .then((arrivals)=>{
            send_response(arrivals, message, { 
                reaction: '🚋',
            });
        })
        .catch((error) => {
            send_error_response(error, message);
        })
    }, null, {
        name: 'Mendotran - Metrotranvía',
        description: 'Obtener los horarios de una estación de metrotranvía.',
    })
    .addParameter('string', undefined, {
        name: 'Nombre de la estación', 
        example: 'Piedra buena'
    })
.closeCommand();