import { BusColor } from "../../ts/types/mendotran";
export const METRO_EMOJI: BusColor = '🚉';

export const BUS_COLOR_LIST: readonly BusColor[] = [
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

export const EMOJI_TIME: readonly string[][] = [
    ['🕛', '🕧'], // 00 - 12
    ['🕐', '🕜'], // 01 - 13
    ['🕑', '🕝'], // 02 - 14
    ['🕒', '🕞'], // 03 - 15
    ['🕓', '🕟'], // 04 - 16
    ['🕔', '🕠'], // 05 - 17
    ['🕕', '🕡'], // 06 - 18
    ['🕖', '🕢'], // 07 - 19
    ['🕗', '🕣'], // 08 - 20
    ['🕘', '🕤'], // 09 - 21
    ['🕙', '🕥'], // 10 - 22
    ['🕚', '🕦'], // 11 - 23
];

/**
 * Devuelve el color en emoji de la linea de colectivo.
 * @param {string} linea - Línea de colectivo
 * @returns {BusColor}
 */
export function getBusColor(linea: string): BusColor {
    if (+linea >= 100 && +linea < 1000) {
        return BUS_COLOR_LIST[+String(+linea).charAt(0)];
    } else {
        return BUS_COLOR_LIST[0];
    }
}