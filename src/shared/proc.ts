import {MountType, OpenMode, Status} from "../public/api";

export type MessageID = string

export enum MessageType{
    READY,
    START,

    READ = 10,
    WRITE,
    OPEN,
    CREATE,
    CLOSE,
    GETCWD,
    EXEC,
    FORK,
    CHCWD,
    MOUNT,
    BIND,
    UNMOUNT,
    REMOVE,
    PIPE,
    DIE,

    READ_RES = 100,
    WRITE_RES,
    OPEN_RES,
    CREATE_RES,
    CLOSE_RES,
    GETCWD_RES,
    EXEC_RES,
    FORK_RES,
    CHCWD_RES,
    MOUNT_RES,
    BIND_RES,
    UNMOUNT_RES,
    REMOVE_RES,
    PIPE_RES,
    ERROR,
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

export type FileDescriptor = number

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
    flags: OpenMode
}

export interface IProcOpenRes extends IProcMessage{
    type:MessageType.OPEN_RES,
    fd:FileDescriptor
}

export interface IProcCreate extends IProcMessage{
    type:MessageType.CREATE,
    path: string,
    mode: number
}

export interface IProcCreateRes extends IProcMessage{
    type:MessageType.CREATE_RES,
    fd:FileDescriptor
}

export interface IProcClose extends IProcMessage{
    type:MessageType.CLOSE,
    fd:FileDescriptor
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
    status: Status
}

export interface IProcMount extends IProcMessage{
    type: MessageType.MOUNT,
    fd: FileDescriptor,
    afd: FileDescriptor|null,
    old: string,
    flag: number,
    aname: string | null
}

export interface IProcMountRes extends IProcMessage{
    type: MessageType.MOUNT_RES
}

export interface IProcUnmount extends IProcMessage{
    type: MessageType.UNMOUNT,
    path: string
}

export interface IProcUnmountRes extends IProcMessage{
    type: MessageType.UNMOUNT_RES,
}

export interface IProcRemove extends IProcMessage{
    type: MessageType.REMOVE,
    path: string
}

export interface IProcRemoveRes extends IProcMessage{
    type: MessageType.REMOVE_RES
}

export interface IProcPipe extends IProcMessage{
    type: MessageType.PIPE,
}

export interface IProcPipeRes extends IProcMessage{
    type: MessageType.PIPE_RES
    fds: FileDescriptor[]
}

export interface IProcBind extends IProcMessage{
    type: MessageType.BIND
    name: string,
    old: string,
    flags: MountType
}

export interface IProcBindRes extends IProcMessage{
    type: MessageType.BIND_RES
}

export interface IProcError extends IProcMessage{
    type: MessageType.ERROR,
    code: Status
}

