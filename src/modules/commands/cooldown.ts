import { commandsSettings } from "../..";
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
