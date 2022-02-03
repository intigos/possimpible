import {System} from "../system";
import {IMountNS} from "../vfs/mount";
import {PidNS} from "../proc/pid";

export interface INSProxy {
    parent: INSProxy|null,
    mnt: IMountNS,
    pid: PidNS,
    children: INSProxy[]
}

export enum NSOp {
    CLONE_MOUNT = 0x000001,
    CLONE_PROC = 0x000002,
}

export class NamespaceManager{
    private system: System;

    constructor(system: System) {
        this.system = system;
    }

    create(options: NSOp, ns: INSProxy|null): INSProxy {
        const mnt = this.system.vfs.mounts.createNS(ns?ns.mnt:null, (options & NSOp.CLONE_MOUNT) == NSOp.CLONE_MOUNT);
        const pid = this.system.proc.pids.createNS(null)
        const result: INSProxy = {
            parent: ns,
            mnt,
            pid,
            children: []
        };
        ns?.children.push(result);
        return result;
    }

    async delete(ns: INSProxy) {
        await this.system.vfs.mounts.deleteNS(ns.mnt);
        if(ns.parent){
            const index = ns.parent.children.indexOf(ns);
            if(index > -1){
                ns.parent.children.splice(index, 1)
            }
        }
    }
}
