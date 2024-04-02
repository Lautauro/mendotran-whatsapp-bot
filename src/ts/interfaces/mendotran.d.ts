import { RouteId, StopId, StopCode, VehicleId, BusId, MetroDirection, BusColor } from "../types/mendotran.d.ts";

export interface Position {
    lat: number;
    lon: number;
}

export interface MendotranData {
    stops: MendotranStopData;
    buses: MendotranBusesData;
}

export interface MendotranStopData {
    [stopCode: StopCode]: {
        id: StopId;
        position: Position;
        address: string;
        busList: string[];
    }
}

export interface MendotranBusesData {
    [busNumber: `${number}`]: {
        linea: string;
        id: BusId;
        shortName: string;
        color: BusColor;
    }
}

export interface MetroStopInfo {
    name: string | string[];
    direction: MetroDirection[];
    "101": StopCode;
    "100": StopCode;
}

export interface ScheduledArrival {
    arrivalEnabled: boolean;
    
    /**
     * Indica la hora de llegada del colectivo
     * independientemente de si es o no planificada.
     * 
     * NO EN LA API OFICIAL
     */

    arrivalTime: number;

    blockTripSequence: number;
    color: string;
    departureEnabled: boolean;
    distanceFromStop: number;
    frequency: number | null;
    lastUpdateTime: number;
    numberOfStopsAway: number;
    occupancyStatus: string;
    predicted: boolean;
    predictedArrivalInterval: number | null;
    predictedArrivalTime: number;
    predictedDepartureInterval: number | null;
    predictedDepartureTime: number;
    predictedOccupancy: string;
    routeId: RouteId;
    routeLongName: string;

    /**
     * Número de linea
     */

    routeShortName: `${number}`;

    scheduledArrivalInterval: number | null;
    scheduledArrivalTime: number;
    scheduledDepartureInterval: number | null;
    scheduledDepartureTime: number;
    serviceDate: number;
    situationIds: [];
    status: 'default' | string;
    stopId: StopId;
    stopSequence: number;

    /**
     * Cartel del colectivo
     */

    tripHeadsign: string;

    tripId: number;
    tripStatus: {
        position: Position,
        orientation: number,
        status: 'default' | string,
        predicted: boolean,
        lastUpdateTime: number,
        lastLocationUpdateTime: number,
    };
    vehicleId: VehicleId;
}

export interface StopInfo {
    code: StopCode;
    address: string;
    direction: string;
    id: StopId;
    lat: number;
    lon: number;
    locationType: number;
    name: StopCode;
    routeIds: RouteId[];
    wheelchairBoarding: 'UNKNOWN' | string;

    /**
     * NO EN LA API OFICIAL
     */

    distance?: number;
}

export interface BusInfo {
    linea?: string;
    id: string;
    shortName: string;
    color: BusColor;
}