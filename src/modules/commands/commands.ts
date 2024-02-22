import { Command, CommandData, CommandOptions, CommandResponseOptions, CommandReturn, Parameter, ParameterInfo } from "../../ts/interfaces/commands.js";
import { CommandCallback, ParameterType } from "../../ts/types/commands.js";
import { CommandResponse, CommandResponseType } from "../../ts/enums/commands.js";
import { read_response } from "../whatsapp/read_response.js";
import { Message, MessageContent } from "whatsapp-web.js";
import { bot_log, bot_log_warn } from "../../utils/bot_log.js";

const commandsSettings = require('../../../config/commands.json');
const whatsappSettings = require('../../../config/whatsapp.json');

const commandDefaultOptions: CommandOptions = Object.freeze({
    adminOnly: false,
    needQuotedMessage: false,
});

const parameterDefaultInfo: ParameterInfo = Object.freeze({
    name: 'UNDEFINED',
    description: '',
    example: 'UNDEFINED',
});

export const COMMAND_ERROR_MESSAGES = Object.freeze({
    MISSING_ARGUMENT: (commandObject: Command, args: any[]) => {
        let commandArgs = `${args.length > 0 ? `_${args.join(' ')}_ ` : ''}`;
        let alias: string = commandsSettings.commandPrefix > 0 ? commandObject.alias[0] : commandObject.alias[0].charAt(0).toUpperCase() + commandObject.alias[0].slice(1);

        if (commandObject.parameters) {
            for (let i = args.length; i < commandObject.parameters.length; i++ ) {
                if (commandObject.parameters[i].isOptional === true) {
                    commandArgs += `[ *${commandObject.parameters[i].info?.name}* ]`;
                } else {
                    commandArgs += `{ *${commandObject.parameters[i].info?.name}* }`;
                }
                if (i !== commandObject.parameters.length -1) { commandArgs += ' '; }
            }
        }

        return `Arguments missing in the command.\n\n` +
                `_${commandsSettings.commandPrefix}${alias}_ ${commandArgs}`
    },
    MISSING_QUOTE: 'This command requires quoting a message to be executed.',
    INVALID_ARGUMENT: (commandAlias: string, arg: any, param: Parameter) => {
        return `Invalid argument "*${arg}*".\n\n`+
                `The parameter "*${param.info?.name}*" must be *${param.type}*.\n\n` +
                `For more info use: *${commandsSettings.commandPrefix}${commandsSettings.commandPrefix.length > 0 ? 'help' : 'Help' } ${commandAlias}*`;
    }
});

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
            if (this.alias.has(command.alias[i])) {
                collisions++;
                filterCommandAlias.splice(i, 1);
                bot_log_warn(`WARNING: "${command.alias[i]}" alias is being used by another command.\n`);
            }
        }

        if (collisions === command.alias.length) {
            throw new Error(`The command could not be added to the list, aliases [${command.alias.join(', ')}] are being used by other command(s).`);
        }

        let commandIndex = this.list.length;

        command.alias = filterCommandAlias;
        command.alias.forEach((alias) => { this.alias.set(alias, commandIndex) } );

        this.list.push(command);
    }
}

const commandsManager = new CommandsManager();

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
            ...commandDefaultOptions,
            ...data?.options,
        },
        info: data?.info,
        callback: () => {},
    }

    return commandBase({ ...command });
}

const setCallback = (command: Command) => (callback: CommandCallback) => {
    return commandBase({ ...command, callback });
}

const addParameter = (command: Command) => (type: ParameterType | ParameterType[], info?: ParameterInfo, defaultValue?: any) => {
    if (!Array.isArray(command.parameters)) { command.parameters = [] };
    if (typeof type === 'string') { type = [ type ]; }

    if ((defaultValue !== null && defaultValue !== undefined) && !type.some((paramType) => { return argument_type(defaultValue) === paramType; })) {
        throw new Error(`The dafault value "${defaultValue}" is of type "${typeof defaultValue}" and doesn't match any of the types: [${type.join(', ')}]\n`);
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
            ...parameterDefaultInfo,
            ...info,
        },
    });

    return commandBase(command);
}

const closeCommand = (command: Command) => () => {
    // Check that the optional parameters are at the end of the command.
    if (command.parameters && command.parameters.length > 1) {
        for (let i = 0; i < command.parameters.length - 1; i++) {            
            if (command.parameters[i].isOptional === true && command.parameters[i + 1].isOptional === false) {
                throw new Error(`Optional parameters must be placed at the end of the command.\n`);
            }
        }
    }
    commandsManager.add(command);
    return command;
}

function argument_type(arg: any): ParameterType | null {
    if (typeof arg === 'string') {
        // Boolean
        if (arg.match(/^si$|^no$|^true$|^false$/i)) {
            return 'boolean';
        }
        // Number
        if (arg.match(/^[0-9]+$/)){
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

function verify_args(args: any[], command: Command): boolean {
    if (!command.parameters) { return false; }

    // Ignore excess arguments, to avoid errors when checkin
    const argsLen: number = args.length > command.parameters.length ? command.parameters.length : args.length;
    
    // Check each parameter
    for (let argIndex = 0; argIndex < argsLen; argIndex++) {
        const parameter = command.parameters[argIndex];
        // Iterate on each possible type
        let match: boolean = false;
        for (let typeIndex = 0; typeIndex < parameter.type.length; typeIndex++) {
            if (parameter.type[typeIndex] === 'any') {
                match = true;
                break;
            }
            if (parameter.type[typeIndex] === 'string' || argument_type(args[argIndex]) === parameter.type[typeIndex]) {
                match = true;
                switch (parameter.type[typeIndex]) {
                    case 'string':
                        if ((args[argIndex].match(/^"([^]*)"$|^'([^]*)'$/))) {
                            args[argIndex] = args[argIndex].slice(1,-1); // Delete quotes
                        }
                        break;
                    case 'number':
                        // TODO: Negative numbers
                        args[argIndex] = +args[argIndex];
                        break;
                    case 'boolean':
                        if (args[argIndex].match(/^si$|^true$/)) {
                            args[argIndex] = true;
                        } else if (args[argIndex].match(/^no$|^false$/)){
                            args[argIndex] = false;
                        }
                        break;
                }
                break;
            }
        }
        // There was no match
        if (!match) {
            throw new CommandError(COMMAND_ERROR_MESSAGES.INVALID_ARGUMENT(command.alias[0], args[argIndex], parameter));
        }
    }
    return true;
}

export function search_command(commandName: string): Command | null {
    // Check that it's not an empty string
    if (typeof commandName === 'string' && commandName.length) {        
        const search = commandsManager.alias.get(commandName);
        if (search != undefined) { return commandsManager.list[search]; }
    }

    return null;
}

export async function exec_command(message : Message): Promise<void> {
    try {
        // Separate arguments and command
        let commandArgs: any[] | null = message.body.match(/"([^"]*)"|'([^']*)'|[^ ]+/gim) ?? [];

        const commandName: string | undefined = commandArgs?.shift()?.slice(commandsSettings.commandPrefix.length).toLowerCase();
        if (!commandName) { return; } // If there is no command in the string

        const commandObject = search_command(commandName);
        if (!commandObject) { return; }
        
        // Verify that the user has access to the command
        if (!commandObject.options.adminOnly || (message.fromMe && commandObject.options.adminOnly)) {
            command_log(commandName, commandArgs, message);
            await send_response(null, message, { reaction: '⏳' });
            
            // Commands that require a message to be quoted
            if (commandObject.options.needQuotedMessage === true && !message.hasQuotedMsg) {
                throw new CommandError(COMMAND_ERROR_MESSAGES.MISSING_QUOTE);
            }
            // Commands without parameters
            if (!commandObject.parameters) {     
                commandObject.callback(commandArgs, message);
                return;
            } else {
                // Commands with parameters
                const paramLength = commandObject.parameters.length;
                const optionalValues = [];
                
                // Add default values if missing
                if (commandObject.hasOptionalValues && commandArgs.length < paramLength) {
                    for (let i = commandArgs.length; i < paramLength; i++) {
                        if (commandObject.parameters[i].isOptional) {
                            optionalValues.push(commandObject.parameters[i].defaultValue);
                        }
                    }
                }

                if ([...commandArgs, ...optionalValues].length >= paramLength) {
                    if (verify_args(commandArgs, commandObject)) {
                        commandObject.callback([...commandArgs, ...optionalValues], message);
                        return;
                    }
                } else {
                    throw new CommandError(COMMAND_ERROR_MESSAGES.MISSING_ARGUMENT(commandObject, commandArgs));
                }
            }
        }
    } catch(error) {
        if (error instanceof CommandError) {
            send_error_response(error.message, message, { ...error.options });
        } else {
            console.error(error);
        }
    }
    return;
}

function command_log(commandName: string, commandArgs: any[], message: Message): void {
    let from = 'HIDDEN';
    if (message.fromMe) {
        from = whatsappSettings.botName;
    } else if (whatsappSettings.showPhoneNumber) {
        from = message.from;
    } else if (whatsappSettings.showUserName) {
        // @ts-ignore
        from = message.rawData.notifyName;
    }
    
    console.log();
    bot_log(`Executing command...\n\n`,
        `> Command: "${commandName}"\n`,
        `> From:`, from, '\n',
        `> Args:`, commandArgs, '\n');
}

export function command_example(command: Command): string | null {   
    if (command.info && command.info.name.length) {
        let text = `🤖 *${command.info.name}* 🤖`;
        if (command.info.description?.length) { text += `\n\n${command.info.description}`; }

        if (command.parameters) {
            let alias = command.alias[0];
            
            if (commandsSettings.commandPrefix.length === 0) {
                alias = command.alias[0].charAt(0).toUpperCase() + command.alias[0].slice(1);
            }
            
            text += `\n\n✍️ *Command Syntax* ✍️\n\n`;
            text += commandsSettings.commandPrefix + alias;

            let example = '\n\n📥 *Example* 📥\n\n' + commandsSettings.commandPrefix + alias;
            let parameterDescription = '';

            command.parameters.forEach((parameter) => {
                if (parameter.info && parameter.info.name) {
                    if (parameter.isOptional === true) {
                        // Optional parameters
                        text += ` [ *${parameter.info.name}* ]`;
                    } else {
                        text += ` { *${parameter.info.name}* }`;
                    }

                    if (parameter.type.indexOf('string') != -1) {
                        if (parameter.info.example.indexOf(' ') > -1) {
                            example += ` "*${parameter.info.example}*"`;
                        } else {
                            example += ` *${parameter.info.example}*`;
                        }
                    } else {
                        example += ` *${parameter.info.example}*`;
                    }

                    if (parameter.info.description) {
                        parameterDescription += `\n\n*${parameter.info.name}*: ${parameter.info.description}`;
                    }
                }
            })

            text += example + (parameterDescription.length ? '\n\n📄 *Parameters* 📄' + parameterDescription : '');
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

// Send response
export async function send_response(content: MessageContent | null, message: Message, options?: CommandResponseOptions | undefined): Promise<Message | void> {
    // Avoid commands that send other commands, as this can generate an infinite loop of sending messages.
    if (content && typeof content === 'string' && content.indexOf(commandsSettings.commandPrefix) === 0) {
        const strHead: string = content.split(" ")[0].slice(commandsSettings.commandPrefix.length);
        if (search_command(strHead)) {
            throw new Error(`The response to a command cannot contain another command at the beginning, as this can create an infinite loop.\n\n`+
                            `\tResponse: "\x1b[41m${commandsSettings.commandPrefix}${strHead}\x1b[0m${content.slice(commandsSettings.commandPrefix.length + strHead.length)}"\n`);
        }
    }
    const response: CommandReturn = {
        code: options?.asError ? CommandResponse.ERROR : CommandResponse.OK,
        type: options?.reply ? CommandResponseType.REPLY_MESSAGE : CommandResponseType.SEND_MESSAGE,
        data: {
            content: content,
            reaction: options?.reaction,
            options: options?.messageOptions,
        }
    }
    return await read_response(response, message);
}

export async function send_error_response(content: MessageContent | null, message: Message, options?: CommandResponseOptions | undefined): Promise<Message | void> {
    return await send_response(content, message, { ...options, asError: true });
}

// Help command
createCommand(['help', '?'], {
    info: {
        name: 'Help',
        description: 'Get info about a command.',
    }})
    .setCallback(function(args, message) {
        if (args.length > 0) {
            const command = search_command(args[0].toLowerCase());
            if (command) {
                const example = command_example(command);
                if (example) {
                    send_response(example, message);
                    return;
                } else {
                    send_error_response(`There is no information for the command *${args[0]}*.`, message);
                }
            } else {
                send_error_response(`The command *${args[0]}* doesn't exist.`, message);
            }
        } else {
            // @ts-ignore
            send_response(command_example(this), message);
        }
    })
    .addParameter('string', { name: 'Command name', example: 'ping', }, null)
.closeCommand();