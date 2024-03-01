export const enum CommandResponse {
    OK,
    ERROR
}

export const enum CommandResponseType {
    UNKNOWN = -1,
    SEND_MESSAGE,
    REPLY_MESSAGE,
    REACT_TO_MESSAGE,
}