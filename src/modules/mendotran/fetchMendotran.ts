import { ArrivalsResponse } from "../../ts/interfaces/mendotran.js";
import { botLogError } from "../../utils/botLog.js";

const API: string = "https://owa.visionblo.com/api/mendoza/"
const token: string = "OQkGfHEQqWRO9zXRQgJb";
const xss: string = "86adb365fced6934d3ff6bec";

async function fetchMendotran(path: string, body: object): Promise<any> {
    const headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0",
        "Accept": "*/*",
        "Accept-Language": "es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3",
        "Content-Type": "application/json",
        "Origin": "https://owa.visionblo.com",
        "Referer": "https://owa.visionblo.com/web/mendoza/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
    };

    const _body = JSON.stringify({
        token: token,
        text: "",
        xss: xss,
        ...body
    });

    try {
        const response = await fetch(API + path, {
            method: "POST",
            headers: headers,
            body: _body
        });

        if (!response.ok) {
            throw new Error("Error " + response.status + ".");
        }

        return await response.json();
    } catch (error) {
        botLogError(`Ocurrió un error al hacer la petición al servidor. \nURL API: ${API + path}\n` + "BODY: " + JSON.stringify(body, null, 4) + "\n", error);
        throw error;
    }
}

/**
 * Hacer una petición al servidor de Mendotran para obtener información sobre todos los micros.
 */
export async function fetchAllBusesInfo(): Promise<any> {
    return fetchMendotran("search", {
        search: ["services"],
        no_favorites: true,
    });
}

/**
 * Hacer una petición al servidor de Mendotran para obtener información sobre todas las paradas.
 */
export async function fetchAllStopsInfo(): Promise<any> {
    return fetchMendotran("search", {
        search: ["stops"],
        no_favorites: true,
    });
}

/**
 * Hacer una petición al servidor de Mendotran para obtener información acerca de los horarios de una parada.
 * @param {string} id - ID de la parada.
 */
export async function fetchStopArrivals(id: number): Promise<ArrivalsResponse> {
    return fetchMendotran("arrivals", {
        first_time: true,
        stop_id: id
    });
}

/**
 * Hacer una petición al servidor de Mendotran para obtener información acerca de un colectivo.
 * @param {string} id - ID del colectivo.
 */
export async function fetchBusInfo(id: number): Promise<any> {
    return fetchMendotran("service", {
        service_id: id
    });
}
