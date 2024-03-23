import { Message } from "whatsapp-web.js";
import { commandsSettings } from "../../index.js";
import { botLog } from "../../utils/botLog";

export const COOLDOWN_MULTIPLIER = [ 1, 1.2, 1.4, 2, 3];
export const MESSAGES_HISTORY: Map<string, number[]> = new Map();
export const USERS_EXECUTING_COMMANDS: Set<string> = new Set();

// Auto-clear history
setInterval(() => {
    if (MESSAGES_HISTORY.size === 0) { return; }
    let cleared = false;
    
    botLog('MESSAGES_HISTORY: Clearing command timestamp history.');  
    const now = Date.now();
    for (let [user, timestampList] of MESSAGES_HISTORY) {
        if (now - timestampList[timestampList.length - 1] > commandsSettings.initialCoolDown * COOLDOWN_MULTIPLIER[COOLDOWN_MULTIPLIER.length - 1]) {
            if (cleared === false) { console.log(); }
            cleared = true;
            MESSAGES_HISTORY.delete(user);
            botLog(user, '=>', timestampList);
        }
    }
    if (cleared === true) {
        console.log();
        botLog('MESSAGES_HISTORY: Command timestamp history cleared.');
    } else {
        botLog('MESSAGES_HISTORY: Nothing to clean.');
    }
}, commandsSettings.clearCommandsHistoryEvery);

export function checkUserCoolDown(message: Message): boolean {
    if (message.fromMe === true) { return true; }

    const from = message.from;
    
    if (MESSAGES_HISTORY.has(from)) {
        const userHistory = MESSAGES_HISTORY.get(from);
        if (userHistory !== undefined) {
            if (userHistory.length >= COOLDOWN_MULTIPLIER.length) {
                userHistory.splice(0, 1);
            }

            const now = Date.now();
            userHistory.push(now);

            const COOLDOWN = commandsSettings.initialCoolDown * COOLDOWN_MULTIPLIER[userHistory.length - 1];
            const timeElapsed = now - userHistory[userHistory.length - 2];

            if (timeElapsed < COOLDOWN) { return false; }
            if (timeElapsed > (COOLDOWN + commandsSettings.initialCoolDown)) {
                userHistory.splice(0, userHistory.length - 1);
            }
        }
    } else {
        MESSAGES_HISTORY.set(from, [ Date.now() ]);
    }

    if (USERS_EXECUTING_COMMANDS.has(from)) { return false; };

    return true;
}
