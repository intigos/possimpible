import {IDirectoryEntry} from "./operations";
import {IMount, IMountNS} from "./mount";
import {Channel} from "diagnostics_channel";
import {System} from "../system";
import {CreateMode, IStat, OpenMode, Type} from "../../public/api";


export interface IChannel {
    srv: string;
    subsrv: number;
    parent: IChannel | null;
    name: string;
    map: any;
    type: Type,
    operations: Partial<IOperations>;
    children: IChannel[];
    mounted: 0,
}

export interface IOperations {
    attach: (options:any, system: System) => Promise<IChannel>;
    dettach: (c: IChannel) => void;
    open: (c: IChannel, mode: OpenMode) => Promise<IChannel>;
    close: (c: IChannel) => void;
    create: (dir: IChannel, c:IChannel, name: string, mode: CreateMode) => void;
    remove: (c: IChannel) => void;
    setstat: (c: IChannel, stat: IStat) => void;
    getstat: (c: IChannel) => Promise<IStat>;
    setattr: (c: IChannel, name: string, attr: string) => void;
    getattr: (c: IChannel, name: string) => Promise<string>
    read: (c: IChannel, count: number, offset: number) => Promise<Uint8Array>;
    write: (c: IChannel, buf: Uint8Array, offset: number) => void;
    walk: (dir: IChannel, c: IChannel, name: string) => void;
}

export class ChannelManager{
    private system: System;

    constructor(system: System) {
        this.system = system;
    }

    mkchannel(): IChannel{
        return {
            srv: "",
            subsrv: 0,
            parent: null,
            name: "",
            map: null,
            type: Type.FILE,
            operations: {},
            children: [],
            mounted: 0,
        }
    }

    clone(c: IChannel){
        const nc = this.mkchannel();
        nc.srv = c.srv
        nc.subsrv = c.subsrv
        nc.parent = c.parent
        nc.name = c.name
        nc.map = c.map
        nc.type = c.type
        nc.mounted = nc.mounted;
        nc.operations = c.operations
        nc.children = []
        nc.mounted = c.mounted
        return nc;
    }
}

export function channel_get_cache(parent: IChannel, name: string): IChannel|null{
    return parent.children.find(x => x.name == name ) || null;
}

export function channel_set_cache(parent: IChannel, c: IChannel){
    parent.children.push(c);
}

export function* channelmounts(c: IChannel, ns: IMountNS): Generator<IMount>{
    for (const mount of ns.mounts) {
        if(mount.mount.mountpoint == c){
            yield mount.mount;
        }
    }
}
