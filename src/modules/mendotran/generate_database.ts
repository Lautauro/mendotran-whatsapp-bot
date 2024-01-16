import fs from 'node:fs';
import { fetch_json_mendotran } from '../../utils/fetch_json_mendotran.js';
import { BusInfo, StopInfo } from '../../ts/interfaces/mendotran.d.js';

const mendotranSettings = require('../../../config/mendotran.json');

const metro_emoji = '🚉';
const bus_color_list: string[] = [
    '🔲', // Sin color definido
    '🟥', // 100
    '⬜', // 200
    '🟩', // 300
    '🟨', // 400
    '🟧', // 500
    '🟦', // 600
    '🟦', // 700
    '🟪', // 800
    '🟫', // 900
];

async function get_buses_info(servicio: string | number): Promise<BusInfo[] | null> {
    let busList: BusInfo[] = [];

    return fetch_json_mendotran(`${mendotranSettings.api}/routes-for-location.json?platform=web&v=&lat=-32.89084&lon=-68.82717&query=${servicio}&radius=40000&version=1.0`, null, 10000)
        .then((json) => {
            if (json.data?.list && json.data.list.length) {
                json.data.list.forEach((element: any) => {
                    busList.push({
                        linea: element.shortName.match(/\d+/)[0],
                        id: element.id,
                        shortName: element.shortName,
                        color: '',
                    });
                });
                return busList; 
            }
            return null;
        });
}

// Lista de paradas por las que pasa un micro
async function get_stops_from_bus(busId: string): Promise<StopInfo[] | null> {
    return fetch_json_mendotran(`${mendotranSettings.api}/where/stops-for-route/${busId}.json?platform=web&v=&version=1.0`, null, 10000)
        .then((json) => {
            if (json.data?.references?.stops) {
                return json.data.references.stops;
            } else {
                return null;
            }
        }).catch((error) => {
            console.error(error);
            return null;
        });
}

export async function get_mendotran_database(): Promise<void> {
    const start = Date.now();

    let obj: any = {
        stops: {},
        buses: {},
    };

    let nStops = 0; // Número de paradas
    let nBuses = 0; // Número de colectivos

    for (let i = 0; i <= 80; i++) {
        console.log(`\nIndex: ${i}`);

        const busList: BusInfo[] | null = await get_buses_info(i);

        if (busList && busList.length) {
            for (let j = 0; j < busList.length; j++) {
                let linea = busList[j].linea ?? null;
                
                // Ignorar repetidos.
                if (linea && !obj.buses[linea]) {
                    const busColor = (+linea >= 100 && +linea <= 1000) ? (+String(+linea).charAt(0)) : 0;

                    if (linea == '100' || linea == '101') {
                        busList[j].color = metro_emoji;
                    } else {
                        busList[j].color = bus_color_list[busColor];
                    }

                    // Agregar micro al objeto
                    obj.buses[linea] = busList[j];

                    // Agregar referencia a las paradas
                    const stops: StopInfo[] | null = await get_stops_from_bus(busList[j].id);

                    if (stops) {
                        for (let j = 0; j < stops.length; j++) {                         
                            if (!obj.stops[stops[j].name]) {
                                obj.stops[stops[j].name] = {
                                    id:  stops[j].id,
                                    position: {
                                        lat:  stops[j].lat,
                                        lon:  stops[j].lon,
                                    },
                                    address:  stops[j].address ? stops[j].address.trim() : '',
                                    busList: [],
                                }
                                nStops++;
                            }
                            obj.stops[stops[j].name].busList.push(linea);
                        }
                    } else {
                        console.error(`No existen paradas para ${linea}`);
                        continue;
                    }

                    nBuses++;
                    console.log(`\tLínea ${linea}`);
                }
            }
        } else {
            console.log(`\nNo hay resultados para ${i}.\n`);
        }
    }

    console.log(`\nSe han encontrado:\n\t${nBuses} lineas.\n\t${nStops} paradas.\n`);

    // Escribir archivo
    try {
        if (!fs.existsSync('./json')) { fs.mkdirSync('./json', { recursive: true }); }

        if (fs.existsSync(`./json/${mendotranSettings.dataFile}`)) {
            fs.copyFileSync(`./json/${mendotranSettings.dataFile}`, `./json/${mendotranSettings.dataFile}.old`);
        }

        fs.writeFileSync(`./json/${mendotranSettings.dataFile}`, JSON.stringify(obj));
        console.log(`✔  Lista de colectivos escrita exitosamente\n`);
    } catch(error) {
        console.error(`❌  Error al guardar la lista de colectivos\n`);
        console.error(error);
    }

    console.log(`La operación tardó ${(Date.now() - start) / 1000} segundos en ser realizada.`);
}