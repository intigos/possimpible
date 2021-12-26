import {Kernel} from "../../kernel";
import {IKernelModule} from "../../sys/modules";
import {
    IFile,
    IFileOperations,
    IFileSystemType,
    IINode,
    IINodeOperations,
    ISuperBlock
} from "../vfs";
import {IDevice} from "../../sys/devices";
import {} from "../dcache";
import {IDirectoryEntry} from "../../../public/api";

export interface IProcFSOperations{
    read: (file: IFile, count) => Promise<string>;
    write: (file: IFile, string) => void;
}

export interface IProcFSEntry{
    name: string;
    parent: IProcFSEntry|null;
    operations?: IProcFSOperations;
    children: IProcFSEntry[];
}

const proctree: IProcFSEntry = {
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
        operations: undefined,
        children: []
    };
    parent.children.push(entry);
    return entry;
}

export function procRemove(entry:IProcFSEntry){
    const index = entry.children.indexOf(entry);
    if (index > -1) {
        entry.children.splice(index, 1);
    }
}

const inodeOperators: IINodeOperations = {
    lookup: (node,entry) => {
        const x = node.map.children.find(x => entry.name == x.name);

        entry.inode = {
            mode: true,
            user: true,
            map: x,
            operations: inodeOperators,
            fileOperations: fileOperations
        };

        return null;
    }
}

const fileOperations: IFileOperations = {
    open: node => {
        return {
            position:0,
            dentry: true,
            operations: fileOperations
        }
    },
    read: async (file, count) => {
        const entry = file.dentry.inode.map as IProcFSEntry;
        return entry.operations!.read(file, count);
    },
    write: (file, buf) => {
        const entry = file.dentry.inode.map as IProcFSEntry;
        return entry.operations!.write(file, buf);
    },
    iterate: (file): Promise<IDirectoryEntry[]> => {
        return new Promise<IDirectoryEntry[]>(resolve => {
            if(!file.dentry.inode.map.operations){
                resolve(Array.from(file.dentry.inode.map.children.map(x => {
                    return {name: x.name};
                })));
            } else{
                resolve([] as IDirectoryEntry[]);
            }
        })
    }
}

async function mount(device: string): Promise<ISuperBlock>{
    let entry = KERNEL.vfs.dcache.alloc(null, "");
    entry.inode = {
        mode: true,
        user: true,
        map: proctree,
        operations: inodeOperators,
        fileOperations: fileOperations
    }
    return {
        device: "dev",
        fileSystemType: fs,
        superblockOperations: {},
        root: entry
    }
}

const fs: IFileSystemType = {
    name:"procfs",
    mount: mount
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
