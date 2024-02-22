# udmilla-whatsapp-bot

**Udmilla** is a small bot for WhatsApp made with [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) library using **Typescript**.

A [hot-swap mode](#hot-swap) is available for development purposes, allowing new commands to be written and tested without restarting the server.

<div align="center">
<img src="./docs/pingpong-example.png">
</div>

## Quick links

* [Quick Start](#quick-start)
* [Create command](#create-command)
    * [Command](#create-command)
        * [Alias](#command-alias)
        * [Callback](#command-callback)
        * [Options](#command-options)
        * [info](#command-info)
    * [Parameters](#command-parameters)
        * [Types](#parameter-type)
        * [Default value](#parameter-default-value)
        * [Info](#parameter-info)
* [Send response](#send-response)
* [Examples](#examples)
* [Hot-swap mode](#hot-swap)


## Quick Start

Node v12+ is required.

### 1. Clone repository

```bash
git clone https://github.com/Lautauro/udmilla-whatsapp-bot.git
```

### 2. Install packages

```bash
npm i
```

### 3. Build and log in WhatsApp Web

```bash
npm run build
npm start
```

Scan the QR code.

### 4. Done

Start playing!

> [!NOTE]
> You can change the command prefix **"."** and other configurations in **/src/config/**.

## Create command

Go to **/src/modules/commands/** and open **commands_list.ts**.


To create a command you need to use the **createCommand** function.

```js
createCommand(['alias'], {
        // Command options (Optional)
        options: { /* ... */ },

        // Command info (Optional, but recommended)
        info: { /* ... */ },
    })
    // Command callback
    .setCallback((args, message) => {
        console.log('Number: ', args[0]);
    })
    .addParameter('number')
.closeCommand(); // Add command to list
```

It is very important not to forget to add "closeCommand" at the end, otherwise the command will not be recognised by the bot.

<div align="center">
<img src="./docs/diagram-command.png">
</div>

### Command alias:

Names by which the command can be invoked

```js
createCommand(['ping', 'pingpong', 'p']) /* etc... */
```
### Command callback:

When a command is invoked, this function is called. You can read the arguments passed by the user using the "args" variable, and use the "message" object to interact with the chat.

```js
createCommand(['alias'])
    // Receive argument of type string
    .addParameter('string')
    // Command execution
    .setCallback((args, message) => {
        if (args[0] === 'Hi') {
            // Send "Hello!"
            send_response('Hello!', message);
        } else {
            // Send "Bye!"
            send_response('Bye!', message);
        }
    })
.closeCommand(); // Add command to list
```
[Send Response](#send-response)

### Command Data:

```js
{
    options: {
        // If true, command can only be executed by admin
        adminOnly: boolean,

        // The command must be or not a quoted message
        needQuotedMessage: boolean,
    },

    // This information will be used by the "help" command to describe the command itself.
    info: {
        name: string,           // Command name
        description: string,    // What it does
    }
}
```

## Command Parameters:

```js
addParameter(ParameterType, ParameterInfo?, defaultValue?);
```

### Parameter Type:
```ts
type ParameterType = 'string' | 'number' | 'boolean' | 'any';
```

### Parameter info:

This information will be used by the "help" command to describe the parameter.

```js
{
    name: string,           // Parameter name
    description: string,    // What it does
    example: string         // Value used in the example 
}
```

### Parameter default value:

If the parameter is an optional argument, set its default value here. Otherwise, **undefined** should do the trick.

### Example:

```ts
createCommand(['foo'])
    .addParameter('string', {
        name: 'Argument',
        description: 'Parameter 1 description',
        example: 'Lorem ipsum dolor',
    })
    // You should always put optional parameters at the end, such as the following. Otherwise it may cause problems.
    .addParameter('number', {
        name: 'Optional Argument',
        description: 'Parameter 2 description',
        example: '123',
    }, 456 /* Now it's an optional parameter */ )
    .setCallback((args, message) => {
        // Do something
    })
.closeCommand();
```

<div align="center">
<img src="./docs/help-command-example1.png">
</div>

## Send Response

Send a message to a chat.

```js
send_response(MessageContent, MessageObj, options?)
```

For **MessageObj** info see: https://docs.wwebjs.dev/Message.html

### Message Content

```ts
type MessageContent = string | MessageMedia | Location | Poll | Contact | Contact[] | List | Buttons
```

See: https://docs.wwebjs.dev/Client.html#sendMessage

### Command response options

```js
// All are optional
{
    reply: boolean;     // Send message as a reply
    asError: boolean;   // Send message as error
    reaction: string;   // Reaction to message. Example: "🐕‍🦺"
    messageOptions: MessageSendOptions;
}
```

For more information on MessageSendOptions, see: https://docs.wwebjs.dev/global.html#MessageSendOptions

## Examples:

Command with **no arguments**:
```js
createCommand(['ping', 'pingpong'], {
        // Command options
        options: {
            adminOnly: true,
        },
        // Command info
        info: {
            name: 'Ping',
            description: 'Ping-pong! 🏓',
        }
    })
    .setCallback((args, message) => {
        send_response('Pong!', message, { reaction: '🏓', });
    })
.closeCommand();
```

<div align="center">
<img src="./docs/help-command-example2.png">
</div>


Command with arguments:

```ts
createCommand(['repeat'], {
        info: {
            name: 'Repeat text'
        }
    })
    .addParameter('string', {
        name: 'Text',
        description: 'Text to repeat.',
        example: 'Hello x5',
    })
    // You should always put optional parameters at the end, such as the following. Otherwise it may cause problems.
    .addParameter('number', {
        name: 'Times', 
        description: 'Number of times repeated.', 
        example: '5',
    }, 1)
    .setCallback((args, message) => {
        let msgToSend: string = args[0];

        for (let i = 1; i < args[1]; i++) {
            msgToSend += '\n' + args[0];
        }

        send_response(msgToSend, message, { reply: true }); // Send as reply
    })
.closeCommand()
```

<div align="center">
<img src="./docs/repeat-command-example.png">
</div>

Command with **quoted message**:

```ts
createCommand(['quote', 'cite'], {
        options: { 
            needQuotedMessage: true,
        },
        info: {
            name: 'Quote this',
            description: 'This command makes an author quote with the selected message. It needs to quote a message to work.',
        }
    })
    .setCallback(async (args, message) => {
        message.getQuotedMessage()
        .then((quotedMessage) => {
            const msgToSend = `*" ${quotedMessage.body} "*\n\n` + `- _${quotedMessage._data.notifyName}_`;
            send_response(msgToSend, message);
        });
    })
.closeCommand();    
```

## Hot-swap

The bot has a **command hot-swap mode**. It consists of a system that allows the developer to test the commands contained in **"/src/modules/commands_list.ts"** without having to completely restart the server, by simply recompiling the project. This is enabled by the **"hotSwappingEnabled"** configuration variable in **/src/config/commands.json**.

> [!WARNING]
> It is not recommended to enable this mode for non-development environments.