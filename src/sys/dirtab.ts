import {IChannel, IOperations} from "./vfs/channel";
import {IStat, PError, Status, Type} from "../public/api";
import {packA, packStat} from "../shared/struct";
import {System} from "./system";

export interface IDirtab{
    muid?: string;
    uid?: string;
    name?: string,
    id: number,
    type: Type,
    l: number,
    mode: number,
    atime?: number,
    mtime?: number,
    read?: IOperations["read"],
    write?: IOperations["write"]
    remove?: IOperations["remove"]
    dirtab?: IDirtab[] | (() => IDirtab[])
}

export function mkdirtab(dirtab: IDirtab, system: System): IDirtab{
    dirtab.atime = dirtab.atime || system.boottime;
    dirtab.mtime = dirtab.mtime || system.boottime;
    dirtab.mode = dirtab.mode || 0o644;
    dirtab.muid = dirtab.muid || system.sysUser;
    dirtab.uid = dirtab.uid || system.sysUser;
    return dirtab;
}

export function mkdirtabA(dirtab: IDirtab[] | (() => IDirtab[]), system: System): IDirtab{
    let d;
    if({}.toString.call(dirtab) === '[object Function]'){
        d = dirtab;
    }else{
        d = (dirtab as IDirtab[]).map(x => mkdirtab(x, system));
    }

    return mkdirtab({
        dirtab: d,
        id: 0,
        l: 0,
        mode: 0,
        name: "",
        type: Type.DIR
    }, system);
}
const te = new TextEncoder()
export const read = async (c: IChannel, count: number, offset: number): Promise<Uint8Array> => {
    const dirtab = (c.map as IDirtab);
    if(c.type & Type.DIR){
        if (dirtab.dirtab){
            let d: IDirtab[];
            if({}.toString.call(dirtab.dirtab) === '[object Function]'){
                d = (dirtab.dirtab as any)();
            }else{
                d = dirtab.dirtab as IDirtab[]
            }

            if({}.toString.call(d) === '[object Function]'){
                d = (d as any)() as IDirtab[];
            }
            return packA(d.map(x => dirtab2stat(x, c)), packStat);
        }else{
            return te.encode("");
        }
    }else{
        const read = dirtab.read;
        if(read){
            return await read(c, count, offset)
        }
        throw new PError(Status.EPERM);
    }
}

function dirtab2stat(dirtab: IDirtab, c: IChannel): IStat {
    return {
        atime: dirtab.atime || 0,
        length: dirtab.l,
        mode: dirtab.mode,
        mtime: dirtab.atime || 0,
        name: dirtab.name || "",
        srv: c.srv,
        subsrv: c.subsrv,
        type: dirtab.type,
        gid: dirtab.muid || dirtab.uid || "",
        muid: dirtab.muid || dirtab.uid || "",
        uid: dirtab.uid || ""

    }
}

export const getstat = async (c: IChannel): Promise<IStat> => {
    const dirtab: IDirtab = c.map;
    return dirtab2stat(dirtab, c);
}

export const walk = async (dir: IChannel, c: IChannel, name: string): Promise<IChannel> => {
    if(dir.map.dirtab){
        let dirtab = dir.map.dirtab;
        if({}.toString.call(dirtab) === '[object Function]'){
            dirtab = dirtab();
        }

        for (const tab of dirtab as IDirtab[]) {
            if(tab.name == name){
                c.map = tab;
                c.type = tab.type;
                c.name = name;
                c.parent = dir;
                if(tab.type == Type.FILE){
                    c.operations = {
                        read: read,
                        write: tab.write,
                        getstat: getstat
                    }
                }else{
                    c.operations = {
                        walk: walk,
                        read: read,
                        getstat: getstat
                    }
                }
                return c;
            }
        }
        throw new PError(Status.ENOENT);
    }
    throw new PError(Status.EPERM);
}
