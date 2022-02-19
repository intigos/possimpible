import {Perm, IStat, OMode, Type, FileDescriptor} from "./api";

import {
    pack, packA, packBytearray, packDouble, packStat,
    packString,
    packUInt16,
    packUInt32,
    packUInt8,
    unpack, unpackA, unpackBytearray, unpackDouble, unpackInt8, unpackStat, unpackString,
    unpackUInt16,
    unpackUInt32,
    unpackUInt8
} from "../shared/struct";

export enum Protocol9P{
    Tversion = 100,
    Rversion = 101,
    Tattach = 104,
    Rattach = 105,
    Rerror = 107,
    Tflush = 108,
    Rflush = 109,
    Twalk = 110,
    Rwalk = 111,
    Topen = 112,
    Ropen = 113,
    Tcreate = 114,
    Rcreate = 115,
    Tread = 116,
    Rread = 117,
    Twrite = 118,
    Rwrite = 119,
    Tclunk = 120,
    Rclunk = 121,
    Tremove = 122,
    Rremove = 123,
    Tstat = 124,
    Rstat = 125,
    Twstat = 126
}

type Tag = number;

export const MPTversion = (tag: Tag, msize: number, version: string) => pack([packUInt8(Protocol9P.Tversion), packUInt16(tag), packUInt32(msize), packString(version)]);
export const MUTversion = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32, unpackString]) as [Protocol9P, Tag, number, string];

export const MPRversion = (tag: Tag, msize: number, version: string) => pack([packUInt8(Protocol9P.Rversion), packUInt16(tag), packUInt32(msize), packString(version)]);
export const MURversion = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32, unpackString]) as [Protocol9P, Tag, number, string];;

export const MPRerror = (tag: Tag, ename: string) => pack([packUInt8(Protocol9P.Rerror), packUInt16(tag), packString(ename)]);
export const MURerror = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackString]) as [Protocol9P, Tag, string];

export const MPTflush = (tag: Tag, oldtag: Tag) => pack([packUInt8(Protocol9P.Tflush), packUInt16(tag), packUInt16(oldtag)]);
export const MUTflush = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt16]) as [Protocol9P, Tag, number];

export const MPRflush = (tag: Tag, oldtag: Tag) => pack([packUInt8(Protocol9P.Rflush), packUInt16(tag)]);
export const MURflush = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16]) as [Protocol9P, Tag];

export const MPTattach = (tag: Tag, fd: Fid, uname:string, aname:string) => pack([packUInt8(Protocol9P.Tattach), packUInt16(tag), packUInt32(fd), packString(uname), packString(aname)]);
export const MUTattach = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32, unpackString, unpackString]) as [Protocol9P, Tag, Fid, string, string];

export const MPRattach = (tag: Tag, type: Type) => pack([packUInt8(Protocol9P.Rattach), packUInt16(tag), packUInt8(type)]);
export const MURattach = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt8])  as [Protocol9P, Tag, Type];

export const MPTwalk = (tag: Tag, fd: Fid, newfd: Fid, wname: string[]) => pack([packUInt8(Protocol9P.Twalk), packUInt16(tag), packUInt32(fd), packUInt32(newfd), packA(wname, packString)]);
export const MUTwalk = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32, unpackUInt32, unpackA(unpackString)]) as [Protocol9P, Tag, Fid, Fid, string[]];

export const MPRwalk = (tag: Tag, type: Type[]) => pack([packUInt8(Protocol9P.Rwalk), packUInt16(tag), packA(type, packUInt8)]);
export const MURwalk = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackA(unpackUInt8)])  as [Protocol9P, Tag, Type[]];

export const MPTopen = (tag: Tag, fd: Fid, mode: OMode) => pack([packUInt8(Protocol9P.Topen), packUInt16(tag), packUInt32(fd), packUInt8(mode)]);
export const MUTopen = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32, unpackUInt8]) as [Protocol9P, Tag, Fid, OMode];

export const MPRopen = (tag: Tag, type: Type) => pack([packUInt8(Protocol9P.Ropen), packUInt16(tag), packUInt8(type)]);
export const MURopen = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt8])  as [Protocol9P, Tag, Type];

export const MPTcreate = (tag: Tag, fd: Fid, name: string, mode: Perm) => pack([packUInt8(Protocol9P.Tcreate), packUInt16(tag), packUInt32(fd), packString(name), packDouble(mode)]);
export const MUTcreate = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32, unpackString, unpackDouble]) as [Protocol9P, Tag, Fid, string, Perm];

export const MPRcreate = (tag: Tag, type: Type) => pack([packUInt8(Protocol9P.Rcreate), packUInt16(tag), packUInt8(type)]);
export const MURcreate = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt8])  as [Protocol9P, Tag, Type];

export const MPTread = (tag: Tag, fd: Fid, offset: number, count: number) => pack([packUInt8(Protocol9P.Tread), packUInt16(tag), packUInt32(fd), packDouble(offset), packUInt32(count)]);
export const MUTread = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32, unpackDouble, unpackUInt32]) as [Protocol9P, Tag, Fid, number, number];

export const MPRread = (tag: Tag, buf: Uint8Array) => pack([packUInt8(Protocol9P.Rread), packUInt16(tag), packBytearray(buf)]);
export const MURread = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackBytearray])  as [Protocol9P, Tag, Uint8Array];

export const MPTwrite = (tag: Tag, fd: Fid, offset: number, buf: Uint8Array) => pack([packUInt8(Protocol9P.Twrite), packUInt16(tag), packUInt32(fd), packDouble(offset), packBytearray(buf)]);
export const MUTwrite = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32, unpackDouble, unpackBytearray]) as [Protocol9P, Tag, Fid, number, Uint8Array];

export const MPRwrite = (tag: Tag, count: number) => pack([packUInt8(Protocol9P.Rwrite), packUInt16(tag), packUInt32(count)]);
export const MURwrite = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32])  as [Protocol9P, Tag, number];

export const MPTclunk = (tag: Tag, fd: Fid) => pack([packUInt8(Protocol9P.Tclunk), packUInt16(tag), packUInt32(fd)]);
export const MUTclunk = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32]) as [Protocol9P, Tag, Fid];

export const MPRclunk = (tag: Tag) => pack([packUInt8(Protocol9P.Rclunk), packUInt16(tag)]);
export const MURclunk = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16])  as [Protocol9P, Tag];

export const MPTremove = (tag: Tag, fd: Fid) => pack([packUInt8(Protocol9P.Tremove), packUInt16(tag), packUInt32(fd)]);
export const MUTremove = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32]) as [Protocol9P, Tag, Fid];

export const MPRremove = (tag: Tag) => pack([packUInt8(Protocol9P.Rremove), packUInt16(tag)]);
export const MURremove = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16])  as [Protocol9P, Tag];

export const MPTstat = (tag: Tag, fd: Fid) => pack([packUInt8(Protocol9P.Tstat), packUInt16(tag), packUInt32(fd)]);
export const MUTstat = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackUInt32]) as [Protocol9P, Tag, Fid];

export const MPRstat = (tag: Tag, stat: IStat) => pack([packUInt8(Protocol9P.Rstat), packUInt16(tag), packStat(stat)]);
export const MURstat = (a: Uint8Array) => unpack(a, [unpackUInt8, unpackUInt16, unpackStat])  as [Protocol9P, Tag, IStat];


export function peak9p(a: Uint8Array){
    return unpack(a, [unpackUInt8, unpackUInt16]) as [Protocol9P, Tag]
}


export type Fid = number;

interface IOperations9P{
    attach: (fid: Fid, aname: string) => Promise<Type>
    open: (fid: Fid, mode: OMode) => Promise<Type>,
    clunk: (fid: Fid) => Promise<void>,
    create: (fid: Fid, name:string, mode:Perm) => Promise<Type>,
    remove: (fid: Fid) => Promise<void>,
    wstat: (fid: Fid, s: IStat) => Promise<void>,
    stat: (fid: Fid) => Promise<IStat>,
    wattr: (fid: Fid, l:string, s: string) => Promise<void>,
    attr: (fid: Fid, l:string) => Promise<string>,
    read: (fid: Fid, offset:number, count:number) => Promise<Uint8Array>,
    write: (fid: Fid, buf:Uint8Array, offset:number) => Promise<number>,
    walk: (fid: Fid, newfid: Fid, name: string[]) => Promise<Type[]>,
}

export class Service9P{
    private fd: FileDescriptor;
    private ops: IOperations9P;
    private map = new Map<Fid, any>();

    constructor(fd: FileDescriptor, ops: IOperations9P){
        this.fd = fd;
        this.ops = ops;
    }

    set(fd: Fid, obj: any){
        this.map.set(fd, obj);
    }

    get(fd: Fid){
        return this.map.get(fd);
    }

    async run() {
        while (true) {
            const message = await self.proc.sys.read(this.fd, -1);
            const [type, t] = peak9p(message);
            try {
                switch (type) {
                    case Protocol9P.Tversion:
                        break;
                    case Protocol9P.Tattach: {
                        const [_, tag, fd, uname, aname] = MUTattach(message);
                        const type = await this.ops.attach(fd, aname);
                        await self.proc.sys.write(this.fd, MPRattach(tag, type));
                        break;
                    }
                    case Protocol9P.Tflush:
                        break;
                    case Protocol9P.Twalk: {
                        const [_, tag, fd, nfd, wnames] = MUTwalk(message);
                        const types = await this.ops.walk(fd, nfd, wnames);
                        await self.proc.sys.write(this.fd, MPRwalk(tag, types))
                        break;
                    }
                    case Protocol9P.Topen: {
                        const [_, tag, fd, mode] = MUTopen(message);
                        const type = await this.ops.open(fd, mode);
                        await self.proc.sys.write(this.fd, MPRopen(tag, type))
                        break;
                    }
                    case Protocol9P.Tcreate: {
                        const [_, tag, fd, name, mode] = MUTcreate(message);
                        const type = await this.ops.create(fd, name, mode);
                        await self.proc.sys.write(this.fd, MPRcreate(tag, type))
                        break;
                    }
                    case Protocol9P.Tread: {
                        const [_, tag, fd, offset, count] = MUTread(message);
                        const buf = await this.ops.read(fd, offset, count);
                        await self.proc.sys.write(this.fd, MPRread(tag, buf))
                        break;
                    }
                    case Protocol9P.Twrite: {
                        const [_, tag, fd, offset, buf] = MUTwrite(message);
                        const count = await this.ops.write(fd, buf, offset);
                        await self.proc.sys.write(this.fd, MPRwrite(tag, count))
                        break;
                    }
                    case Protocol9P.Tclunk:
                        break;
                    case Protocol9P.Tremove:
                        break;
                    case Protocol9P.Tstat: {
                        const [_, tag, fd] = MUTstat(message);
                        const stat = await this.ops.stat(fd);
                        await self.proc.sys.write(this.fd, MPRstat(tag, stat))
                        break;
                    }
                }
            }catch (e) {
                await self.proc.sys.write(this.fd, MPRerror(t, e as string))
            }
        }
    }
}
