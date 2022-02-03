import {IMount, IMountNS, MountManager} from "./mount";
import {channelmounts, IChannel, mkchannel} from "./channel";
import {Last, Lookup, NameI} from "./namei";
import {IPath} from "./path";
import {System} from "../system";
import {OpenMode, PError, Status} from "../../public/api";
import {IFile, IProtoTask} from "../proc/task";

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

    async attach(id: string, options: string): Promise<IChannel> {
        if (this.system.dev.getDevice(id).operations.attach){
            return await this.system.dev.getDevice(id).operations.attach!(options, this.system)
        }
        throw new PError(Status.EPERM);
    }

    async cmount(newc: IChannel, oldc: IChannel, flags: number, parent: IMount|null, ns: IMountNS): Promise<IMount>{
        if(!oldc.parent && parent){
            // might be a root of a mounted point
            let p = this.system.vfs.mounts.lookupMountpoint(parent);
            oldc = p?.channel!
            parent = p?.mount!
        }

        let vfsmnt = this.mounts.create(oldc, newc, parent, flags, ns);

        return vfsmnt;
    }

    async unmount(mount:IMount, ns: IMountNS, oldc?: IChannel): Promise<void>{
        if(oldc){
            this.mounts.delete(oldc, mount.root, ns)
        }else{
            for (const m of channelmounts(mount.root, ns)){
                this.mounts.delete(mount.mountpoint, mount.root, ns)
            }
        }
        return;
    }

    async lookup(path: string, task: IProtoTask, root?: IChannel): Promise<IPath> {
        const nd = await this.namei.pathLookup(path, 0, task, root);
        return nd.path;
    }

    async open(path: IPath, mode: OpenMode): Promise<IFile>{
        if(path.channel){
            if(path.channel.operations.open) {
                path.channel = await path.channel.operations.open(path.channel, mode)
            }

            return {
                position: 0,
                channel: path.channel
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
                p = this.system.vfs.mounts.lookupMountpoint(mount!);
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

    async create(path: IPath, name:string, mode: number){
        if (path.channel) {
            if(path.channel.operations.create){
                const c = mkchannel();
                path.channel.operations.create(path.channel, c, name, mode);
                return {
                    position: 0,
                    channel: c
                };
            }else{
                throw new PError(Status.EPERM);
            }
        } else {
            throw new PError(Status.ENOENT);
        }
    }

    async close(f: IFile) {
        if(f.channel.operations.close){
            await f.channel.operations.close(f.channel);
        }
    }


}

