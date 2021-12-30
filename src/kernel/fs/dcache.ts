
import {IPath, ISuperBlock} from "./vfs";
import {Kernel} from "../kernel";
import {IINode} from "./inode";

export interface IDEntryOperations {
    revalidate?: (dentry: IDEntry) => boolean
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
    private dentries : IDEntry[] = [];

    constructor(kernel: Kernel) {
        this.kernel = kernel;
    }

    allocAnon(sb: ISuperBlock|null, name: string): IDEntry{
        let dentry:IDEntry = {
            mounted: false,
            name: name,
            inode: null,
            superblock: sb,
            operations: {},
            subentry: []
        }
        this.dentries.push(dentry);
        return dentry;
    }

    alloc(parent: IDEntry|null, name: string): IDEntry{
        if(parent){
            let dentry = this.allocAnon(parent.superblock!, name);

            dentry.parent = parent;
            parent.subentry.push(dentry);
            return dentry;
        }else {
            return this.allocAnon(null, name);
        }
    }

    invalidate(dentry: IDEntry){
        let array = dentry.parent?.subentry!
        const index = array.indexOf(dentry);
        if (index > -1) {
            array.splice(index, 1);
        }
    }

    lookup(parent: IDEntry, name: string){
        return parent.subentry.find(x => x.name == name);
    }
}
