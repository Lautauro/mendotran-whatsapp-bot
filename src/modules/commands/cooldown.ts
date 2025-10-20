import { Message } from "whatsapp-web.js";
import { commandsSettings } from "../../index.js";
import { botLog } from "../../utils/botLog";

export const COOLDOWN_MULTIPLIER = [ 1, 1.3, 1.5, 2.5, 3];
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
            cleared = true;
            MESSAGES_HISTORY.delete(user);
            botLog(user, '=>', timestampList);
        }
    }
    if (cleared === true) {
        botLog('MESSAGES_HISTORY: Command timestamp history cleared.');
    } else {
        botLog('MESSAGES_HISTORY: Nothing to clean.');
    }
}, commandsSettings.clearCommandsHistoryEvery);

export function checkUserCoolDown(message: Message): boolean {
    if (message.fromMe === true) { return true; }

    const from = message.from;

    if (USERS_EXECUTING_COMMANDS.has(from)) { return false; };
    
    if (MESSAGES_HISTORY.has(from)) {
        const userHistory = MESSAGES_HISTORY.get(from);
        if (userHistory !== undefined) {
            if (userHistory.length >= COOLDOWN_MULTIPLIER.length) {
                userHistory.splice(0, 1);
            }

            const now = Date.now();
            userHistory.push(now);

            const coolDown = commandsSettings.initialCoolDown * COOLDOWN_MULTIPLIER[userHistory.length - 1];
            const timeElapsed = now - userHistory[userHistory.length - 2];

            if (timeElapsed < coolDown) { return false; }
            if (timeElapsed > (coolDown + commandsSettings.initialCoolDown)) {
                userHistory.splice(0, userHistory.length - 1);
            }
        }
    } else {
        MESSAGES_HISTORY.set(from, [ Date.now() ]);
    }

    return true;
}
