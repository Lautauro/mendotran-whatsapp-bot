import { RouteId, StopId, StopCode, VehicleId, BusId, MetroDirection } from "../types/mendotran.d.ts";

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
        color: string;
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
    arrivalTime: number;  // No en la API oficial
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
    distance?: number; // No en la API oficial
}

export interface BusInfo {
    linea?: string;
    id: string;
    shortName: string;
    color: string;
}
