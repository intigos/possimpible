import {channel_get_cache, channel_set_cache, channelmounts, IChannel, mkchannel} from "../../sys/vfs/channel";
import {System} from "../system";
import {IPath} from "./path";
import {IMount, IMountNS} from "./mount";
import {PError, Status} from "../../public/api";
import {IProtoTask} from "../proc/task";

export interface nameidata{
    ns: IMountNS;
    lastLen?: number;
    root: IPath;
    channel?: IChannel;
    last: string;
    lastType: Last;
    flags: number;
    depth: number;
    path: IPath;
}

export enum Last{
    NORM,
    ROOT,
    DOT,
    DOTDOT,
    BIND,
}

export enum Lookup{
    // If the last component is a symbolic link, interpret (follow) it
    FOLLOW = 1,
    // The last component must be a directory
    DIRECTORY = 2,
    // There are still filenames to be examined in the pathname
    CONTINUE = 4,
    // There are still filenames to be examined in the pathname
    PARENT = 16,
    // Do not consider the emulated root directory (useless in the 80 x 86 architecture)
    NOALT = 64,
    REVAL = 64,
    // Intent is to open a file
    OPEN = 0x0100,
    // Intent is to create a file (if it doesn’t exist)
    CREATE = 0x0200,
    // Intent is to check user’s permission for a file
    ACCESS = 0x0400,
    RENAME_TARGET = 0x0800,

    JUMPED = 0x1000,
    ROOT = 0x2000,
    EMPTY = 0x4000
}

export class NameI{
    private system: System;

    constructor(system: System) {
        this.system = system;
    }

    async pathInit(name: string, flags: any, task: IProtoTask, root?: IChannel): Promise<nameidata> {
        const nd: nameidata = {
            last: "",
            ns: task.ns.mnt,
            lastType: Last.ROOT,
            flags: flags | Lookup.JUMPED,
            depth: 0,
            root: {
                channel: task.root.channel,
                mount: task.root.mount
            },
            path: {
                channel: task.pwd.channel,
                mount: task.pwd.mount
            }
        }

        if (flags & Lookup.ROOT) {
            let inode = nd.root.channel;
            if (name.length) {
                if (!inode?.operations.walk) {
                    throw new PError(Status.ENOTDIR);
                }

                nd.path.channel = task.root.channel;
                nd.path.mount = task.root.mount;
            }
        }

        switch (name[0]) {
            case '/':
                nd.path.channel = task.root.channel;
                nd.path.mount = task.root.mount;
                break;
            default:
                nd.path.channel = task.pwd.channel;
                nd.path.mount = task.pwd.mount;
        }

        if(root){
            nd.path.channel = root;
            nd.path.mount = null;
        }

        nd.channel = nd.path.channel!;

        return nd;
    }

    async lookupLast(nd: nameidata) {
        if (nd.lastType == Last.NORM && nd.last[nd.lastLen!])
            nd.flags |= Lookup.FOLLOW | Lookup.DIRECTORY;

        nd.flags &= ~Lookup.PARENT;
        await this.walk_component(nd, nd.last, nd.lastType, nd.flags);
    }

    async pathLookup(name: string, flags: any, task: IProtoTask, root?: IChannel): Promise<nameidata> {
        let nd = await this.pathInit(name, flags, task, root);

        await this.linkPathLookup(name, nd);
        if (!(flags & Lookup.PARENT)) {
            await this.lookupLast(nd);
        }
        return nd;
    }

    async linkPathLookup(name: string, nd: nameidata) {
        let pos = 0;
        let lookup_flags = nd.flags;

        while (name[pos] == "/") pos++;
        if (pos == name.length) {
            return;
        }

        let s = pos;
        while (true) {
            let type: number;
            let this_name: string;

            nd.flags |= Lookup.CONTINUE;

            // TODO: check permissions

            let start: number = pos;
            do {
                pos++;
            } while (name[pos] != "/" && pos < name.length)
            this_name = name.substring(start, pos)

            type = Last.NORM;
            if (this_name[0] == ".") switch (this_name.length) {
                case 2:
                    if (this_name[1] == ".") {
                        type = Last.DOTDOT;
                        nd.flags |= Lookup.JUMPED;
                    }
                    break;
                case 1:
                    type = Last.DOT;
            }
            if (type == Last.NORM) {
                let parent = nd.path.channel
                nd.flags &= ~Lookup.JUMPED;
            }

            if (pos == name.length) {
                nd.flags &= lookup_flags | ~Lookup.CONTINUE;
                nd.last = this_name;
                nd.lastLen = pos;
                nd.lastType = type;
                return;
            }
            while (name[pos] == "/" && pos < name.length) pos++;
            if (pos == name.length) {
                nd.flags &= lookup_flags | ~Lookup.CONTINUE;
                nd.last = this_name;
                nd.lastLen = pos;
                nd.lastType = type;
                return;
            }

            await this.walk_component(nd, this_name, type, Lookup.FOLLOW);

            // TODO: check symlink

            if (!nd.channel!.operations.walk) {
                throw new PError(Status.ENOTDIR);
            }
        }
    }

    follow_up(path: IPath){
        let parent: IMount | null;

        parent = path.mount!.parent;
        if (parent){
            return 0;
        }
        let parentpath = this.system.vfs.mounts.lookupMountpoint(path.mount!);
        path.channel = parentpath?.channel!;
        path.mount = parentpath?.mount!;
        return 1;
    }

    follow_dotdot(nd: nameidata){
        while(1){
            let od = nd.path.channel;

            if(nd.path.channel == nd.root.channel &&
                nd.path.mount == nd.root.mount){
                break;
            }
            if(nd.path.channel != nd.path.mount?.root){
                nd.path.channel = nd.path.channel.parent!;
                break;
            }
            if(!this.follow_up(nd.path)){
                break;
            }
        }
        this.followMount(nd);
        nd.channel = nd.path.channel;
    }

    handle_dots(nd: nameidata, type: Last){
        if(type == Last.DOTDOT){
            this.follow_dotdot(nd);
        }
        return;
    }

    async walk_component(nd: nameidata, name: string, type: number, flags: number) {
        if (type != Last.NORM) {
            return this.handle_dots(nd, type);
        }

        await this.do_lookup(nd, name);
    }

    async do_lookup(nd: nameidata, component: string) {
        if(component[0] == "#"){
            nd.path.channel = await this.system.dev.getDevice(component.substring(1)).operations.attach!("", this.system);
            nd.path.mount = null;
            return;
        }

        let c = channel_get_cache(nd.path.channel, component);

        if(!c){
            if(!nd.path.channel.parent){
                if(nd.path.mount){
                    let m = this.system.vfs.mounts.lookupMountpoint(nd.path.mount!);
                    c = null;
                    for(const mount of channelmounts(m?.channel!, nd.ns)){
                        try{
                            let ch = channel_get_cache(mount.root, component);
                            if(!ch){
                                ch = mkchannel()
                                await mount.root!.operations.walk?.(mount.root, ch, component)
                                channel_set_cache(mount.root!, ch);
                            }
                            c = ch;
                            break;
                        }catch (e){
                            continue;
                        }
                    }
                    if(c == null){
                        throw new PError(Status.ENOENT);
                    }
                }else{
                    c = mkchannel();
                    await nd.path.channel!.operations.walk?.(nd.path.channel, c, component)
                    channel_set_cache(nd.path.channel, c);
                }
            }else{
                c = mkchannel();
                await nd.path.channel!.operations.walk?.(nd.path.channel, c, component)
                channel_set_cache(nd.path.channel, c);
            }
        }

        nd.path.channel = c!;
        this.followMount(nd);
    }

    followMount(nd: nameidata){
        if(nd.path.channel.mounted){
            const l = this.system.vfs.mounts.lookup(nd.path, nd.ns);
            if(l){
                nd.path.channel = l.channel;
                nd.path.mount = l.mount;
            }
        }
    }
}






