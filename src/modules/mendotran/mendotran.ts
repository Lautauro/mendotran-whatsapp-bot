import { ScheduledArrival, Position, MetroStopInfo, MendotranData, StopInfo } from '../../ts/interfaces/mendotran.d.js';
import { fetch_json_mendotran } from '../../utils/fetch_json_mendotran.js';
import mendotranSettings from '../../config/mendotran.json';
import { get_time_string } from '../../utils/get_time_string.js';
import { bot_log, bot_log_error } from '../../utils/bot_log.js';
import { MetroData } from '../../ts/types/mendotran.js';

const emoji_time: readonly string[][] = [
    ['🕛','🕧'], // 00 - 12
    ['🕐','🕜'], // 01 - 13
    ['🕑','🕝'], // 02 - 14
    ['🕒','🕞'], // 03 - 15
    ['🕓','🕟'], // 04 - 16
    ['🕔','🕠'], // 05 - 17
    ['🕕','🕡'], // 06 - 18
    ['🕖','🕢'], // 07 - 19
    ['🕗','🕣'], // 08 - 20
    ['🕘','🕤'], // 09 - 21
    ['🕙','🕥'], // 10 - 22
    ['🕚','🕦'], // 11 - 23
];

function time_to_emoji(unixTime: number): string {
    const time: Date = new Date(unixTime);
    const minutes: number = time.getMinutes();
    const hours: number = time.getHours() % 12;
    
    return (emoji_time[hours][Math.round(minutes / 60)]);
}

// Mendotran
const mendotranData: MendotranData = require(`../../../json/${mendotranSettings.dataFile}`);
const mendotranMetroData: MetroData = require(`../../../json/metrotranvia.json`);

function sort_by_arrival_time(arrivals: ScheduledArrival[]): ScheduledArrival[] {
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

function bus_arrivals_string(arrivals: ScheduledArrival[]): string {
    let text = '';
    for (let i = 0; i < arrivals.length; i++) {
        // No repetir nombres de colectivos
        arrivals[i].tripHeadsign = arrivals[i].tripHeadsign.trim();

        if (arrivals[i].tripHeadsign !== arrivals[i - 1]?.tripHeadsign) {
            let busColor = '';
            if (mendotranData.buses[arrivals[i].routeShortName]) {
                busColor = mendotranData.buses[arrivals[i].routeShortName].color;
            } else {
                bot_log_error(`No se ha podido cargar el color del micro ${arrivals[i].routeShortName}.`);
                busColor = '🔲';
            }

            if (text.length) { text += '\n\n'; }

            text += `${busColor} *${arrivals[i].routeShortName} ${arrivals[i].tripHeadsign}* ${busColor}\n\n`;
        } else {
            text += '\n\n';
        }

        // Hora de llegada
        text += `> ${time_to_emoji(arrivals[i].arrivalTime)} ${get_time_string(arrivals[i].arrivalTime, true, true)} hs`;
        
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
                if (minutesLeft < 120) {
                    text += `😩`;
                } else if (minutesLeft < 180) {
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

export async function get_stop_arrivals(stop: any, filter?: string) {
    return new Promise<string>(async (resolve, reject) => {
        if (mendotranData) {
            if (stop.charAt(0) !== 'M') { stop = 'M' + stop; }
    
            if (!mendotranData.stops || (mendotranData.stops && !mendotranData.stops[stop])) {
                return reject(`No existe la parada *${stop}*`);
            }

            if (filter && !mendotranData.stops[stop].busList.includes(filter)) {
                return reject(`El micro *${filter}* no pasa por *${stop}*`);
            }
    
            fetch_json_mendotran(`${mendotranSettings.api}/arrivals-and-departures-for-stop/${mendotranData.stops[stop].id}.json`)
                .then((json) => {
                    let arrivals: ScheduledArrival[] = json.data?.entry?.arrivalsAndDepartures;     
    
                    if (!arrivals.length || !arrivals) {
                        return reject(`🚎 Sin llegadas para la parada *${stop}* 🏃‍♀️`);
                    }
    
                    // Filtrar micros
                    if (filter) {
                        arrivals = arrivals.filter((bus) => {
                            return bus.routeShortName === filter;
                        });
                        if (!arrivals.length) {
                            return reject(`🚎 Sin llegadas para *${filter}* en *${stop}* 🏃‍♀️`);
                        }
                    }

                    // Ordenar micros segun horario
                    sort_by_arrival_time(arrivals);
    
                    // String
                    let text = `🚦 *${stop}* 🚦\n\n`
                             + bus_arrivals_string(arrivals)
                             + `\n\n📍 *${mendotranData.stops[stop].address}* 📍`;

                    return resolve(text);
                })
                .catch((error) => {
                    console.error(error);
                    return reject('Ha ocurrido un error al procesar la petición.');
                })
        } else {
            return reject('No se ha podido cargar la base de datos de Mendotran.');
        }
    });
}

function calculate_distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

export async function get_arrivals_by_location(position: Position, filter?: string) {
    return new Promise<string>(async (resolve, reject) => {
        if (mendotranData) {
            fetch_json_mendotran(`${mendotranSettings.api}/stops-for-location.json?platform=web&v=&lat=${position.lat}&lon=${position.lon}&latSpan=0.006&lonSpan=0.01&version=1.0`)
                .then((json) => {
                    if (!json.data?.list || json.data.list.length === 0) {
                        return reject('Fuera de rango: No se han encontrado paradas cercanas a la ubicación.');
                    }
        
                    const stopsAround: StopInfo[] = json.data?.list.sort((a: StopInfo, b: StopInfo) => {
                        if (!a.distance) { a.distance = calculate_distance(position.lat, position.lon, a.lat, a.lon); }
                        if (!b.distance) { b.distance = calculate_distance(position.lat, position.lon, b.lat, b.lon); }
                        return a.distance - b.distance;
                    });
                    return resolve(get_stop_arrivals(stopsAround[0].code, filter));
                })
                .catch((error) => {
                    console.error(error);
                    return reject('Ha ocurrido un error al procesar la petición.');
                });
        } else {
            return reject('No se ha podido cargar la base de datos de Mendotran.');
        }
    });
}

// Metrotranvía
export async function get_metro_arrivals(stopName: string): Promise<string> {
    return new Promise<string>(async(resolve, reject) => {
        search_metro_stop(stopName)
            .then(async (stop: MetroStopInfo) => {           
                const metro100Json = await fetch_json_mendotran(`${mendotranSettings.api}/arrivals-and-departures-for-stop/${mendotranData.stops[stop["100"]].id}.json`);
                const metro101Json = await fetch_json_mendotran(`${mendotranSettings.api}/arrivals-and-departures-for-stop/${mendotranData.stops[stop["101"]].id}.json`);
                
                let metro100Arrivals = sort_by_arrival_time(metro100Json.data?.entry?.arrivalsAndDepartures);
                let metro101Arrivals = sort_by_arrival_time(metro101Json.data?.entry?.arrivalsAndDepartures);

                const metro100Restantes = metro100Arrivals.length - 2;
                const metro101Restantes = metro101Arrivals.length - 2;
                metro100Arrivals = metro100Arrivals.slice(0, 2);
                metro101Arrivals = metro101Arrivals.slice(0, 2);

                if (metro100Arrivals.length > 0 || metro101Arrivals.length > 0) {
                    let text = `🚦 *Estación ${stop.name}* 🚦\n\n`
                            + (metro100Arrivals.length > 0 ? bus_arrivals_string(metro100Arrivals) : `🚋 *Sin llegadas para andén ${stop.direction[0]}* 🏃‍♀️`)
                            + (metro100Restantes > 0 ? `\n\n> 🚏 *${metro100Restantes} más por venir*` : '')
                            + '\n\n'
                            + (metro101Arrivals.length > 0 ? bus_arrivals_string(metro101Arrivals) : `🚋 *Sin llegadas para andén ${stop.direction[1]}* 🏃‍♀️`)
                            + (metro101Restantes > 0 ? `\n\n> 🚏 *${metro101Restantes} más por venir*` : '')
                            + `\n\n📍 *${mendotranData.stops[stop['100']].address}* 📍`;
                    return resolve(text);
                } else {
                    return reject(`🚋 Sin llegadas para el metrotranvía 🏃‍♀️`);
                }
            })
            .catch((error) => {
                return reject(error);
            });
    });
}

async function search_metro_stop(name: string): Promise<MetroStopInfo> {
    return new Promise<MetroStopInfo>(async (resolve, reject) => {
        if (mendotranMetroData && mendotranData) {
            name =  name.replace(/á/gi, 'a') // Ignorar acentos
                        .replace(/é/gi, 'e')
                        .replace(/í/gi, 'i')
                        .replace(/ó/gi, 'o')
                        .replace(/ú/gi, 'u');

            const reg = new RegExp(name, 'i');
            for (let stop of mendotranMetroData) {            
                bot_log(stop.name);
                if (stop.name.search(reg) >= 0) {
                    return resolve(stop);
                }
            }
            return reject(`No se ha encontrado la parada *"${name}"*`);
        } else {
            return reject('No se ha podido cargar la base de datos de Mendotran.');
        }
    });
}