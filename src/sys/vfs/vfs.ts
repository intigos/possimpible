import {IMount, IMountNS, MountManager} from "./mount";
import {channel_set_cache, channelmounts, IChannel} from "./channel";
import {Last, Lookup, NameI} from "./namei";
import {IPath} from "./path";
import {System} from "../system";
import {Perm, IStat, OMode, PError, Status} from "../../public/api";
import {IFile, IProtoTask} from "../proc/task";
import {unpackA, unpackBytearray, unpackStat} from "../../shared/struct";

const DIV = "/"

export class VirtualFileSystem{
    private system: System;
    public mounts: MountManager;
    public namei: NameI;

    constructor(kernel: System) {
        this.system = kernel;
        this.mounts = new MountManager(this.system);
        this.namei = new NameI(this.system);
    }

    async attach(id: string, options: string): Promise<IPath> {
        const dev = this.system.dev.getDevice(id);
        if(dev){
            if (dev.operations.attach){
                return { channel: await dev.operations.attach!(options, this.system), mount: null }
            }else throw new PError(Status.EPERM);
        }else throw new PError(Status.ENODEV);
    }

    async cmount(newc: IPath, oldc: IChannel, bind: boolean, flags: number, parent: IMount|null, ns: IMountNS): Promise<IMount>{
        if(!oldc.parent && parent){
            // might be a root of a mounted point
            let p = this.system.vfs.mounts.lookupMountpoint(parent);
            oldc = p?.channel!
            parent = p?.mount!
        }

        let vfsmnt = this.mounts.create(oldc, newc, parent, bind, flags, ns);

        return vfsmnt;
    }

    async unmount(mount:IMount, ns: IMountNS, oldc?: IChannel): Promise<void>{
        if(oldc){
            this.mounts.delete(oldc, mount.root.channel, ns)
        }else{
            for (const m of channelmounts(mount.root.channel, ns)){
                this.mounts.delete(mount.mountpoint, mount.root.channel, ns)
            }
        }
        return;
    }

    async lookup(path: string, task: IProtoTask, root?: IChannel): Promise<IPath> {
        const nd = await this.namei.pathLookup(path, 0, task, root);
        return nd.path;
    }

    async open(path: IPath, mode: OMode): Promise<IFile>{
        let c = path.channel
        if(path.channel){
            if(path.channel.operations.open) {
                c = await path.channel.operations.open(path.channel, mode)
            }

            return {
                position: 0,
                channel: c,
                path: path
            };
        }

        throw new PError(Status.ENOENT);
    }

    path(path: IPath, task: IProtoTask): string{
        let buf = "";
        let p: IPath|undefined = path;
        while(p){
            let entry:any = p.channel;
            let mount = p.mount;
            while(entry.parent != null && entry != task.root.channel){
                buf = "/" + entry.name + buf;
                entry = entry.parent;
            }
            if(entry != task.root.channel){
                p = this.system.vfs.mounts.lookupMountpoint(mount!)!;
                if(p?.channel.parent){
                    p.channel = p?.channel.parent;
                }
            }else{
                return buf.length ? buf : "/";
            }
        }
        return buf.length ? buf : "/";
    }

    findRoot(path: IPath): IPath{
        let p: IPath|undefined = path;
        let entry = p.channel;
        let mount = p.mount;
        while(p){
            entry = p.channel;
            mount = p.mount;
            while(entry.parent != null){
                entry = entry.parent;
            }
            p = this.system.vfs.mounts.lookupMountpoint(mount!);
        }
        return {mount:mount, channel:entry};
    }

    async create(path: IPath, name:string, mode: OMode, perm: Perm): Promise<IFile>{
        if (path.channel) {
            if(path.channel.operations.create){
                const c = this.system.channels.clone(path.channel);
                path.channel.operations.create(path.channel, c, name, mode, perm);
                channel_set_cache(path.channel, c);
                return {
                    position: 0,
                    channel: c,
                    path: path
                };
            }else throw new PError(Status.EPERM);
        } else throw new PError(Status.ENOENT);
    }

    async close(f: IFile) {
        if(f.channel.operations.close){
            await f.channel.operations.close(f.path.channel);
        }
    }


    async dirread(channel: IChannel, task: IProtoTask): Promise<IStat[]> {
        let a: IStat[] = [];
        let m = task.ns.mnt.mounts.find(x => x.mount.root.channel == channel);
        if (m) {
            for (const mount of channelmounts(m.mount.mountpoint, task.ns.mnt)) {
                if(mount.root.channel.operations.read){
                    const buf = await mount.root.channel.operations.read!(mount.root.channel, -1, 0);
                    a.push(...unpackA(unpackStat)(buf, 0)[0])
                }else{
                    throw new PError(Status.EPERM);
                }
            }
        }else{
            const buf = await channel.operations.read!(channel, -1, 0);
            a = unpackA(unpackStat)(buf, 0)[0];
        }
        a.sort((a, b): number => {
            if (a.name > b.name) {
                return -1;
            }
            if (b.name > a.name) {
                return 1;
            }
            return 0;
        });

        if (channel.operations.getstat){
            a.unshift(await channel.operations.getstat!(channel));
        }else throw new PError(Status.EPERM);

        const parent = channel.parent ? channel.parent : channel;
        if (parent.operations.getstat){
            a.unshift(await parent.operations.getstat!(parent));
        }else throw new PError(Status.EPERM);

        return a;
    }
}

