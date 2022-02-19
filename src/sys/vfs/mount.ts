import {IChannel} from "./channel";
import {IPath} from "./path";
import {System} from "../system";
import {MType} from "../../public/api";

export interface IMount {
    root: IPath;
    parent: IMount|null;
    bind: boolean;
    mountlocation?: string;
    flags: MType;
    mountpoint: IChannel;
}

export interface IMountEntry{
    ns: number;
    parent: IMountEntry|null;
    mount: IMount;
    children: IMountEntry[];
}

export interface IMountNS{
    parent:IMountNS|null;
    mounts:IMountEntry[]
    children:IMountNS[]
}

export class MountManager{
    namespaces:IMountNS[] = [];
    #system: System;

    constructor(kernel: System) {
        this.#system = kernel
    }

    createNS(parent: IMountNS|null, clone:boolean): IMountNS{
        let m:IMountNS = {
            parent: parent,
            mounts: [],
            children: []
        }
        this.namespaces.push(m);
        if(parent){
            if(clone){
                for (const mount of parent.mounts) {
                    mount.ns++;
                    m.mounts.push(mount);
                }

                parent.children.push(m);
            }
        }
        return m;
    }

    async deleteNS(ns: IMountNS) {
        for (const mount of ns.mounts) {
            if (--mount.ns == 0) {
                await this.#system.vfs.unmount(mount.mount, ns, mount.mount.root.channel);
            }
        }
        if (ns.parent) {
            const index = ns.parent.children.indexOf(ns, 0);
            if (index > -1) {
                ns.parent.mounts.splice(index, 1);
            }
        }
        const index = this.namespaces.indexOf(ns, 0);
        if (index > -1) {
            this.namespaces.splice(index, 1);
        }
    }

    create(mountpoint: IChannel, root: IPath, parent: IMount|null, bind: boolean, flags:MType, ns:IMountNS): IMount{
        let parentMount: IMountEntry|null = ns.mounts.find(x => x.mount == parent) || null;

        const vfsmount:IMountEntry = {
            ns: 1,
            parent: parentMount,
            mount: {
                parent: parent,
                root: root,
                bind,
                flags,
                mountpoint,
            },
            children: [],
        }
        switch (flags) {
            case MType.AFTER:
                ns.mounts.push(vfsmount);
                break;
            case MType.REPL:
            case MType.BEFORE:
            default:
                ns.mounts.unshift(vfsmount);
                break;

        }

        if(parent){
            parentMount!.children.push(vfsmount);
        }

        mountpoint.mounted++;
        return vfsmount.mount;
    }

    delete(mountpoint: IChannel, root: IChannel, ns:IMountNS){
        for (let i of ns.mounts){
            if(i.mount.root.channel == root && i.mount.mountpoint == mountpoint){
                const a = i.parent?.children!;
                let index = a.indexOf(i);
                if (index > -1) {
                    a.splice(index, 1);
                }

                index = ns.mounts.indexOf(i)
                if (index > -1) {
                    ns.mounts.splice(index, 1);
                }

                i.mount.mountpoint.mounted--;

                return i.mount.root;
            }
        }
        throw "ERROR";
    }

    lookupMountpoint(mount: IMount): IPath|undefined{
        return {
            channel: mount.mountpoint,
            mount: mount.parent?.parent!
        }
    }

    lookup(path: IPath, ns: IMountNS): IPath|null {
        for (let pathElement of ns.mounts) {
            if(pathElement.mount.mountpoint == path.channel && pathElement.parent?.mount == path.mount){
                return {
                    channel: pathElement.mount.root.channel,
                    mount: pathElement.mount
                };
            }
        }
        return null;
    }

}



