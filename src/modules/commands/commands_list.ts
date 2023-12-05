import { createCommand, send_error_response, send_response } from "./commands.js";
import { get_arrivals_by_location, get_stop_arrivals } from "../mendotran/mendotran.js";

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
}).closeCommand()

/**
 * Mendotran
 */

createCommand(['micro', 'm'],
    async (args, message) => {
        get_stop_arrivals(args[1], args[0])
            .then((arrivals) => {
                send_response(arrivals, message, { 
                    reaction: '🚌',
                });
            })
            .catch((error) => {
                send_error_response(error, message);
            });
    }, null, {
        name: 'Mendotran - Micro',
        description: 'Obtener los horarios de un colectivo en una parada.',
    })
    .addParameter('string', undefined, {
        name: 'Número de colectivo',
        description: 'El número de colectivo del cual desea saber sus horarios.',
        example: '330',
    })
    .addParameter('string', undefined, {
        name: 'Código de parada',
        description: 'El número de parada del colectivo.',
        example: 'M1056',
    })
    .closeCommand();
    
createCommand(['parada', 'p'],
    (args, message) => {
        get_stop_arrivals(args[0])
            .then((arrivals) => {
                send_response(arrivals, message, { 
                    reaction: '🚌',
                });
            })
            .catch((error) => {
                send_error_response(error, message);
            });
    }, null, {
        name: 'Mendotran - Parada',
        description: 'Obtener los horarios de una parada de colectivos.',
    })
    .addParameter('string', undefined, {
        name: 'Código de parada',
        description: 'El número de parada de la cual desea saber sus horarios.',
        example: 'M1056',
    })
    .closeCommand();

createCommand(['loc', 'l'],
    async (args, message) => {
        message.getQuotedMessage().then((quote) => {
            if (quote.location) {
                get_arrivals_by_location({ lat: +quote.location.latitude, lon: +quote.location.longitude}, args[0])
                    .then((arrivals) => {
                        send_response(arrivals, message, { 
                            reaction: '🚌',
                        });
                    })
                    .catch((error) => {
                        send_error_response(error, message);
                    });
            } else {
                send_error_response('Tenes que citar una ubicación capo', message);
            }
        });
    }, {
        needQuotedMessage: true,
    }, {
        name: 'Mendotran - Parada cercana',
        description: 'Obtener los horarios de la parada de colectivos más cercana.\n\n' +
        'Primero debe enviar su ubicación actual y luego citar esa ubicación con el comando *.loc*. '+
        'Opcionalmente puede decidir si quiere que solo se muestre una línea específica de colectivos.',
    })
    .addParameter('string', null, {
        name: 'Número de colectivo',
        description: 'El número de colectivo del cual desea saber sus horarios.',
        example: '330',
    })
.closeCommand();