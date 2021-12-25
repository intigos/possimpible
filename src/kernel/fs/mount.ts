import {IDEntry} from "./dcache";
import {ISuperBlock} from "./vfs";

export interface IVFSMount{
    root: IDEntry;
    superblock: ISuperBlock;
}

export interface IMount{
    parent: IMount;
    mountpoint: IDEntry;
    mount: IVFSMount;
    children: IMount[];
}

export class MountManager{
    mounts:IMount[] = [];

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
            mountpoint,
            mount: {
                root: superblock.root,
                superblock
            },
            children: [],
        }
        vfsmount.parent = parentMount ? parentMount : vfsmount;
        this.mounts.push(vfsmount);
        if(parent){
            parentMount!.children.push(vfsmount);
        }
        return vfsmount.mount;
    }

    lookup(parent: IVFSMount, dentry: IDEntry): IVFSMount|undefined{
        for (const mount of this.mounts) {
            if(mount.parent.mount == parent && mount.mountpoint == dentry){
                return mount.mount;
            }
        }
    }

    // delete(parent: IVFSMount, dentry: IDEntry){
    //     const mnt = this._lookup(parent, dentry);
    //     if(mnt){
    //         mnt.parent.children = mnt.parent.children.filter(x => x == mnt);
    //         this.mounts.filter(x => x == mnt);
    //         return;
    //     }
    //
    //     throw "TODO";
    // }
}



