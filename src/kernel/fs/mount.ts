import {IDEntry} from "./dcache";
import {IPath, ISuperBlock} from "./vfs";
import {IProcFSEntry, procCreate, procMkdir} from "./procfs/module";
import {Kernel} from "../kernel";

export interface IVFSMount{
    root: IDEntry;
    superblock: ISuperBlock;
}

export interface IMount{
    parent?: IMount;
    mountpoint: IDEntry;
    mount: IVFSMount;
    children: IMount[];
}

export class MountManager{
    mounts:IMount[] = [];
    private procdir: IProcFSEntry;

    constructor(kernel: Kernel) {
        this.procdir = procCreate("mounts", null, {
            read:(file, count) => {
                return new Promise<string>((resolve, reject) => {
                    resolve(this.mounts.map(x => {
                        return `${x.mount.superblock.fileSystemType.name} ${kernel.vfs.path({entry:x.mount.root, mount:x.mount})}`
                    }).reduce((x,y) => x + "\n" + y) + "\n");
                });
            },
            write:(file, string) => {}
        });
    }

    create(parent: IVFSMount|null, mountpoint: IDEntry, superblock: ISuperBlock): IVFSMount{
        let parentMount: IMount|null = null;
        if(parent){
            for (const mount of this.mounts) {
                if(mount.mount == parent){
                    parentMount = mount;
                    break;
                }
            }
            if (!parentMount){ throw "TODO" }
        }
        const vfsmount:any = {
            parent: parentMount,
            mountpoint,
            mount: {
                root: superblock.root,
                superblock
            },
            children: [],
        }
        this.mounts.push(vfsmount);
        if(parent){
            parentMount!.children.push(vfsmount);
        }
        return vfsmount.mount;
    }

    lookupChild(parent: IVFSMount, dentry: IDEntry): IVFSMount|undefined{
        for (const mount of this.mounts) {
            if(mount.parent && mount.parent.mount == parent && mount.mountpoint == dentry){
                return mount.mount;
            }
        }
    }

    lookupMountpoint(mount: IVFSMount): IPath|undefined{
        for (const m of this.mounts) {
            if(m.mount == mount){
                if(m.parent){
                    return {
                        entry: m.mountpoint,
                        mount: m.parent.mount
                    };
                }
            }
        }
    }

    delete(parent: IVFSMount, dentry: IDEntry): ISuperBlock{
        for (let i of this.mounts){
            debugger;
            if(i.mount.root == dentry){
                const a = i.parent?.children!;
                let index = a.indexOf(i);
                if (index > -1) {
                    a.splice(index, 1);
                }

                index = this.mounts.indexOf(i)
                if (index > -1) {
                    this.mounts.splice(index, 1);
                }

                i.mountpoint.mounted = false;
                i.mountpoint.superblock = null;

                return i.mount.superblock
            }
        }
        throw "ERROR";
    }
}



