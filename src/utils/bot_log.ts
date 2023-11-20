import { get_time_string } from "./get_time_string";

function message_base(): string {
    const timestamp = get_time_string(Date.now(), true, true, true);
    return `[${timestamp}] [ LOG ]`;
}

export function bot_log(...content: any[]): void {
    console.log('\x1b[44m%s\x1b[0m', message_base(), ...content);
}

export function bot_log_error(...content: any[]): void {
    console.error('\x1b[41m%s\x1b[0m', message_base(), ...content);
}

export function bot_log_warn(...content: any[]): void {
    console.warn('\x1b[43m%s\x1b[0m', message_base(), ...content);
}