import { getTimeString } from "./getTimeString.js";

function messageBase(): string {
    const timestamp = getTimeString(Date.now(), true, true, true);
    return `[${timestamp}] [ LOG ]`;
}

export function botLog(...content: any[]): void {
    console.log('\x1b[44m%s\x1b[0m', messageBase(), ...content);
}

export function botLogError(...content: any[]): void {
    console.error('\x1b[41m%s\x1b[0m', messageBase(), ...content);
}

export function botLogWarn(...content: any[]): void {
    console.warn('\x1b[43m%s\x1b[0m', messageBase(), ...content);
}