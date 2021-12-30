import {Kernel} from "../../kernel";
import {IKernelModule} from "../../sys/modules";
import {
    IFile,
    IFileOperations,
    IFileSystemType, IPollTable,
    ISuperBlock, ISuperBlockOperations, LLSeekWhence, LockOperation
} from "../vfs";
import {IDevice} from "../../sys/devices";
import {IDEntry, IDEntryOperations} from "../dcache";
import {IDirectoryEntry} from "../../../public/api";
import {IINode, IINodeOperations, inode_new} from "../inode";
import {IVFSMount} from "../mount";

export interface IProcFSOperations{
    read: (file: IFile, count) => Promise<string>;
    write: (file: IFile, string) => void;
}

export interface IProcFSEntry{
    valid: boolean;
    name: string;
    parent: IProcFSEntry|null;
    operations?: IProcFSOperations;
    children: IProcFSEntry[];
}

const proctree: IProcFSEntry = {
    valid: true,
    name: "",
    parent: null,
    operations: undefined,
    children: []
}

export function procCreate(name:string, parent:IProcFSEntry|null, operations:IProcFSOperations): IProcFSEntry{
    if(parent == null){
        parent = proctree;
    }
    const entry = {
        name,
        valid: true,
        parent: parent,
        operations,
        children: []
    };
    parent.children.push(entry);
    return entry;
}

export function procMkdir(name:string, parent:IProcFSEntry|null): IProcFSEntry{
    if(parent == null){
        parent = proctree;
    }
    const entry = {
        name,
        parent: parent,
        valid: true,
        operations: undefined,
        children: []
    };
    parent.children.push(entry);
    return entry;
}

export function procRemove(entry:IProcFSEntry){
    const index = entry.parent!.children.indexOf(entry);
    if (index > -1) {
        entry.parent!.children.splice(index, 1);
        entry.valid = false;
    }
}

const inodeOperators: IINodeOperations = {
    getattr: async (vfsmount: IVFSMount, dentry: IDEntry): Promise<string> => {
        return "";
    },
    lookup: (node,entry) => {
        const x = node.map.children.find(x => entry.name == x.name);
        entry.inode = inode_new(node.superblock);
        entry.inode.map = x;

        return null;
    }
}

const fileOperations: IFileOperations = {
    flush(file: IFile): void {
    },

    fsync(file: IFile, dentry: IDEntry, datasync: boolean): void {
    },

    ioctl(file: IFile, cmd: number, arg: number): Promise<number> {
        return Promise.resolve(0);
    },

    llseek(file: IFile, offset: number, origin: LLSeekWhence): Promise<number> {
        return Promise.resolve(0);
    },

    lock(file: IFile, operation: LockOperation): void {
    },

    poll(file: IFile, pollfd: IPollTable): Promise<void> {
        return Promise.resolve(undefined);
    },

    readdir: async (dirent): Promise<IDirectoryEntry> =>{
        return {name: ""};
    },

    release(inode: IINode, file: IFile): void {
    },

    open: async (node, entry: IDEntry): Promise<IFile> => {
        return {
            position:0,
            size:0,
            dentry: entry,
            operations: fileOperations
        }
    },
    read: async (file, count) => {
        const entry = file.dentry.inode!.map as IProcFSEntry;
        return entry.operations!.read(file, count);
    },
    write: async (file, buf) => {
        const entry = file.dentry.inode!.map as IProcFSEntry;
        return entry.operations!.write(file, buf);
    },
    iterate: (file): Promise<IDirectoryEntry[]> => {
        return new Promise<IDirectoryEntry[]>(resolve => {

            if(!file.dentry.inode!.map.operations){
                resolve(Array.from(file.dentry.inode!.map.children.map(x => {
                    return {name: x.name};
                })));
            } else{
                resolve([] as IDirectoryEntry[]);
            }
        })
    }
}

const dentryOperations: IDEntryOperations = {
    revalidate(dentry) : boolean{
        return dentry.inode?.map.valid;
    }
}

const superblockOperations: ISuperBlockOperations ={
    alloc_inode(sb: ISuperBlock): IINode {
        return {
            mode: true,
            user: true,
            map: null,
            isLink: false,
            superblock: sb,
            operations: inodeOperators,
            fileOperations: fileOperations
        };
    },
    destroy_inode(inode: IINode): void {
    },
    dirty_inode(inode: IINode): void {
    },
    put_inode(inode: IINode): void {
    },
    put_super(sb: ISuperBlock): void {
    },
    sync_fs(sb: ISuperBlock): void {
    },
    write_inode(inode: IINode): void {
    },
    write_super(sb: ISuperBlock): void {
    }
}

async function mount(device: string): Promise<ISuperBlock>{
    let entry = KERNEL.vfs.dcache.alloc(null, "");
    const sb = {
        device: "dev",
        fileSystemType: fs,
        superblockOperations: superblockOperations,
        root: entry
    }
    entry.inode = inode_new(sb);
    entry.inode.map = proctree


    return sb;
}

const fs: IFileSystemType = {
    name:"proc",
    mount: mount,
    unmount: sb => {}
}
let KERNEL: Kernel;

function init(kernel: Kernel){

    kernel.vfs.registerFS(fs);
    KERNEL = kernel;
}

function cleanup(){

}

const m: IKernelModule = {
    name: "procfs",
    init: init,
    cleanup: cleanup
}

export default m;
