import { ScheduledArrival, Position, Stop } from '../../ts/interfaces/mendotran.d.js';
import { fetch_json_mendotran } from '../../utils/fetch_json_mendotran.js';
import mendotranSettings from '../../config/mendotran.json';
import { get_time_string } from '../../utils/get_time_string.js';
import { bot_log_error } from '../../utils/bot_log.js';

const emoji_time: readonly string[][] = [
    ['🕛','🕧'], // 12
    ['🕐','🕜'], // 01
    ['🕑','🕝'], // 02
    ['🕒','🕞'], // 03
    ['🕓','🕟'], // 04
    ['🕔','🕠'], // 05
    ['🕕','🕡'], // 06
    ['🕖','🕢'], // 07
    ['🕗','🕣'], // 08
    ['🕘','🕤'], // 09
    ['🕙','🕥'], // 10
    ['🕚','🕦'], // 11
];

function time_to_emoji(unixTime: number): string {
    const time: Date = new Date(unixTime);
    const minutes: number = time.getMinutes();
    const hours: number = time.getHours() % 12;
    
    return (emoji_time[hours][Math.round(minutes / 60)]);
}

// Mendotran
// TODO: Sistema para paradas de metrotranvía

let mendotranData: any = null;

try {
    mendotranData = require(`../../json/${mendotranSettings.dataFile}`);
} catch(error) {
    mendotranData = null;
}

function database_exists(): boolean {
    if (!mendotranData) {
        bot_log_error('No se ha genarado la base de datos de Mendotran.');
        return false;
    }
    return true;
}

export async function get_stop_arrivals(stop: any, filter?: string) {
    return new Promise<string>(async (resolve, reject) => {
        if (database_exists()) {
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
    
                    if (!arrivals.length || !arrivals) { resolve(`🚎 Sin llegadas para la parada *${stop}* 🏃‍♀️`); }
    
                    // Filtrar micros
                    if (filter) {
                        arrivals = arrivals.filter((bus) => {
                            return bus.routeShortName === filter;
                        });
                        if (!arrivals.length) {
                            resolve(`🚎 Sin llegadas para *${filter}* en *${stop}* 🏃‍♀️`);
                        }
                    }
    
                    if (arrivals.length === 1) {
                        arrivals[0].arrivalTime = arrivals[0].predicted ? arrivals[0].predictedArrivalTime : arrivals[0].scheduledArrivalTime;
                    } else {
                        // Ordenar micros segun horario
                        arrivals.sort((a, b) => {
                            a.arrivalTime = a.predicted ? a.predictedArrivalTime : a.scheduledArrivalTime;
                            b.arrivalTime = b.predicted ? b.predictedArrivalTime : b.scheduledArrivalTime;
    
                            return a.arrivalTime - b.arrivalTime;
                        });
                    }
    
                    let text = `🚦 *${stop}* 🚦`;
    
                    for (let i = 0; i < arrivals.length; i++) {
                        // No repetir nombres de colectivos
                        arrivals[i].tripHeadsign = arrivals[i].tripHeadsign.trim();
    
                        if (arrivals[i].tripHeadsign !== arrivals[i - 1]?.tripHeadsign) {
                            let busColor = '';
                            if (mendotranData.buses[arrivals[i].routeShortName]) {
                                busColor = mendotranData.buses[arrivals[i].routeShortName].color;
                            } else {
                                bot_log_error(`No se pudo cargar el color del micro ${arrivals[i].routeShortName}.`);
                                busColor = '🔲';
                            }
                            text += `\n\n${busColor} *${arrivals[i].routeShortName} ${arrivals[i].tripHeadsign}* ${busColor}\n\n`;
                        } else {
                            text += '\n\n';
                        }
    
                        // Hora de llegada
                        text += `> ${time_to_emoji(arrivals[i].arrivalTime)} ${get_time_string(arrivals[i].arrivalTime, true, true)} hs`;
                        
                        const minutesLeft = Math.floor((arrivals[i].arrivalTime - Date.now()) / 60000);
                        
                        if (minutesLeft) {
                            // Indicar cuantos minutos y/o horas faltan.
                            if (minutesLeft >= 60) {
                                const hours = Math.trunc(minutesLeft / 60);
                                text += `\n> ⏳ ${hours} hora${hours > 1 ? 's' : ''} `;
                                
                                const minutes = minutesLeft % 60;
                                if (minutes) {
                                    text += `y ${minutes} minuto${minutes > 1 ? 's' : ''} `;
                                }
    
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
                                    text += `\n> ✔️ A tiempo`;
                                } else if (delay > 0) {
                                    text += `\n> ⏱️ ${delay} minuto${delay > 1 ? 's' : ''} antes`;
                                } else if (delay < 0) {
                                    text += `\n> 😴 ${Math.abs(delay)} minuto${delay < -1 ? 's' : ''} tarde`;
                                }
                            } else {
                                // Horario planificado
                                text += `\n> 🗒️ Planificada`;
                            }
                        } else {
                            text += `\n> 🚍 *Arribando*`;
                        }
                    }
    
                    text += `\n\n📍 *${mendotranData.stops[stop].address}* 📍`;
    
                    resolve(text);
                })
                .catch((error) => {
                    console.error(error);
                    reject('Ha ocurrido un error al procesar la petición.');
                })
        } else {
            reject('No se ha podido cargar la base de datos de Mendotran.');
        }
    });
}

function calculate_distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

export async function get_arrivals_by_location(position: Position, filter?: string) {
    return new Promise<string>(async (resolve, reject) => {
        if (database_exists()) {
            fetch_json_mendotran(`${mendotranSettings.api}/stops-for-location.json?platform=web&v=&lat=${position.lat}&lon=${position.lon}&latSpan=0.006&lonSpan=0.01&version=1.0`)
                .then((json) => {
                    if (!json.data?.list || json.data.list.length === 0) { return '❌ No se pudo encontrar paradas cercanas. 🚏'; }
        
                    const busesAround = json.data?.list.sort((a: Stop, b: Stop) => {
                        if (!a.distance) { a.distance = calculate_distance(position.lat, position.lon, a.lat, a.lon); }
                        if (!b.distance) { b.distance = calculate_distance(position.lat, position.lon, b.lat, b.lon); }
                        return a.distance - b.distance;
                    });
                    resolve(get_stop_arrivals(busesAround[0].code, filter));
                })
                .catch((error) => {
                    console.error(error);
                    reject('Ha ocurrido un error al procesar la petición.');
                });
        } else {
            reject('No se ha podido cargar la base de datos de Mendotran.');
        }
    });
}
