import { MetroDirection, BusColor } from "../types/mendotran.d.ts";

export interface StopData {
    stop_id: number;
    location: string;
    bus_list: string[];
}

export interface BusData {
    service_id: number;
    // group_id: number;
    // name: string;
    color: BusColor
}

export interface MendotranStopsData {
    [stopCode: string]: StopData;
}

export interface MendotranBusesData {
    [busNumber: string]: BusData;
}

export interface MetroStopInfo {
    name: string | string[];
    direction: MetroDirection[];
    "101": string;
    "100": string;
}

export interface Service {
    [service_id: number]: {
        // Número del micro.
        code: string;
        // Letrero.
        name: string;
        color: string;
        group_id: number;
    }
}

export interface ArrivalsResponse {
    stop_id: number;
    arrivals: Arrival[];
    references: {
        services: Service;
    }
}

export interface Arrival {
    /**
     * Indica la hora de llegada del colectivo
     * independientemente de si es o no planificada.
     *
     * NO EN LA API OFICIAL
     */
    arrivalTime: number;

    service_id: number;
    stop_sequence: number;
    scheduled: number;
    predicted: number;
    vehicle_id: number;
    trip_id: string;
}
