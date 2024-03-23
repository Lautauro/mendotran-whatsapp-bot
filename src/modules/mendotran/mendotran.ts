import { ScheduledArrival, Position, MetroStopInfo, MendotranData, StopInfo } from '../../ts/interfaces/mendotran.d.js';
import { fetchJsonMendotran } from '../../utils/fetchJsonMendotran.js';
import { getTimeString } from '../../utils/getTimeString.js';
import { botLogError } from '../../utils/botLog.js';
import { MetroData } from '../../ts/types/mendotran.js';
import { mendotranSettings } from '../../index.js';
import { CommandError } from '../commands/commands.js';

const emoji_time: readonly string[][] = [
    ['🕛', '🕧'], // 00 - 12
    ['🕐', '🕜'], // 01 - 13
    ['🕑', '🕝'], // 02 - 14
    ['🕒', '🕞'], // 03 - 15
    ['🕓', '🕟'], // 04 - 16
    ['🕔', '🕠'], // 05 - 17
    ['🕕', '🕡'], // 06 - 18
    ['🕖', '🕢'], // 07 - 19
    ['🕗', '🕣'], // 08 - 20
    ['🕘', '🕤'], // 09 - 21
    ['🕙', '🕥'], // 10 - 22
    ['🕚', '🕦'], // 11 - 23
];

function timeToEmoji(unixTime: number): string {
    const time: Date = new Date(unixTime);
    const minutes: number = time.getMinutes();
    const hours: number = time.getHours() % 12;
    
    return (emoji_time[hours][Math.round(minutes / 60)]);
}

// Mendotran
const mendotranData: MendotranData = require(`../../../json/${mendotranSettings.dataFile}`);
const mendotranMetroData: MetroData = require(`../../../json/metrotranvia.json`);

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

function busArrivalsString(arrivals: ScheduledArrival[]): string {
    let text = '';
    for (let i = 0; i < arrivals.length; i++) {
        // Corregir detalles de los letreros del colectivo
        arrivals[i].tripHeadsign = arrivals[i].tripHeadsign
            .trim()
            .replaceAll(/  +/g, ' ')                // Borrar doble espacios
            .replaceAll(/–/g, '-')
            .replaceAll(/ +- +|- +|-- +|-/g, ', ')  // Remplazar guiones por comas
            .toUpperCase();
        
        // No repetir nombres de colectivos
        if (arrivals[i].tripHeadsign !== arrivals[i - 1]?.tripHeadsign) {
            let busColor = '🔲';
            if (mendotranData.buses[arrivals[i].routeShortName]) {
                busColor = mendotranData.buses[arrivals[i].routeShortName].color;
            } else {
                botLogError(`No se ha podido cargar el color del micro "${arrivals[i].routeShortName}".`);
            }

            if (text.length > 0) { text += '\n\n'; }

            text += `${busColor} *${arrivals[i].routeShortName} - ${arrivals[i].tripHeadsign}* ${busColor}\n\n`;
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

export async function getStopArrivals(stopNumber: any, filter?: string): Promise<string> {
    if (!mendotranData) {
        throw new CommandError('No se ha podido cargar la base de datos de Mendotran.');
    }

    const stop = stopNumber.match(/\bM\d+\b/i) ? stopNumber.toUpperCase() : 'M' + stopNumber;

    if (stop.lastIndexOf('M') !== 0) {
        throw new CommandError(
            `"*${stopNumber}*" no es una parada. El formato ha de ser *M + Número de parada* ` +
            `o simplemente el número de la misma.\n\nPor ejemplo: \`M1234\` ó \`1234\``
            );
    }
        
    if (!mendotranData.stops || (mendotranData.stops && !mendotranData.stops[stop])) {
        throw new CommandError(`No existe la parada *${stop}*`);
    }
    
    if (filter) { filter = filter.toString(); }
    if (filter && !mendotranData.stops[stop].busList.includes(filter)) {
        throw new CommandError(`El micro *${filter}* no pasa por la parada *${stop}*`);
    }

    return await fetchJsonMendotran(`${mendotranSettings.api}/arrivals-and-departures-for-stop/${mendotranData.stops[stop].id}.json`)
        .then((json) => {
            let arrivals: ScheduledArrival[] = json.data?.entry?.arrivalsAndDepartures;     

            if (!arrivals || arrivals.length === 0 ) {
                throw new CommandError(`🚎 Sin llegadas para la parada *${stop}* 🏃‍♀️`);
            }

            // De haber sido indicado, filtrar micros
            if (filter) {
                arrivals = arrivals.filter((bus) => { return bus.routeShortName === filter; });

                if (arrivals.length === 0) {
                    throw new CommandError(`🚎 Sin llegadas para *${filter}* en la parada *${stop}* 🏃‍♀️`);
                }
            }

            // Ordenar micros según horario de llegada
            sortByArrivalTime(arrivals);

            // String
            let text = `🚦 *${stop}${filter ? ' - Línea ' + filter : ''}* 🚦\n\n`
                        + busArrivalsString(arrivals)
                        + `\n\n📍 *${mendotranData.stops[stop].address}* 📍`;

            return text;
        })
        .catch((error) => {
            throw handleErrors(error);
        });
}

function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

export async function getArrivalsByLocation(position: Position, filter?: string): Promise<string> {
    if (!mendotranData) {
        throw new CommandError('No se ha podido cargar la base de datos de Mendotran.');
    }
    
    return await fetchJsonMendotran(`${mendotranSettings.api}/stops-for-location.json?platform=web&v=&lat=${position.lat}&lon=${position.lon}&latSpan=0.006&lonSpan=0.01&version=1.0`)
        .then(async (json) => {
            if (!json.data?.list || json.data.list.length === 0) {
                throw new CommandError(
                    'No se han encontrado paradas de Mendotran cercanas a la ubicación.\n\n🧭 ❓'
                );
            }

            const stopsAround: StopInfo[] = json.data?.list.sort((a: StopInfo, b: StopInfo) => {
                if (!a.distance) { a.distance = calculateDistance(position.lat, position.lon, a.lat, a.lon); }
                if (!b.distance) { b.distance = calculateDistance(position.lat, position.lon, b.lat, b.lon); }
                return a.distance - b.distance;
            });

            return await getStopArrivals(stopsAround[0].code, filter);
        })
        .catch((error) => {
            throw handleErrors(error);
        });
}

// Metrotranvía
export async function getMetroArrivals(stopName: string): Promise<string> {
    return await searchMetroStop(stopName)
        .then(async (stop: MetroStopInfo) => {           
            const metro100Json = await fetchJsonMendotran(
                `${mendotranSettings.api}/arrivals-and-departures-for-stop/${mendotranData.stops[stop["100"]].id}.json`
            );

            const metro101Json = await fetchJsonMendotran(
                `${mendotranSettings.api}/arrivals-and-departures-for-stop/${mendotranData.stops[stop["101"]].id}.json`
            );
            
            let metro100Arrivals = sortByArrivalTime(metro100Json.data?.entry?.arrivalsAndDepartures);
            let metro101Arrivals = sortByArrivalTime(metro101Json.data?.entry?.arrivalsAndDepartures);

            // Limitar número de llegadas que se muestran
            const arrivalsLimit = 2;
            const metro100Restantes = metro100Arrivals.length - arrivalsLimit;
            const metro101Restantes = metro101Arrivals.length - arrivalsLimit;
            metro100Arrivals = metro100Arrivals.slice(0, arrivalsLimit);
            metro101Arrivals = metro101Arrivals.slice(0, arrivalsLimit);

            if (metro100Arrivals.length > 0 || metro101Arrivals.length > 0) {
                let text = `🚦 *Estación ${Array.isArray(stop.name) ? stop.name.join(' / ') : stop.name}* 🚦\n\n`
                        + (metro100Arrivals.length > 0 ? busArrivalsString(metro100Arrivals) : `🚋 *Sin llegadas para andén ${stop.direction[0]}* 🏃‍♀️`)
                        + (metro100Restantes > 0 ? `\n\n> 🚏 *${metro100Restantes} más en camino*` : '')
                        + '\n\n'
                        + (metro101Arrivals.length > 0 ? busArrivalsString(metro101Arrivals) : `🚋 *Sin llegadas para andén ${stop.direction[1]}* 🏃‍♀️`)
                        + (metro101Restantes > 0 ? `\n\n> 🚏 *${metro101Restantes} más en camino*` : '')
                        + `\n\n📍 *${mendotranData.stops[stop['100']].address}* 📍`;
                return text;
            } else {
                throw new CommandError(`🚋 Sin llegadas para la estación 🏃‍♀️`);
            }
        })
        .catch((error) => {
            throw handleErrors(error);
        });
}

async function searchMetroStop(stopName: string): Promise<MetroStopInfo> {
    if (mendotranMetroData && mendotranData) {
        stopName =  stopName.replaceAll(/á/gi, 'a') // Ignorar tildes
                    .replaceAll(/é/gi, 'e')
                    .replaceAll(/í/gi, 'i')
                    .replaceAll(/ó/gi, 'o')
                    .replaceAll(/ú/gi, 'u');

        const stop = searchMetroByName(mendotranMetroData, 'name', new RegExp(stopName, 'i'));
        if (stop) { return stop; }
        throw new CommandError(`No se ha encontrado la estación *"${stopName}"*.`);
    } else {
        throw new CommandError('No se ha podido cargar la base de datos de Mendotran.');
    }
}

function searchMetroByName(metroDataArray: any[], key: string | null, regExp: RegExp) {
    for (let value of metroDataArray) {
        let search;
        if (key) {
            if (value[key]) {
                if (Array.isArray(value[key])) {
                    if (searchMetroByName(value[key], null, regExp)) { return value; }
                    continue;
                }
                search = value[key];
            }
        } else {
            search = value;
        }
        if (search && typeof search === 'string' && search.search(regExp) >= 0) { return value; }
    }
    return undefined;
}

function handleErrors(error: Error | CommandError): string | CommandError {
    if (error instanceof CommandError) {
        throw error;
    }

    console.error('\n', error, '\n');
    if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
            throw new CommandError(
                'La petición tardó demasiado en responder. Vuelva a intentarlo.\n\n🐌 🦥'
            );
        } else {
            throw new CommandError(
                `Ha ocurrido un error al procesar la petición, "*${error.name}*". Vuelva a intentarlo.`
            );
        }
    }
    throw new CommandError('Ha ocurrido un error desconocido. Vuelva a intentarlo.\n\n😅');
}