import { ScheduledArrival, Position, MetroStopInfo, MendotranData, StopInfo } from '../../ts/interfaces/mendotran.d.js';
import { fetchJsonMendotran } from './fetchJsonMendotran.js';
import { getTimeString } from '../../utils/getTimeString.js';
import { botLog, botLogError } from '../../utils/botLog.js';
import { BusColor, MetroData, StopCode } from '../../ts/types/mendotran.js';
import { mendotranSettings } from '../../index.js';
import { CommandError } from '../commands/commands.js';
import { BUS_COLOR_LIST, getBusColor, timeToEmoji } from './emojis.js';

// Base de datos de Mendotran  
const MENDOTRAN_DATABASE: MendotranData = require(`../../../json/${mendotranSettings.dataFile}`);
const MENDOTRAN_METRO_DATABASE: MetroData = require(`../../../json/metrotranvia.json`);

/**
 * Ordenar la lista de llegadas de colectivos según su proximidad.
 * @param {ScheduledArrival[]} arrivals - Objeto de llegadas.
 * @returns {ScheduledArrival[]} Lista ordenada
 */
function sortByArrivalTime(arrivals: ScheduledArrival[]): ScheduledArrival[] {
    if (arrivals.length === 1) {
        arrivals[0].arrivalTime = arrivals[0].predicted ? arrivals[0].predictedArrivalTime : arrivals[0].scheduledArrivalTime;
    } else {
        arrivals.sort((a: ScheduledArrival, b: ScheduledArrival) => {
            a.arrivalTime = a.predicted ? a.predictedArrivalTime : a.scheduledArrivalTime;
            b.arrivalTime = b.predicted ? b.predictedArrivalTime : b.scheduledArrivalTime;

            return a.arrivalTime - b.arrivalTime;
        });
    }
    return arrivals;
}

/**
 * La función recibe el objeto con la información de las llegadas
 * y formatea las mismas en una cadena de texto que luego será
 * enviada al usuario.
 * @param {ScheduledArrival[]} arrivals - Objeto de llegadas.
 * @returns {string} Cadena de texto con los horarios ordenados por proximidad.
 */
function busArrivalsString(arrivals: ScheduledArrival[]): string {
    let text: string = '';
    for (let i = 0; i < arrivals.length; i++) {
        // Corregir detalles en el letrero del colectivo
        let tripHeadsign = arrivals[i].tripHeadsign
            .trim()
            .replaceAll(/\s\s+/g, ' ')                    // Borrar doble espacios
            .replaceAll(/(\s|\b)(-|–)(\s|\b)/g, ', ')   // Remplazar guiones por comas
            .toUpperCase();

        if (tripHeadsign.charAt(tripHeadsign.length).match(/\W/i)) {
            tripHeadsign = tripHeadsign.slice(0, tripHeadsign.length);
        }
        
        // No repetir nombres de colectivos
        if (arrivals[i].tripHeadsign !== arrivals[i - 1]?.tripHeadsign) {
            let busColor: BusColor = BUS_COLOR_LIST[0];
            if (MENDOTRAN_DATABASE.buses[arrivals[i].routeShortName]) {
                busColor = MENDOTRAN_DATABASE.buses[arrivals[i].routeShortName].color;
            } else {
                botLogError(`No se ha podido cargar el color del micro "${arrivals[i].routeShortName}".`);
            }

            if (text.length > 0) { text += '\n\n'; }

            text += `${busColor} *${arrivals[i].routeShortName} - ${tripHeadsign}* ${busColor}\n\n`;
        } else {
            text += '\n\n';
        }

        // Hora de llegada
        text += `> ${timeToEmoji(arrivals[i].arrivalTime)} ${getTimeString(arrivals[i].arrivalTime, true, true)} hs`;
        
        const minutesLeft = Math.floor((arrivals[i].arrivalTime - Date.now()) / 60000);
        
        if (minutesLeft > 0) {
            // Indicar cuantos minutos y/o horas faltan.
            if (minutesLeft >= 60) {
                const hours = Math.trunc(minutesLeft / 60);
                text += `\n> ⏳ ${hours} hora${hours > 1 ? 's' : ''} `;
                
                const minutes = minutesLeft % 60;
                if (minutes) {
                    text += `y ${minutes} minuto${minutes > 1 ? 's' : ''} `;
                }

                // Emojis expresivos
                if (minutesLeft < 90) {
                    text += `😩`;
                } else if (minutesLeft < 120) {
                    text += `😭`;
                } else {
                    text += `💀`;
                }

            } else {
                text += `\n> ⏳ ${minutesLeft} minuto${minutesLeft > 1 ? 's' : ''}`;
            }
            
            if (arrivals[i].predicted) {
                const delay = Math.floor((arrivals[i].scheduledArrivalTime - arrivals[i].predictedArrivalTime) / 60000);
                
                // Retraso
                if (delay === 0) {
                    text += `\n> 🟢 A tiempo`;
                } else if (delay > 0) {
                    text += `\n> 🔴 ${delay} minuto${delay > 1 ? 's' : ''} antes`;
                } else if (delay < 0) {
                    text += `\n> 🔵 ${Math.abs(delay)} minuto${delay < -1 ? 's' : ''} tarde`;
                    if (delay <= -10 && delay > -15) { text += ' 😬'; }
                    if (delay <= -15 && delay > -20) { text += '... Aún hay esperanzas 🫠'; }
                    if (delay <= -20) { text += '... Quizá deba buscar una alternativa 🫥'; }
                }
            } else {
                // Horario planificado
                text += `\n> ⚫ Planificada`;
            }
        } else {
            text += `\n> 🚍 *Arribando*`;
        }
    }
    return text;
}

/**
 * Busca los horarios de una parada de colectivos, opcionalmente los filtra.
 * @param {string} stopNumber - Número de la parada.
 * @param {string} filter - Opcional: Indica una linea de colectivo para ser filtrada.
 * @returns {Promise<string>} Cadena de texto con los horarios ordenados por proximidad.
 */
export async function getStopArrivals(stopNumber: string, filter?: string): Promise<string> {
    if (!MENDOTRAN_DATABASE || !MENDOTRAN_DATABASE.stops) {
        throw new CommandError('No se ha podido cargar la base de datos de Mendotran.');
    }

    if (!stopNumber.match(/^(M|m)+\d+$/i) && isNaN(+stopNumber)) {
        throw new CommandError(
            `"*${stopNumber}*" no es una parada. El formato ha de ser similar al siguiente:\n\n` +
            `\`M1234\` *ó* \`1234\` 🤓`
        );
    }
    
    stopNumber = stopNumber.toUpperCase();

    // @ts-ignore
    const stop: StopCode = `${stopNumber.lastIndexOf('M') == 0 ? '' : 'M'}${stopNumber}`;

    botLog(`Buscando parada: ${stop}`);
    if (!MENDOTRAN_DATABASE.stops[stop]) {
        throw new CommandError(`No existe la parada *${stop}*.`);
    }
    
    if (filter) { 
        filter = filter.toString();
        
        botLog(`Buscando línea:  ${filter}`);
        if (!MENDOTRAN_DATABASE.stops[stop].busList.includes(filter)) {
            throw new CommandError(`El micro *${filter}* no pasa por la parada *${stop}*.`);
        }
    }

    return await fetchJsonMendotran(`${mendotranSettings.api}/arrivals-and-departures-for-stop/${MENDOTRAN_DATABASE.stops[stop].id}.json`)
        .then((json) => {
            let arrivals: ScheduledArrival[] = json.data?.entry?.arrivalsAndDepartures;     

            if (!arrivals || arrivals.length === 0 ) {
                return `🚎 Sin llegadas para la parada *${stop}* 🏃‍♀️`;
            }

            // De haber sido indicado, filtrar micros
            if (filter) {
                arrivals = arrivals.filter((bus) => { return bus.routeShortName === filter; });

                if (arrivals.length === 0) {
                    return `🚎 Sin llegadas para *${filter}* en la parada *${stop}* 🏃‍♀️`;
                }
            }

            // Ordenar micros según horario de llegada
            sortByArrivalTime(arrivals);

            // String
            let text = `🚦 *Parada ${stop}${filter ? ' - Línea ' + filter : ''}* 🚦\n\n`
                        + busArrivalsString(arrivals)
                        + `\n\n📍 *${MENDOTRAN_DATABASE.stops[stop].address}* 📍`;

            return text;
        })
        .catch((error) => {
            throw handleErrors(error);
        });
}

/**
 * Calcular distancia entre un punto (x1, y1) y (x2, y2).
 * @param x1 - Valor de x1.
 * @param y1 - Valor de y1.
 * @param x2 - Valor de x2.
 * @param y2 - Valor de y2.
 * @returns {number} Distancia.
 */
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

/**
 * Busca la parada más cercana a una ubicación geográfica.
 * @param {Position} position - Posición geográfica.
 * @returns {Promise<string>} Lista de paradas ordenadas por proximidad.
 */
async function getStopsNear(position: Position): Promise<StopInfo[]> {
    if (!MENDOTRAN_DATABASE) {
        throw new CommandError('No se ha podido cargar la base de datos de Mendotran.');
    }
    
    return await fetchJsonMendotran(`${mendotranSettings.api}/stops-for-location.json?platform=web&v=&lat=${position[0]}&lon=${position[1]}&latSpan=0.006&lonSpan=0.01&version=1.0`)
        .then(async (json) => {
            if (!json.data?.list || json.data.list.length === 0) {
                throw new CommandError(
                    'No se han encontrado paradas de Mendotran cercanas a la ubicación.\n\n🧭 ❓'
                );
            }

            const stopsAround: StopInfo[] = json.data?.list.sort((a: StopInfo, b: StopInfo) => {
                if (!a.distance) { a.distance = calculateDistance(position[0], position[1], a.lat, a.lon); }
                if (!b.distance) { b.distance = calculateDistance(position[0], position[1], b.lat, b.lon); }
                return a.distance - b.distance;
            });

            return stopsAround;
        })
        .catch((error) => {
            throw handleErrors(error);
        });
}

/**
 * Busca las parada más cercana a una ubicación geográfica.
 * @param {Position} position - Posición geográfica.
 * @returns {Promise<string>} Cadena de texto con un listado de colectivos por parada.
 */
export async function stopsAroundInfo(position: Position, length: number = 0): Promise<string> {
    const stopsAround: StopInfo[] = await getStopsNear(position);
    stopsAround.splice(length); // Recortar lista
    let str: string = `🧭 *Las ${stopsAround.length} paradas más cercanas* 🧭\n\n`;

    for (let i = 0; i < stopsAround.length; i++) {
        const stopData = MENDOTRAN_DATABASE.stops[stopsAround[i].code];
        let linea: string = '';

        str +=  `🚏 *${stopsAround[i].code}:* ${stopsAround[i].address} 🚏\n`;

        for (let j = 0; j < stopData.busList.length; j++) {
            if (linea !== stopData.busList[j].charAt(0)) {
                str += `\n> ${getBusColor(stopData.busList[j])} `;
                linea = stopData.busList[j].charAt(0);
            } 

            str += `*${stopData.busList[j]}*`;

            if (stopData.busList.length > 1 && j !== stopData.busList.length - 1) {
                if (linea === stopData.busList[j + 1].charAt(0)) {
                    str += ', ';
                }
            }
        }
        if (i !== stopsAround.length - 1) { str += `\n\n`; }
    }
    return str;
}

/**
 * Busca la parada más cercana a una ubicación geográfica, opcionalmente filtra
 * los horarios de un colectivo particular.
 * @param {Position} position - Posición geográfica.
 * @param {string} filter - Linea de colectivo que se desea filtrar.
 * @returns {Promise<string> } Cadena de texto con los horarios ordenados por proximidad.
 */
export async function nearestStopInfo(position: Position, filter?: string): Promise<string> {   
    const stopsAround: StopInfo[] = await getStopsNear(position);
    return await getStopArrivals(stopsAround[0].code, filter);
}

/**
 * Buscar los horarios de una estación de metro.
 * @param {string} stopName - Nombre de la estación.
 * @returns {Promise<string>} Cadena de texto con los horarios del metro-tranvía.
 */
export async function getMetroArrivals(stopName: string): Promise<string> {
    return await searchMetroStop(stopName)
        .then(async (stop: MetroStopInfo) => {           
            const metro100Json = await fetchJsonMendotran(
                `${mendotranSettings.api}/arrivals-and-departures-for-stop/${MENDOTRAN_DATABASE.stops[stop["100"]].id}.json`
            );

            const metro101Json = await fetchJsonMendotran(
                `${mendotranSettings.api}/arrivals-and-departures-for-stop/${MENDOTRAN_DATABASE.stops[stop["101"]].id}.json`
            );
            
            const metro100Arrivals = sortByArrivalTime(metro100Json.data?.entry?.arrivalsAndDepartures);
            const metro101Arrivals = sortByArrivalTime(metro101Json.data?.entry?.arrivalsAndDepartures);

            // Limitar número de llegadas que se muestran
            const arrivalsLimit = 2;
            const metro100Restantes = metro100Arrivals.length - arrivalsLimit;
            const metro101Restantes = metro101Arrivals.length - arrivalsLimit;

            metro100Arrivals.splice(arrivalsLimit);
            metro101Arrivals.splice(arrivalsLimit);

            if (metro100Arrivals.length > 0 || metro101Arrivals.length > 0) {
                let text = `🚦 *Estación ${Array.isArray(stop.name) ? stop.name.join(' / ') : stop.name}* 🚦\n\n`
                        + (metro100Arrivals.length > 0 ? busArrivalsString(metro100Arrivals) : `🚋 *Sin llegadas para el andén ${stop.direction[0]}* 🏃‍♀️`)
                        + (metro100Restantes > 0 ? `\n\n> 🚏 *${metro100Restantes} más en camino*` : '')
                        + '\n\n'
                        + (metro101Arrivals.length > 0 ? busArrivalsString(metro101Arrivals) : `🚋 *Sin llegadas para el andén ${stop.direction[1]}* 🏃‍♀️`)
                        + (metro101Restantes > 0 ? `\n\n> 🚏 *${metro101Restantes} más en camino*` : '')
                        + `\n\n📍 *${MENDOTRAN_DATABASE.stops[stop['100']].address}* 📍`;
                return text;
            } else {
                return `🚋 Sin llegadas para la estación 🏃‍♀️`;
            }
        })
        .catch((error) => {
            throw handleErrors(error);
        });
}

/**
 * Busca información de una estación de metro-tranvía en la base de datos. Esta función
 * iterará sobre cada posible nombre de estación ya que hay paradas con hasta 2 formas
 * de ser llamadas. Por ejemplo: "Pedro Molina / UTN".
 * @param {string} stopName - Nombre de la estación.
 * @returns {Promise<MetroStopInfo>}
 */
async function searchMetroStop(stopName: string): Promise<MetroStopInfo> {
    if (MENDOTRAN_METRO_DATABASE && MENDOTRAN_DATABASE) {
        stopName =  stopName.replaceAll(/á/gi, 'a') // Ignorar tildes
                    .replaceAll(/é/gi, 'e')
                    .replaceAll(/í/gi, 'i')
                    .replaceAll(/ó/gi, 'o')
                    .replaceAll(/ú/gi, 'u');

        for (let key of MENDOTRAN_METRO_DATABASE) {
            if (key.name) {
                if (Array.isArray(key.name)) {
                    if (key.name.some((stationName) => stationName.search(new RegExp(stopName, 'i')) >= 0)) {
                        return key;
                    } 
                } else {
                    if (key.name.search(new RegExp(stopName, 'i')) >= 0) {
                        return key;
                    }
                }
            }
        }
        throw new CommandError(`No se ha encontrado la estación *"${stopName}"*.`);
    } else {
        throw new CommandError('No se ha podido cargar la base de datos de Mendotran.');
    }
}

function handleErrors(error: Error | CommandError): string | CommandError {
    if (error instanceof CommandError) {
        throw error;
    }

    console.error('\n', error, '\n');
    if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
            throw new CommandError(
                'La petición tardó demasiado en responder. Esto puede deberse a una baja en la velocidad del servidor.\n\n*Por favor, vuelva a intentarlo.*\n\n🐌 🦥'
            );
        } else {
            throw new CommandError(
                `Ha ocurrido un error al procesar la petición, "*${error.name}*".\n\n*Por favor, vuelva a intentarlo.*\n\n🤖`
            );
        }
    }
    throw new CommandError('Ha ocurrido un error desconocido.\n\n*Por favor, vuelva a intentarlo.*\n\n😅');
}