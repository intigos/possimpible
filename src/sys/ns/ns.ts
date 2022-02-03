import {System} from "../system";
import {IMountNS} from "../vfs/mount";
import {PidNS} from "../proc/pid";
import {ForkMode2} from "../../public/api";

export interface INSProxy {
    parent: INSProxy|null,
    mnt: IMountNS,
    pid: PidNS,
    children: INSProxy[]
}

export class NamespaceManager{
    private system: System;

    constructor(system: System) {
        this.system = system;
    }

    create(ns: INSProxy|null, flags: ForkMode2): INSProxy {
        let mnt;
        let pid;

        if(ns) {
            if (flags & ForkMode2.NEW_NAMESPACE) {
                if (flags & ForkMode2.CLONE_MNT) {
                    mnt = this.system.vfs.mounts.createNS(ns ? ns.mnt : null, true);
                } else {
                    mnt = this.system.vfs.mounts.createNS(ns ? ns.mnt : null, false);
                }
                if (flags & ForkMode2.CLONE_PID) {
                    pid = this.system.proc.pids.createNS(ns ? ns.pid : null);
                }else{
                    pid = ns.pid;
                }
            } else {
                pid = ns.pid;
                mnt = ns.mnt;
            }
        }else{
            mnt = this.system.vfs.mounts.createNS(null, false);
            pid = this.system.proc.pids.createNS(null);
        }

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
