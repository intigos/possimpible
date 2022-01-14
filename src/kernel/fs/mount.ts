import {IDEntry} from "./dcache";
import {IPath, ISuperBlock} from "./vfs";
import {IProcFSEntry, procCreate, procMkdir} from "./procfs/module";
import {Kernel} from "../kernel";
import {nameidata} from "./namei";

export interface IVFSMount{
    root: IDEntry;
    superblock: ISuperBlock;
    parent: IVFSMount|null;
    mountpoint: IDEntry;
}

export interface IMount{
    ns: number;
    parent?: IMount;
    mountpoint: IDEntry;
    mount: IVFSMount;
    children: IMount[];
}

export interface IMountNS{
    parent:IMountNS|null;
    mounts:IMount[]
    children:IMountNS[]
}

export class MountManager{
    mounts:IMount[] = [];
    namespaces:IMountNS[] = [];
    private procdir: IProcFSEntry;

    constructor(kernel: Kernel) {
        this.procdir = procCreate("mounts", null, {
            read:(file, count) => {
                return new Promise<string>((resolve, reject) => {
                    resolve(this.mounts.map(x => {
                        return `${x.mount.superblock.fileSystemType.name} ${kernel.vfs.path({entry:x.mount.root, mount:x.mount}, kernel.current!)}`
                    }).reduce((x,y) => x + "\n" + y) + "\n");
                });
            },
            write:(file, string) => {}
        });
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

    deleteNS(ns: IMountNS){

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
        mountpoint.mounted++;
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

                i.mountpoint.mounted--;
                i.mountpoint.superblock = null;

                return i.mount.superblock
            }
        }
        throw "ERROR";
    }

    lookup(path: IPath): IPath|null {
        for (let pathElement of this.mounts) {
            if(pathElement.mountpoint == path.entry && pathElement.parent?.mount == path.mount){
                return {
                    entry: pathElement.mount.root,
                    mount: pathElement.mount
                };
            }
        }
        return null;
    }

}



