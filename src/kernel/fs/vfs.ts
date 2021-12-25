import {v4 as UUID } from 'uuid';
import {Kernel} from "../kernel";
import {d_alloc, d_lookup, IDEntry, IDEntryOperations} from "./dcache";
import {IVFSMount, MountManager} from "./mount";

export interface IFileSystemType{
    name: string;
    mount: (device: string) => Promise<ISuperBlock>;
}

export interface IPath{
    entry: IDEntry;
    mount: IVFSMount|null;
}

interface ISuperBlockOperations{

}

export interface IINodeOperations{
    lookup: (node: IINode, dentry: IDEntry) => IDEntry|null
}

export interface IFile {
    position: number;
    dentry: any;
    operations: IFileOperations;
}

export interface IFileOperations {
    open: (node: IINode) => IFile
    read: (file: IFile, count: number) => Promise<string>;
    write: (file: IFile, buf: string) => void;
}

export interface IINode {
    mode: any;
    user: any;
    map: any;
    operations: IINodeOperations;
    fileOperations: IFileOperations
}

export interface ISuperBlock{
    device: any;
    root: IDEntry;
    superblockOperations: ISuperBlockOperations;
}

interface IMount{
    root: IDEntry;
    superblock: ISuperBlock;
}

class DCache{
    root?: IDEntry;
    constructor(){}
}

const DIV = "/"

function splitInSegments(path: string): string[]{
    const seg : string[] = [];
    if (!path.length) return seg;
    let buf = "";
    for(let i=0; i< path.length; i++){
        let c = path[i];
        if (c != DIV){
            buf += c;
            if (c == "\\"){
                if(i + 1 < path.length){
                    buf += path[i];
                    i++;
                    continue;
                }
            }
        }else{
            seg.push(buf);
            buf = "";
        }
    }
    seg.push(buf);
    return seg;
}

export class VirtualFileSystem{
    filesystems: Record<string, IFileSystemType> = {};
    root: IDEntry|undefined;
    private kernel: Kernel;
    private mounts: MountManager;

    constructor(kernel: Kernel) {
        this.mounts = new MountManager();
        this.kernel = kernel;
    }

    async mount(device: string, mount: IVFSMount|null, entry: IDEntry, filesystem:IFileSystemType): Promise<IVFSMount>{
        let sb = await filesystem.mount(device);
        let vfsmnt = this.mounts.create(mount, entry, sb);

        entry.superblock = sb;
        entry.mounted = true;
        return vfsmnt;
    }

    registerFS(fst: IFileSystemType){
        this.kernel.printk("Registering FST " + fst.name);
        this.filesystems[fst.name] = fst;
    }
    getFS(name: string): IFileSystemType{
        return this.filesystems[name];
    }

    open(path: IPath): IFile{
        const file = path.entry.inode!.fileOperations.open(path.entry.inode!);
        file.dentry = path.entry;
        return file;
    }

    lookup(cwd: IDEntry|null, mount: IVFSMount|null, path: string): IPath{
        const seg = splitInSegments(path);
        let component = seg.shift()!;
        if (mount){
            let pivot: IPath = {entry:mount.root, mount};
            while(seg.length){
                component = seg.shift()!;
                let child = d_lookup(pivot.entry, component);

                if(!child){
                    child = d_alloc(pivot.entry, component);
                    let other = pivot.entry?.inode!.operations.lookup(pivot.entry?.inode!, child);
                    if(other){
                        // ??
                    }
                }

                if(child.mounted){
                    pivot.mount = this.mounts.lookup(mount, child)!;
                    pivot.entry = pivot.mount.root;
                }else{
                    pivot.entry = child;
                }
            }
            return pivot;
        }else{
            let entry = d_alloc(null, component);
            return { mount: null, entry: entry }
        }


    }
}

