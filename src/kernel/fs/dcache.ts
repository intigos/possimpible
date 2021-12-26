
import {IINode, IPath, ISuperBlock} from "./vfs";
import {Kernel} from "../kernel";

export interface IDEntryOperations {

}

export interface IDEntry {
    mounted: boolean;
    parent?: IDEntry;
    name: string;
    inode: IINode | null;
    superblock: ISuperBlock|null,
    operations: IDEntryOperations|null;
    subentry: IDEntry[]
}

export class DirectoryCache{
    private kernel: Kernel;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    allocAnon(sb: ISuperBlock, name: string): IDEntry{
        return {
            mounted: false,
            name: name,
            inode: null,
            superblock: sb,
            operations: {},
            subentry: []
        }
    }

    alloc(parent: IDEntry|null, name: string): IDEntry{
        if(parent){
            let dentry = this.allocAnon(parent.superblock!, name);

            dentry.parent = parent;
            parent.subentry.push(dentry);
            return dentry;
        }else{
            return {
                mounted: false,
                name: name,
                inode: null,
                superblock: null,
                operations: null,
                subentry: []
            }
        }
    }

    lookup(parent: IDEntry, name: string){
        return parent.subentry.find(x => x.name == name);
    }

    path(path: IPath){
        let buf = "";
        let p: IPath|undefined = path;
        while(p){
            let entry:any = p.entry;
            let mount = p.mount;
            while(entry.parent != null){
                buf += "/" + entry.name;
                entry = entry.parent;
            }
            p = this.kernel.vfs.mounts.lookupMountpoint(mount!);
        }
        return buf.length ? buf : "/";
    }
}
