import {IChannel, IOperations} from "./vfs/channel";
import {IStat, OMode, Perm, PError, Status, Type} from "../public/api";
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

    create?: IOperations["create"],
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

export function clonedirtab(dirtab: IDirtab){
    return {
        muid: dirtab.muid,
        uid: dirtab.uid,
        name: dirtab.name,
        id: dirtab.id,
        type: dirtab.type,
        l: dirtab.l,
        mode: dirtab.mode,
        attach: dirtab.atime,
        mtime: dirtab.mtime
    };
}

export function mkdirtabA(dirtab: IDirtab[] | (() => IDirtab[]), system: System): IDirtab{
    if(!(dirtab instanceof Function)){
        for (const x of dirtab){
            mkdirtab(x, system);
        }
    }

    return mkdirtab({
        dirtab: dirtab,
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
        let d: IDirtab[] = [];
        if (dirtab.dirtab){
            if({}.toString.call(dirtab.dirtab) === '[object Function]'){
                d = (dirtab.dirtab as any)();
            }else{
                d = dirtab.dirtab as IDirtab[]
            }

            if({}.toString.call(d) === '[object Function]'){
                d = (d as any)() as IDirtab[];
            }
            return packA(d.map(x => dirtab2stat(x, c)), packStat);
        }

        return packA(d.map(x => dirtab2stat(x, c)), packStat);
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

export const create = (dir: IChannel, c: IChannel, name: string, mode: OMode, perm: Perm) => {
    let dirtab: IDirtab = clonedirtab(dir.map);
    let parent: IDirtab = dir.map as IDirtab;
    if(parent.type != Type.DIR) throw new PError(Status.EPERM);
    if (perm & Perm.DIR) {
        dirtab.type = Type.DIR
        dirtab.dirtab = []
    } else {
        dirtab.type = Type.FILE
        dirtab.dirtab = undefined;
    }
    dirtab.name = name;
    c.map = dirtab;
    c.type = dirtab.type;
    c.name = name;
    c.parent = dir;
    dirtab.id = 100;
    if(!parent.dirtab){
        parent.dirtab = [dirtab]
    }else{
        if(parent.dirtab instanceof Function){
            throw new PError(Status.EPERM);
        }else{
            parent.dirtab.push(dirtab);
        }
    }
    if(dirtab.type == Type.FILE){
        c.operations = {
            read: dirtab.read,
            write: dirtab.write,
            getstat: getstat
        }
    }else{
        c.operations = {
            walk: walk,
            read: read,
            getstat: getstat,
            create: create
        }
    }
}

export const remove: IOperations["remove"] = (dir: IChannel) => {

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
                        read: tab.read,
                        write: tab.write,
                        getstat: getstat
                    }
                }else{
                    c.operations = {
                        walk: walk,
                        read: read,
                        getstat: getstat,
                        create: create
                    }
                }
                return c;
            }
        }
        throw new PError(Status.ENOENT);
    }
    throw new PError(Status.EPERM);
}
