
import {IINode, ISuperBlock} from "./vfs";

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


export function d_alloc_anon(sb: ISuperBlock, name: string): IDEntry{
    return {
        mounted: false,
        name: name,
        inode: null,
        superblock: sb,
        operations: {},
        subentry: []
    }
}

export function d_alloc(parent: IDEntry|null, name: string): IDEntry{
    if(parent){
        let dentry = d_alloc_anon(parent.superblock!, name);

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

export function d_lookup(parent: IDEntry, name: string){
    return parent.subentry.find(x => x.name == name);
}

