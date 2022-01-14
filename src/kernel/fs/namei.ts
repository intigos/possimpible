import {IPath} from "./vfs";
import {IProtoTask} from "../proc/process";
import {Kernel} from "../kernel";
import {PError, Status} from "../../public/status";
import {IINode} from "./inode";
import {IVFSMount} from "./mount";
import {IDEntry} from "./dcache";

export interface nameidata{
    lastLen?: number;
    root: IPath;
    inode?: IINode;
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
    private kernel: Kernel;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    pathInit(name: string, flags: any, task: IProtoTask): nameidata{
        const nd: nameidata = {
            last: "",
            lastType: Last.ROOT,
            flags: flags | Lookup.JUMPED,
            depth: 0,
            root: {
                entry: task.root.entry,
                mount: task.root.mount
            },
            path: {
                entry: task.pwd.entry,
                mount: task.pwd.mount
            }
        }

        if(flags & Lookup.ROOT){
            let inode = nd.root.entry.inode;
            if(name.length){
                if(!inode?.operations.lookup){
                    throw new PError(Status.ENOTDIR);
                }

                nd.path.entry = task.root.entry;
                nd.path.mount = task.root.mount;
            }
        }

        if(name[0] == "/"){
            nd.path.entry = task.root.entry;
            nd.path.mount = task.root.mount;
        }else{
            nd.path.entry = task.pwd.entry;
            nd.path.mount = task.pwd.mount;
        }
        nd.inode = nd.path.entry.inode!;
        
        return nd;
    }

    lookupLast(nd: nameidata){
        if (nd.lastType == Last.NORM && nd.last[nd.lastLen!])
            nd.flags |= Lookup.FOLLOW | Lookup.DIRECTORY;

        nd.flags &= ~Lookup.PARENT;
        this.walk_component(nd, nd.last, nd.lastType, nd.flags);
    }

    pathLookup(name: string, flags: any, task: IProtoTask){
        let nd = this.pathInit(name, flags, task);

        this.linkPathLookup(name, nd);
        if(!(flags & Lookup.PARENT)){
            this.lookupLast(nd);
        }
        return nd;
    }

    linkPathLookup(name: string, nd: nameidata){
        let pos = 0;
        let lookup_flags = nd.flags;

        while(name[pos] == "/") pos++;
        if(pos == name.length){
            return;
        }

        let s = pos;
        while(true){
            let type: number;
            let this_name: string;

            nd.flags |= Lookup.CONTINUE;

            // TODO: check permissions

            let start: number=pos;
            do{
                pos++;
            } while( name[pos] != "/" && pos < name.length)
            this_name = name.substring(start, pos)

            type = Last.NORM;
            if(this_name[0] == ".") switch (this_name.length) {
                case 2:
                    if (this_name[1] == "."){
                        type = Last.DOTDOT;
                        nd.flags |= Lookup.JUMPED;
                    }
                    break;
                case 1:
                    type = Last.DOT;
            }
            if (type == Last.NORM){
                let parent = nd.path.entry
                nd.flags &= ~Lookup.JUMPED;
            }

            if (pos == name.length){
                nd.flags &= lookup_flags | ~Lookup.CONTINUE;
                nd.last = this_name;
                nd.lastLen = pos;
                nd.lastType = type;
                return;
            }
            while(name[pos] == "/" && pos < name.length) pos++;
            if(pos == name.length){
                nd.flags &= lookup_flags | ~Lookup.CONTINUE;
                nd.last = this_name;
                nd.lastLen = pos;
                nd.lastType = type;
                return;
            }

            this.walk_component(nd, this_name, type, Lookup.FOLLOW  );

            // TODO: check symlink

            if(!nd.inode!.operations.lookup){
                throw new PError(Status.ENOTDIR);
            }
        }
    }



    lookup_create(nd: nameidata, is_dir: boolean){
        if(nd.lastType != Last.NORM){
            throw new PError(Status.EEXIST);
        }

        nd.flags &= ~Lookup.PARENT;
        nd.flags |= Lookup.CREATE;
        // intent O_EXCL;

        let dentry = this.kernel.vfs.dcache.alloc(nd.path.entry, nd.last);
        if(dentry.inode){
            throw new PError(Status.EEXIST);
        }

        if(!is_dir && nd.last[nd.lastLen!]){
            throw new PError(Status.EEXIST);
        }

        return dentry;
    }

    follow_up(path: IPath){
        let parent: IVFSMount | null;
        let mountpoint: IDEntry;

        parent = path.mount!.parent;
        if (parent){
            return 0;
        }
        let parentpath = this.kernel.vfs.mounts.lookupMountpoint(path.mount!);
        path.entry = parentpath?.entry!;
        path.mount = parentpath?.mount!;
        return 1;
    }

    follow_dotdot(nd: nameidata){
        while(1){
            let od = nd.path.entry;

            if(nd.path.entry == nd.root.entry &&
                nd.path.mount == nd.root.mount){
                break;
            }
            if(nd.path.entry != nd.path.mount?.root){
                nd.path.entry = nd.path.entry.parent!;
                break;
            }
            if(!this.follow_up(nd.path)){
                break;
            }
        }
        this.followMount(nd);
        nd.inode = nd.path.entry.inode!;
    }

    handle_dots(nd: nameidata, type: Last){
        if(type == Last.DOTDOT){
            this.follow_dotdot(nd);
        }
        return;
    }

    walk_component(nd: nameidata, name: string, type: number, flags: number){
        if(type != Last.NORM){
            return this.handle_dots(nd, type);
        }
        let entry = this.do_lookup(nd, name);
        if(!entry.inode){
            throw new PError(Status.ENOENT);
        }
    }

    do_lookup(nd: nameidata, component: string){
        let child = this.kernel.vfs.dcache.alloc(nd.path.entry, component);
        let other = nd.path.entry?.inode!.operations.lookup?.(nd.path.entry?.inode!, child);

        if(other){
            nd.path.entry = other;
            this.followMount(nd);
            return other
        }else{
            throw new PError(Status.ENOENT)
        }
    }

    followMount(nd: nameidata){
        if(nd.path.entry.mounted){
            const l = this.kernel.vfs.mounts.lookup(nd.path);
            if(l){
                nd.path.entry = l.entry;
                nd.path.mount = l.mount;
            }
        }
    }
}






