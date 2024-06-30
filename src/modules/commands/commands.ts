import { Command, CommandData, CommandResponseOptions, Parameter, ParameterInfo } from "../../ts/interfaces/commands.js";
import { CommandCallback, ParameterType } from "../../ts/types/commands.js";
import { Message } from "whatsapp-web.js";
import { botLog, botLogWarn, botLogError, botLogOk } from "../../utils/botLog.js";
import { whatsappSettings, commandsPrefix } from "../../index.js";
import { capitalizedCase } from "../../utils/capitalizedCase.js";
import { USERS_EXECUTING_COMMANDS, checkUserCoolDown } from "./cooldown.js";
import { sendResponse, sendErrorResponse, sendReactionResponse } from "./sendResponses.js";

export class CommandError {
    message: string;
    options?: CommandResponseOptions;
    
    constructor(message: string, options?: CommandResponseOptions) {
        this.message = message;
        this.options = options;
    }
}

class CommandsManager {
    list: Command[];
    alias: Map<string, number>;

    constructor() {
        this.list = [];
        this.alias = new Map();
    }

    add(command: Command) {
        let collisions = 0;
        let filterCommandAlias = [...command.alias];

        // Check that aliases are not in use
        for (let i = 0; i < command.alias.length; i++) {
            command.alias[i] = command.alias[i].toLowerCase();
            if (this.alias.has(command.alias[i])) {
                collisions++;
                filterCommandAlias.splice(i, 1);
                botLogWarn(
                    `WARNING: "${command.alias[i]}" alias is being used by another command.\n`);
            }
        }

        if (collisions === command.alias.length) {
            botLogError(
                `ERROR: The command could not be added to the list, ` +
                `aliases [ ${command.alias.join(', ')} ] are being used by other command(s).\n`);
            return;
        }

        let commandIndex = this.list.length;

        command.alias = [...filterCommandAlias];
        command.alias.forEach((alias) => { this.alias.set(alias, commandIndex) } );

        this.list.push(command);
    }
}

const commandsManager = new CommandsManager();

export const COMMAND_ERROR_MESSAGES = Object.freeze({
    MISSING_ARGUMENT: (commandObj: Command, args: any[]) => {
        const alias: string = capitalizedCase(commandObj.alias[0]);
        let commandArgs = `${args.length > 0 ? `_${args.join(' ')}_ ` : ''}`;

        if (commandObj.parameters) {
            for (let i = args.length; i < commandObj.parameters.length; i++ ) {
                commandArgs += `\`${commandObj.parameters[i].info?.name}\``;
                if (i !== commandObj.parameters.length - 1) { commandArgs += ' '; }
            }
        }

        return `Faltan argumentos en el comando:\n` +
                `*${alias}* ${commandArgs}\n\n` +
                `Para más información escriba:\n` +
                `*Ayuda* \`${commandObj.alias[0]}\``;
    },
    MISSING_QUOTE: 'Este comando necesita citar un mensaje para ser ejecutado.',
    INVALID_ARGUMENT: (commandObj: Command, arg: any, param: Parameter) => {
        let tipo: string = param.type[0];
        switch (tipo) {
            case 'number':
                tipo = 'número';
                break;
            case 'boolean':
                tipo = 'booleano';
                break;
            case 'string':
                tipo = 'texto';
                break;
        }
        
        return  `El argumento "*${arg}*" es invalido. `+
                `El parámetro "*${param.info?.name.toLocaleLowerCase()}*" ha de ser de tipo *${tipo}*.\n\n` +
                `Para más información ejecute:\n` +
                `*Ayuda* \`${commandObj.alias[0]}\``;
    }
});

const commandBase = (command: Command) => {
    return {
        ...command,
        setCallback: setCallback(command),
        addParameter: addParameter(command),
        closeCommand: closeCommand(command),
    }
}

export const createCommand = (alias: string[], data?: CommandData) => {   
    const command: Command =  {
        alias,
        parameters: null,
        hasOptionalValues: false,
        options: {
            adminOnly: false,
            needQuotedMessage: false,
            disableQuotationMarks: false,
            ...data?.options,
        },
        info: {
            name: capitalizedCase(alias[0]),
            ...data?.info,
        },
        callback: () => {},
    }

    return commandBase({ ...command });
}

const setCallback = (command: Command) => (callback: CommandCallback) => {
    return commandBase({ ...command, callback });
}

const addParameter = (command: Command) => (type: ParameterType, info?: ParameterInfo, defaultValue?: any) => {
    if (!Array.isArray(command.parameters)) { command.parameters = [] };
 
    if ((defaultValue !== null && defaultValue !== undefined) && argumentType(defaultValue) !== type) {
        throw new Error(
            `The type of the default value "${defaultValue}" is "${argumentType(defaultValue)}" ` +
            `and it was expected to be: "${type}"\n`);
    }

    let isOptional = false;

    if (defaultValue !== undefined) {
        command.hasOptionalValues = true;
        isOptional = true;
    }

    command.parameters.push({
        type,
        defaultValue,
        isOptional,
        info: {
            name: type, // Default name
            example: defaultValue ? String(defaultValue) : 'UNDEFINED',
            ...info,
        },
    });

    return commandBase(command);
}

const closeCommand = (command: Command) => () => {
    if (command.parameters && command.parameters.length > 1) {
        let stringParamCount: number = 0;
        let optionalValueDetected = false;
        for (let i = 0; i < command.parameters.length; i++) {            
            if (command.parameters[i].type === 'string') { stringParamCount++; }

            // Check if optional parameters are at the end of the command
            if (command.parameters[i].isOptional === true) {
                optionalValueDetected = true;
            } else if (optionalValueDetected === true) {
                throw new Error(`Optional parameters must be placed at the end of the command.\n`);
            }

            if (command.options.disableQuotationMarks === true) {
                if (stringParamCount > 1) {
                    throw new Error(
                        `It is not possible to have more than one parameter of the type "string" if the `+
                        `"disableQuotationMarks" option is enabled.\n`);
                } else if (command.parameters[i].type === 'string' && command.parameters[i + 1] !== undefined) {
                    throw new Error(
                        `The last parameter of the command must be of type "string", because the "disableQuotationMarks" option is enabled.\n`);
                }
            }
        }
    }
    commandsManager.add(command);
    return command;
}

function argumentType(arg: any): 'string' | 'boolean' | 'number' | null {
    if (typeof arg === 'string') {
        // Boolean
        if (arg.match(/^si$|^no$|^true$|^false$/i)) {
            return 'boolean';
        }
        // Number
        if (arg.match(/^[0-9]+$|^-+[0-9]+$/)){
            return 'number';
        }
        // String
        return 'string';
    } else if (typeof arg === 'number') {
        return 'number';
    }  else if (typeof arg === 'boolean') {
        return 'boolean';
    }
    return null;
}

function verifyArgs(args: any[], command: Command): boolean {
    if (!command.parameters) { return false; }
    
    // Ignore excess arguments, to avoid errors when checking
    const argsLen: number = args.length > command.parameters.length ? command.parameters.length : args.length;
    
    // Check each parameter
    for (let argIndex = 0; argIndex < argsLen; argIndex++) {
        const parameter = command.parameters[argIndex];

        if (parameter.type === 'any') {
            continue;
        }
        if (parameter.type === 'string' || argumentType(args[argIndex]) === parameter.type) {
            switch (parameter.type) {
                case 'string':
                    if (command.options.disableQuotationMarks === true) {
                        args[argIndex] = args.splice(argIndex).join(" ");
                    } else if (args[argIndex].match(/^"([^]*)"$|^'([^]*)'$/)) {
                        args[argIndex] = args[argIndex].slice(1,-1); // Delete quotes
                    }
                    break;
                case 'number':
                    if (args[argIndex].charAt(0) === '-') {
                        args[argIndex] = (+args[argIndex].slice(1)) * -1;
                    } else {
                        args[argIndex] = +args[argIndex];
                    }
                    break;
                case 'boolean':
                    if (args[argIndex].match(/^si$|^true$/)) {
                        args[argIndex] = true;
                    } else if (args[argIndex].match(/^no$|^false$/)){
                        args[argIndex] = false;
                    }
                    break;
            }
        } else {
            // There was no match
            throw new CommandError(COMMAND_ERROR_MESSAGES.INVALID_ARGUMENT(command, args[argIndex], parameter));
        }
    }
    return true;
}

export function searchCommand(commandName: string): Command | null {
    // Check that it's not an empty string
    if (typeof commandName === 'string' && commandName.length) {        
        const search = commandsManager.alias.get(commandName.toLowerCase());
        if (search != undefined) { return commandsManager.list[search]; }
    }

    return null;
}

export function commandExists(commandName: string): boolean {
    return commandsManager.alias.has(commandName.toLocaleLowerCase());
}

export async function commandExecution(message : Message): Promise<void> {
    // Check if string is empty
    if (!message.body || message.body.length === 0) { return; }
    
    // Separate arguments and command
    const commandArgs: string[] = message.body.match(/"([^"]*)"|'([^']*)'|[^ ]+/gim) ?? [];
    const commandName: string = commandArgs.shift()?.slice(commandsPrefix.length) ?? '';
    const commandObj = searchCommand(commandName);
    if (!commandObj) { return; }

    const from = message.fromMe ? message.to : message.from;
    
    try {
        // Cool-down system
        if (!checkUserCoolDown(message)) { return; }

        // Verify that the user has access to the command
        if (!commandObj.options.adminOnly || (message.fromMe && commandObj.options.adminOnly)) {
            USERS_EXECUTING_COMMANDS.add(from);

            commandLog(commandObj.alias[0], commandArgs, message);
            await sendReactionResponse('⏳', message);
            
            // Commands that require a message to be quoted
            if (commandObj.options.needQuotedMessage === true && !message.hasQuotedMsg) {
                throw new CommandError(COMMAND_ERROR_MESSAGES.MISSING_QUOTE);
            }
            // Commands without parameters
            if (!commandObj.parameters) {     
                await commandObj.callback(commandArgs, message);
                USERS_EXECUTING_COMMANDS.delete(from);
                botLogOk(`El comando "${commandObj.alias[0]}" finalizó su ejecución.\n`);
                return;
            } else {
                // Commands with parameters
                const paramLength = commandObj.parameters.length;
                const optionalValues = [];
                
                // Add default values if missing
                if (commandObj.hasOptionalValues && commandArgs.length < paramLength) {
                    for (let i = commandArgs.length; i < paramLength; i++) {
                        if (commandObj.parameters[i].isOptional) {
                            optionalValues.push(commandObj.parameters[i].defaultValue);
                        }
                    }
                }

                if ([...commandArgs, ...optionalValues].length >= paramLength) {
                    if (verifyArgs(commandArgs, commandObj)) {
                        await commandObj.callback([...commandArgs, ...optionalValues], message);
                        USERS_EXECUTING_COMMANDS.delete(from);
                        botLogOk(`El comando "${commandObj.alias[0]}" finalizó su ejecución.\n`);
                        return;
                    }
                } else {
                    throw new CommandError(COMMAND_ERROR_MESSAGES.MISSING_ARGUMENT(commandObj, commandArgs));
                }
            }
        }
    } catch(error) {
        if (USERS_EXECUTING_COMMANDS.has(from)) { USERS_EXECUTING_COMMANDS.delete(from); }
        if (error instanceof CommandError) {
            await sendErrorResponse(error.message, message, { ...error.options });
            botLogError(`El comando "${commandObj.alias[0]}" finalizó su ejecución.\n`);
        } else {
            console.error(error);
        }
    }
    return;
}

function commandLog(commandName: string, commandArgs: any[], message: Message): void {
    let from = 'OCULTO';
    if (message.fromMe) {
        from = whatsappSettings.botName;
    } else if (whatsappSettings.showPhoneNumber) {
        from = message.from;
    } else if (whatsappSettings.showUserName) {
        // @ts-ignore
        from = message.rawData.notifyName;
    }
    
    console.log();
    botLog(`Executing command...\n\n`,
        `> Command: "${commandName}"\n`,
        `> From:`, from, '\n',
        `> Args:`, commandArgs);
}

export function commandExample(command: Command): string | null {
    if (command.info && command.info.name.length > 0) {
        if (!command.parameters && command.info.description === undefined) { return null; }

        let text = `🤖 *${command.info.name}* 🤖`;
        if (command.info.description?.length) { text += `\n\n${command.info.description}`; }

        if (command.parameters) {
            let alias = command.alias[0];
            
            if (commandsPrefix.length === 0) {
                alias = capitalizedCase(command.alias[0]);
            }
            
            text += `\n\n✍️ *Sintaxis del comando* ✍️\n\n`;
            text += commandsPrefix + alias;

            let example = '\n\n📥 *Ejemplo* 📥\n\n' + commandsPrefix + alias;
            let parameterDescription = '';

            command.parameters.forEach((parameter) => {
                if (parameter.info && parameter.info.name) {
                    if (parameter.isOptional === true) {
                        text += ` \`[${parameter.info.name}]\``;
                    } else {
                        text += ` \`${parameter.info.name}\``;
                    }

                    if (parameter.type === 'string' && command.options.disableQuotationMarks === false) {
                        example += ` "*${parameter.info.example}*"`;
                    } else {
                        example += ` *${parameter.info.example}*`;
                    }

                    if (parameter.info.description) {
                        parameterDescription += `\n*${parameter.info.name}*: ${parameter.info.description}`;
                    }
                }
            })

            text += example + (parameterDescription.length ? '\n\n📄 *Parámetros* 📄\n' + parameterDescription : '');
        }

        if (command.alias.length > 1) {
            text += '\n\n🏷️ *Alias* 🏷️\n\n'
            text += '"' + command.alias.join(`" - "`) + '"';
        }

        return text;
    } else {
        return null;
    }
}

// Help command
createCommand(['ayuda', 'help', '?', '❓'], {
    info: {
        name: 'Ayuda',   
        description: 'Obtener información sobre el uso de un comando.',
    }})
    .setCallback(async (args, message) => {
        if (args.length > 0 && args[0]) {
            const command = searchCommand(args[0]);
            if (command) {
                const example = commandExample(command);
                if (example) {
                    await sendResponse(example, message, {
                        reaction: '👍',
                        messageOptions: { linkPreview: false },
                    });
                } else {
                    await sendErrorResponse(`No exite información sobre el comando *${args[0]}*.`, message);
                }
            } else {
                await sendErrorResponse(`El comando *${args[0]}* no existe.`, message);
            }
        } else {
            const ayuda = '📚 *¿Cómo usar el bot?* 📚\n\n' +
                'Para ejecutar un comando formule un mensaje que comience ' +
                'con el nombre del comando seguido de los parámetros del mismo ' +
                'espaciados entre si. Por ejemplo:\n\n' +
                '> *Micro* `120` `M1040`\n\n' +            
                '📒 *Lista de comandos* 📒\n\n' +
                '🚏 *Parada* `N° de parada`\n' +
                '🚍 *Micro* `Línea` `Nº de parada`\n' +
                '🚊 *Metro* `Nombre de la estación`\n\n' +
                'Si desea saber más información sobre un comando, conocer más usos, utilice:\n' +
                '❓ *Ayuda* `Nombre del comando`';
            await sendResponse(ayuda, message, {
                reaction: '👍',
                messageOptions: { linkPreview: false },
            });
        }
        return;
    })
    .addParameter('string', { name: 'Nombre del comando', example: 'parada', }, null)
.closeCommand();