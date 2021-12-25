import {FileDescriptor, IDirectoryEntry, OpenOptions} from "../public/api";

export type MessageID = string

export enum MessageType{
    READY,
    START,
    READ,
    WRITE,
    OPEN,
    CLOSE,
    GETDENTS,

    READ_RES,
    WRITE_RES,
    OPEN_RES,
    GETDENTS_RES,
}

export interface IProcMessage{
    type: MessageType
    id: MessageID
}

export interface IProcStart extends IProcMessage{
    type: MessageType.START,
    code: string
}

export interface IProcRead extends IProcMessage{
    type: MessageType.READ,
    fd: FileDescriptor,
    count: number
}

export interface IProcReadRes extends IProcMessage{
    type: MessageType.READ_RES,
    buf: string
}


export interface IProcWrite extends IProcMessage{
    type: MessageType.WRITE,
    fd: FileDescriptor,
    buf: string
}

export interface IProcWriteRes extends IProcMessage{
    type: MessageType.WRITE_RES,
    count: number
}

export interface IProcOpen extends IProcMessage{
    type:MessageType.OPEN,
    path: string,
    flags: OpenOptions
}

export interface IProcOpenRes extends IProcMessage{
    type:MessageType.OPEN_RES,
    fd:FileDescriptor
}

export interface IProcClose extends IProcMessage{
    type:MessageType.CLOSE,
    fd:FileDescriptor
}

export interface IProcGetDEnts extends IProcMessage{
    type:MessageType.GETDENTS,
    fd:FileDescriptor,
    count: number,
}

export interface IProcGetDEntsRes extends IProcMessage{
    type:MessageType.GETDENTS_RES,
    dirents: IDirectoryEntry[]
}
