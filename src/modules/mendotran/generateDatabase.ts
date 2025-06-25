import fs from 'node:fs';
import { botLog, botLogError, botLogOk } from '../../utils/botLog.js';
import { getBusColor } from './emojis';
import { fetchAllStopsInfo, fetchAllBusesInfo, fetchBusInfo } from './fetchMendotran.js';
import { StopData, MendotranBusesData, MendotranStopsData } from '../../ts/interfaces/mendotran.js';
import { ACTUAL_BBDD_VERSION } from '../../index.js';

export async function getMendotranDatabase(): Promise<void> {
    botLog('Generando la base de datos de Mendotran.');
    //
    // Extraemos la lista de paradas de la base de datos.
    //
    const stopListJSON = await fetchAllStopsInfo();
    const stopList: MendotranStopsData = {};
    // Este mapa lo usaremos como una especie de diccionario, donde el "key" será el ID de la parada y el "value" el código.
    // Ejemplo: 12345: "M1000"
    const stopIDDictionary = new Map();

    if (stopListJSON.search && stopListJSON.search.length > 0) {
        for(const stopInfo of stopListJSON.search) {
            // Verificamos estar recibiendo los datos esperados, esto es útil por si en un futuro Mendotran decide cambiar los datos de la base de datos.
            if (stopInfo.stop_id !== undefined && stopInfo.code !== undefined && stopInfo.location !== undefined && stopInfo.coordinates !== undefined) {
                // Ignorar repetidos
                if (stopList[`${stopInfo.code}`]) {
                    botLog(`La parada "${stopInfo.code}" está repetida, se ignorará.`);
                    continue;
                }

                stopList[stopInfo.code] = {
                    "stop_id": stopInfo.stop_id,
                    "location": stopInfo.location,
                    //"coordinates": item.coordinates,
                    "bus_list": [],
                };

                stopIDDictionary.set(stopInfo.stop_id, stopInfo.code);
            } else {
                botLogError("Se intentó obtener los datos de una parada pero se recibieron valores inesperados. Quizá la estructura de la base de datos de Mendotran haya sido actualizada.", stopInfo);
            }
        }
    } else {
        throw new Error("No se pudo obtener la lista de paradas de colectivos del servidor de Mendotran.");
    }

    // Si de algún modo la lista de paradas está vacía, tirar error.
    if (Object.keys(stopList).length === 0) {
        throw new Error("Ocurrió un error al intentar generar la lista de paradas de colectivos.");
    }

    //
    // Extraemos la lista de colectivos de la base de datos.
    //
    const busesListJSON = await fetchAllBusesInfo();
    const busesList: MendotranBusesData = {};

    if (busesListJSON.search && busesListJSON.search.length > 0) {
        for (const busInfo of busesListJSON.search) {
            if (busInfo.service_id != undefined && busInfo.group_id != undefined && busInfo.code != undefined && busInfo.name != undefined && busInfo.color != undefined) {
                if (busesList[`${busInfo.code}`]) {
                    botLog(`El micro "${busInfo.code}" está repetido, se ignorará.`);
                    continue;
                }

                busesList[`${busInfo.code}`] = {
                    // "group_id": busInfo.group_id,
                    "service_id": busInfo.service_id,
                    // "name": busInfo.name,
                    "color": getBusColor(busInfo.code),
                };
            } else {
                botLogError("Se intentó obtener los datos de un colectivo pero se recibieron valores inesperados. Quizá la estructura de la base de datos de Mendotran haya sido actualizada.", busInfo);
            }
        }
    } else {
        throw new Error("No se pudo obtener la lista de colectivos del servidor de Mendotran.");
    }

    // Si de algún modo la lista de colectivos está vacía, tirar error.
    if (Object.keys(stopList).length === 0) {
        throw new Error("Ocurrió un error al intentar generar la lista de colectivos.");
    }

    //
    // Añadimos a las paradas los micros que pasan por ella.
    //
    let busesAñadidos: boolean = false;

    for (const linea in busesList) {
        const busInfoJSON = await fetchBusInfo(busesList[linea].service_id);

        if (busInfoJSON.service != undefined && busInfoJSON.service.stops != undefined && busInfoJSON.service.stops.length > 0) {
            botLog(`Añadido paradas del micro "${linea}".`)
            for (const stop_id of busInfoJSON.service.stops) {
                // Verificamos que exista la parada en nuestra base de datos local.
                let stop: StopData;
                if (stopIDDictionary.has(stop_id) && (stop = stopList[stopIDDictionary.get(stop_id)]) != undefined) {
                    stop.bus_list.push(linea);

                    //botLogOk(`Añadido el micro "${linea}" a la parada "${stopIDDictionary.get(stop_id)}".`);
                    busesAñadidos = true;
                } else {
                    botLogError("Se intentó agregar un bus a la lista de buses de una parada, pero ésta no existe en la base de datos local.\n"
                                +`stop_id: ${stop_id}\n`
                                +`bus: ${linea}`);
                }
            }
        } else {
            botLogError(`Se intentó obtener las paradas del colectivo "${linea}" pero se recibieron valores inesperados. Quizá la estructura de la base de datos de Mendotran haya sido actualizada.`);
        }
    }

    if (busesAñadidos === false) {
        throw new Error("No se pudieron añadir los colectivos a la lista de colectivos que pasan por cada parada.");
    }

    // Escribir archivo
    try {
        // Si no exite la carpeta la generamos
        if (!fs.existsSync('./json')) {
            fs.mkdirSync('./json', { recursive: true });
        }

        guardarArchivos("./json", "mendotran-buses.json",  busesList);
        guardarArchivos("./json", "mendotran-stops.json",  stopList);
        guardarArchivos("./json", ".bbdd-version.json", { "VERSION": ACTUAL_BBDD_VERSION }, false);
    } catch(error) {
        throw new Error("Error al guardar la base de datos en archivos JSON. " + error);
    }
    // TODO: Habría que esperar a que terminen de guardarse los tres archivos para mandar este mensaje y finalizar la función.
    botLogOk("La base de datos fue generada exitosamente.")
}

async function guardarArchivos(path: string, nombreArchivo: string, data: object, createBackup: boolean = true) {
    // Verificar si es la primera vez que se guarda el archivo, de lo contrario hacer un back-up de la versión anterior al mismo.
    if (createBackup === true && fs.existsSync(`${path}/${nombreArchivo}`)) {
        fs.copyFile(`${path}/${nombreArchivo}`, `${path}/${nombreArchivo}.old`, (error) => {
            if (error) throw new Error(`Error al crear una copia del archivo "${nombreArchivo}" ya existente.`, error);

            botLog(`Se copió el archivo "${nombreArchivo}" existente a "${nombreArchivo}.old".`)
        });
    }

    return fs.writeFile(`${path}/${nombreArchivo}`, JSON.stringify(data), (error) => {
        if (error) throw new Error(`Ocurrió un error al guardar el archivo "${path}/${nombreArchivo}".`, error);

        botLogOk(`Archivo "${path}/${nombreArchivo}" creado con éxito.`)
    });
}
