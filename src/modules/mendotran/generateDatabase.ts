import fs from 'node:fs';
import { fetchJsonMendotran } from './fetchJsonMendotran.js';
import { BusInfo, StopInfo } from '../../ts/interfaces/mendotran.d.js';
import { mendotranSettings } from '../../index.js';
import { botLog, botLogError, botLogOk } from '../../utils/botLog.js';
import { getBusColor } from './emojis.js';

async function getBusesInfo(servicio: string | number): Promise<BusInfo[] | null> {
    let busList: BusInfo[] = [];

    return fetchJsonMendotran(`${mendotranSettings.api}/routes-for-location.json?platform=web&v=&lat=-32.89084&lon=-68.82717&query=${servicio}&radius=40000&version=1.0`, null, 10000)
        .then((json) => {
            if (json.data?.list && json.data.list.length) {
                json.data.list.forEach((element: any) => {
                    const linea = element.shortName.match(/\d+/)[0];
                    const color = getBusColor(linea);

                    busList.push({
                        linea,
                        id: element.id,
                        shortName: element.shortName,
                        color,
                    });
                });
                return busList; 
            }
            return null;
        });
}

// Lista de paradas por las que pasa un micro
async function getStopsFromBus(busId: string): Promise<StopInfo[] | null> {
    return fetchJsonMendotran(`${mendotranSettings.api}/where/stops-for-route/${busId}.json?platform=web&v=&version=1.0`, null, 10000)
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

export async function getMendotranDatabase(): Promise<void> {
    const start = Date.now();

    botLog('Generando la base de datos de Mendotran:');

    let dataBase: any = {
        stops: {},
        buses: {},
    };

    let nStops = 0; // Número de paradas
    let nBuses = 0; // Número de colectivos

    botLog('Buscando líneas de colectivos');

    for (let i = 0; i <= 80; i++) {
        console.log();
        botLog(`Buscando líneas que contengan: ${i}`);

        const busList: BusInfo[] | null = await getBusesInfo(i);

        if (busList && busList.length) {
            for (let j = 0; j < busList.length; j++) {
                let linea = busList[j].linea ?? null;
                
                // Ignorar repetidos
                if (linea && !dataBase.buses[linea]) {
                    // Agregar micro al objeto
                    delete busList[j].linea; // Es innecesario guardar esta información
                    dataBase.buses[linea] = busList[j];

                    // Agregar referencia a las paradas
                    const stops: StopInfo[] | null = await getStopsFromBus(busList[j].id);

                    if (stops) {
                        for (let j = 0; j < stops.length; j++) {                         
                            if (!dataBase.stops[stops[j].name]) {
                                // Coordenadas
                                if (isNaN(+stops[j].lat) || isNaN(+stops[j].lon)) {
                                    botLogError(`No se pudo calcular la posición de la parada ${stops[j].name}.`);
                                    stops[j].lat = 0;
                                    stops[j].lon = 0;
                                }

                                // Información de la parada
                                dataBase.stops[stops[j].name] = {
                                    id:  stops[j].id,
                                    // TODO: La posición nunca es usada en el programa
                                    // pos: [
                                    //     +stops[j].lat,
                                    //     +stops[j].lon
                                    // ],
                                    address:  stops[j].address ? stops[j].address.trim() : '',
                                    busList: [],
                                }
                                nStops++;
                            }
                            dataBase.stops[stops[j].name].busList.push(linea);
                        }
                    } else {
                        botLogError(`No existen paradas para ${linea}`);
                        continue;
                    }

                    nBuses++;
                    console.log(`\tLínea ${linea}`);
                }
            }
        } else {
            botLogError(`No hay resultados.`);
        }
    }

    // Ordenar de menor a mayor la lista de colectivos de cada parada
    botLog('Ordenando lista de colectivos.')

    for (let key in dataBase.stops) {
        dataBase.stops[key].busList = dataBase.stops[key].busList.sort((a: string, b: string) => (+a) - (+b));
    }

    botLog(`Se han encontrado:\n\t${nBuses} lineas.\n\t${nStops} paradas.\n`);

    // Escribir archivo
    try {
        if (!fs.existsSync('./json')) { fs.mkdirSync('./json', { recursive: true }); }

        if (fs.existsSync(`./json/${mendotranSettings.dataFile}`)) {
            fs.copyFileSync(`./json/${mendotranSettings.dataFile}`, `./json/${mendotranSettings.dataFile}.old`);
        }

        fs.writeFileSync(`./json/${mendotranSettings.dataFile}`, JSON.stringify(dataBase));
        botLogOk(`✔  Lista de colectivos escrita exitosamente\n`);
    } catch(error) {
        console.error(`❌  Error al guardar la lista de colectivos\n`);
        console.error(error);
        process.exit();
    }

    botLog(`La operación tardó ${(Date.now() - start) / 1000} segundos en ser realizada.`);
}