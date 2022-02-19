import {Perm, ForkMode2, IStat, MType, OMode, Status} from "../public/api";
import {
    pack,
    packA, packBytearray,
    packDouble,
    packInt32,
    packInt8, packStat,
    packString,
    packUInt32,
    packUInt8,
    unpack,
    unpackA, unpackBytearray,
    unpackDouble,
    unpackInt32,
    unpackInt8, unpackStat,
    unpackString,
    unpackUInt32,
    unpackUInt8
} from "./struct";

export type MessageID = string

export enum MessageType {
    READY,
    DEPENDENCY,
    START,
    FORK_START,

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
    STAT,
    WAIT,
    SLEEP,
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
    STAT_RES,
    WAIT_RES,
    SLEEP_RES,
    SIGNAL,

}

export enum Signal{
    ERROR
}

export type FileDescriptor = number

export interface IProcMessage {
    type: MessageType
    id: MessageID
}

function unpackMessage(a:Uint8Array, pattern: any){
    const s = unpack(a, pattern);
    s.shift();
    return s;
}

export function peak(a: Uint8Array){
    return unpack(a, [unpackInt8, unpackString])
}

export const MPDependency = (id: MessageID, name: string, code: string) =>
    pack([packInt8(MessageType.DEPENDENCY), packString(id), packString(name), packString(code)])
export const MUDependency = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackString, unpackString]) as [MessageID, string, string]

export const MPStat = (id: MessageID, fd: FileDescriptor) =>
    pack([packInt8(MessageType.STAT), packString(id), packInt32(fd)])
export const MUStat = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackInt32]) as [MessageID, FileDescriptor]

export const MPRead = (id: MessageID, fd: FileDescriptor, count: number) =>
    pack([packInt8(MessageType.READ), packString(id), packInt32(fd), packDouble(count)])
export const MURead = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackInt32, unpackDouble]) as [MessageID, FileDescriptor, number]

export const MPWrite = (id: MessageID, fd: FileDescriptor, buf: Uint8Array) =>
    pack([packInt8(MessageType.WRITE), packString(id), packInt32(fd), packBytearray(buf)])
export const MUWrite = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackInt32, unpackBytearray]) as [MessageID, FileDescriptor, Uint8Array]

export const MPPipeRes = (id: MessageID, fd: FileDescriptor[]) =>
    pack([packInt8(MessageType.PIPE_RES), packString(id), packA(fd, packInt32)])
export const MUPipeRes = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackA(unpackInt32)]) as [MessageID, FileDescriptor[]]

export const MPBind = (id: MessageID, name: string, old: string, flags: MType) =>
    pack([packInt8(MessageType.BIND), packString(id), packString(name), packString(old), packUInt32(flags)])
export const MUBind = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackString, unpackString, unpackUInt32]) as [MessageID, string, string, MType]

export const MPMount = (id: MessageID, fd: FileDescriptor, afd: FileDescriptor, old: string, aname:string, flags: MType) =>
    pack([packInt8(MessageType.MOUNT), packString(id), packInt32(fd), packInt32(afd), packString(old), packString(aname), packUInt32(flags)])
export const MUMount = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackInt32, unpackInt32, unpackString, unpackString, unpackUInt32]) as [MessageID, FileDescriptor, FileDescriptor, string, string, MType]

export const MPStart = (id: MessageID, code: string, args: string[]) =>
    pack([packInt8(MessageType.START), packString(id), packString(code), packA(args, packString)])
export const MUStart = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackString, unpackA(unpackString)]) as [MessageID, string, string[]]

export const MPForkStart = (id: MessageID, code: string, entrypoint:string, args: string[]) =>
    pack([packInt8(MessageType.FORK_START), packString(id), packString(code), packString(entrypoint), packA(args, packString)])
export const MUForkStart = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackString, unpackString, unpackA(unpackString)]) as [MessageID, string, string[]]

export const MPFork = (id: MessageID, path:string, args: string[], mode: ForkMode2) =>
    pack([packInt8(MessageType.FORK), packString(id), packString(path), packA(args, packString), packDouble(mode)])
export const MUFork = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackString, unpackA(unpackString), unpackDouble]) as [MessageID, string, string[], ForkMode2]

export const MPForkRes = (id: MessageID, pid: number) =>
    pack([packInt8(MessageType.FORK_RES), packString(id), packUInt32(pid)])
export const MUForkRes = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackUInt32]) as [MessageID, string, number]


export const MPWait = (id: MessageID, pid:number) =>
    pack([packInt8(MessageType.WAIT), packString(id), packUInt32(pid)])
export const MUWait = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackUInt32]) as [MessageID, number]

export const MPSleep = (id: MessageID, pid:number) =>
    pack([packInt8(MessageType.SLEEP), packString(id), packUInt32(pid)])
export const MUSleep = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackUInt32]) as [MessageID, number]

export const MPExec = (id: MessageID, code: string, args: string[]) =>
    pack([packInt8(MessageType.EXEC), packString(id), packString(code), packA(args, packString)])
export const MUExec = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackString, unpackA(unpackString)]) as [MessageID, string, string[]]

export const MPOpen = (id: MessageID, file: string, mode: OMode) =>
    pack([packInt8(MessageType.OPEN), packString(id), packString(file), packUInt32(mode)])
export const MUOpen = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackString, unpackUInt32]) as [MessageID, string, OMode]

export const MPCreate = (id: MessageID, file: string, mode: OMode, perm: Perm) =>
    pack([packInt8(MessageType.CREATE), packString(id), packString(file), packDouble(mode), packDouble(perm)])
export const MUCreate = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackString, unpackDouble, unpackDouble]) as [MessageID, string, OMode, Perm]

export const MPSignal = (id: MessageID, signal: Signal, arg: number) =>
    pack([packInt8(MessageType.SIGNAL), packString(id), packUInt8(signal), packUInt8(arg)])
export const MUSignal = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackUInt8, unpackUInt8]) as [MessageID, Signal, number]

export const MPWriteRes = (id: MessageID, count: number) =>
    pack([packInt8(MessageType.WRITE_RES), packString(id), packDouble(count)])
export const MUWriteRes = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackDouble]) as [MessageID, number]

export const MPReadRes = (id: MessageID, buf: Uint8Array) =>
    pack([packInt8(MessageType.READ_RES), packString(id), packBytearray(buf)])
export const MUReadRes = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackBytearray]) as [MessageID, Uint8Array]

export const MPStatRes = (id: MessageID, stat: IStat) =>
    pack([packInt8(MessageType.STAT_RES), packString(id), packStat(stat)])
export const MUStatRes = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackStat]) as [MessageID, Uint8Array]

export const MPExecRes = (id: MessageID, pid: number) =>
    pack([packInt8(MessageType.EXEC_RES), packString(id), packUInt32(pid)])
export const MUExecRes = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackUInt32]) as [MessageID, number]

const packFD = (m:MessageType) => ((id: MessageID, fd: FileDescriptor) =>
    pack([packInt8(m), packString(id), packInt32(fd)]))
const unpackFD = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackInt32]) as [MessageID, FileDescriptor]

export const MPOpenRes = packFD(MessageType.OPEN_RES)
export const MUOpenRes = unpackFD
export const MPCreateRes = packFD(MessageType.CREATE_RES)
export const MUCreateRes = unpackFD
export const MPClose = packFD(MessageType.CLOSE)
export const MUClose = unpackFD

export const MPDie = (id: MessageID, status: number) =>
    pack([packInt8(MessageType.DIE), packString(id), packUInt32(status)])
export const MUDie = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackDouble]) as [MessageID, number]

const packPath = (m:MessageType) => ((id: MessageID, path: string) =>
    pack([packInt8(m), packString(id), packString(path)]))
const unpackPath = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString, unpackString]) as [MessageID, string]

export const MPGetCwdRes = packPath(MessageType.GETCWD_RES)
export const MUGetCwdRes = unpackPath
export const MPChCwd = packPath(MessageType.CHCWD)
export const MUChCwd = unpackPath
export const MPUnmount = packPath(MessageType.UNMOUNT)
export const MUUnmount = unpackPath
export const MPRemove = packPath(MessageType.REMOVE)
export const MURemove = unpackPath

const packAnswer = (m:MessageType) => ((id: MessageID) =>
    pack([packInt8(m), packString(id)]))
const unpackAnswer = (a: Uint8Array) =>
    unpackMessage(a, [unpackInt8, unpackString]) as [string]

export const MPGetCwd = packAnswer(MessageType.GETCWD)
export const MUGetCwd = unpackAnswer
export const MPChCwdRes = packAnswer(MessageType.CHCWD_RES)
export const MUChCwdRes = unpackAnswer
export const MPMountRes = packAnswer(MessageType.MOUNT_RES)
export const MUMountRes = unpackAnswer
export const MPRemoveRes = packAnswer(MessageType.REMOVE_RES)
export const MURemoveRes = unpackAnswer
export const MPUnmountRes = packAnswer(MessageType.UNMOUNT_RES)
export const MUUnmountRes = unpackAnswer
export const MPCloseRes = packAnswer(MessageType.CLOSE_RES)
export const MUCloseRes = unpackAnswer
export const MPPipe = packAnswer(MessageType.PIPE)
export const MUPipe = unpackAnswer
export const MPBindRes = packAnswer(MessageType.BIND_RES)
export const MUBindRes = unpackAnswer
export const MPReady = packAnswer(MessageType.READY)
export const MUReady = unpackAnswer
export const MPWaitRes = packAnswer(MessageType.WAIT_RES)
export const MUWaitRes = unpackAnswer
export const MPSleepRes = packAnswer(MessageType.SLEEP_RES)
export const MUSleepRes = unpackAnswer

export function debug(a: Uint8Array){
    const [type, id] = peak(a);
    let result: any[] = []
    switch (type) {
        case MessageType.READY:
            result = MUReady(a);
            break
        case MessageType.DEPENDENCY:
            result = MUDependency(a);
            break;
        case MessageType.START:
            result = MUStart(a);
            break;
        case MessageType.READ:
            result = MURead(a);
            break;
        case MessageType.WRITE:
            result = MUWrite(a);
            break;
        case MessageType.OPEN:
            result = MUOpen(a);
            break;
        case MessageType.CREATE:
            result = MUCreate(a);
            break;
        case MessageType.CLOSE:
            result = MUClose(a);
            break;
        case MessageType.GETCWD:
            result = MUGetCwd(a);
            break;
        case MessageType.EXEC:
            result = MUExec(a);
            break;
        case MessageType.CHCWD:
            result = MUChCwd(a);
            break;
        case MessageType.MOUNT:
            result = MUMount(a);
            break;
        case MessageType.BIND:
            result = MUBind(a);
            break;
        case MessageType.UNMOUNT:
            result = MUUnmount(a);
            break;
        case MessageType.REMOVE:
            result = MURemove(a);
            break;
        case MessageType.PIPE:
            result = MUPipe(a);
            break;
        case MessageType.DIE:
            result = MUDie(a);
            break;
        case MessageType.READ_RES:
            result = MUReadRes(a);
            break;
        case MessageType.WRITE_RES:
            result = MUWriteRes(a);
            break;
        case MessageType.OPEN_RES:
            result = MUOpenRes(a);
            break;
        case MessageType.CREATE_RES:
            result = MUCreateRes(a);
            break;
        case MessageType.CLOSE_RES:
            result = MUCloseRes(a);
            break;
        case MessageType.GETCWD_RES:
            result = MUGetCwdRes(a);
            break;
        case MessageType.EXEC_RES:
            result = MUExecRes(a);
            break;
        case MessageType.CHCWD_RES:
            result = MUChCwdRes(a);
            break;
        case MessageType.MOUNT_RES:
            result = MUMountRes(a);
            break;
        case MessageType.BIND_RES:
            result = MUBindRes(a);
            break;
        case MessageType.UNMOUNT_RES:
            result = MUUnmountRes(a);
            break;
        case MessageType.REMOVE_RES:
            result = MURemoveRes(a);
            break;
        case MessageType.PIPE_RES:
            result = MUPipeRes(a);
            break;
        case MessageType.SIGNAL:
            result = MUSignal(a);
            break;
        case MessageType.FORK:
            result = MUFork(a);
            break;
        case MessageType.FORK_RES:
            result = MUForkRes(a);
            break;
        case MessageType.WAIT:
            result = MUWait(a);
            break;
        case MessageType.WAIT_RES:
            result = MUWaitRes(a);
            break;
    }

    result.unshift(MessageType[type]);
    return result;
}
