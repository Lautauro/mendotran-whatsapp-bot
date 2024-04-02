import { MetroStopInfo } from "../interfaces/mendotran";

export type StopCode = `M${number}`;
export type StopId = `${number}_${number}`;
export type BusId = StopId;
export type RouteId = StopId; 
export type VehicleId = `${number}-${number}`;
export type MetroDirection = 'Norte' | 'Sur' | 'Este' | 'Oeste';
export type MetroData = MetroStopInfo[];
export type BusColor = '🔲' | '🟥' | '⬜' | '🟩' | '🟨' | '🟧' | '🟦' | '🟪' | '🟫' | '🚉' ;