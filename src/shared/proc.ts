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
    GETCWD,
    EXEC,
    CHCWD,
    DIE,

    READ_RES,
    WRITE_RES,
    OPEN_RES,
    GETDENTS_RES,
    GETCWD_RES,
    EXEC_RES,
    CHCWD_RES,
}

export interface IProcMessage{
    type: MessageType
    id: MessageID
}

export interface IDependency{
    name:string,
    code:string
}

export interface IProcStart extends IProcMessage{
    type: MessageType.START,
    code: string,
    argv: string[],
    dyna: IDependency[],
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

export interface IProcGetCwd extends IProcMessage{
    type: MessageType.GETCWD,
}

export interface IProcGetCwdRes extends IProcMessage{
    type: MessageType.GETCWD_RES,
    cwd: string
}

export interface IProcExec extends IProcMessage{
    type: MessageType.EXEC,
    path: string
    argv: string[]
}

export interface IProcExecRes extends IProcMessage{
    type: MessageType.EXEC_RES,
    pid:number
}

export interface IProcChCwd extends IProcMessage{
    type: MessageType.CHCWD,
    path: string
}

export interface IProcChCwdRes extends IProcMessage{
    type: MessageType.CHCWD_RES
}

export interface IProcDie extends IProcMessage{
    type: MessageType.DIE
}
