import {v4 as UUID } from 'uuid';
import {Kernel} from "../kernel";
import {DirectoryCache, IDEntry, IDEntryOperations} from "./dcache";
import {IVFSMount, MountManager} from "./mount";
import {IDirectoryEntry} from "../../public/api";

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
    iterate: (file: IFile) => Promise<IDirectoryEntry[]>;
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
    fileSystemType: IFileSystemType,
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
    if (path == "/") return [''];
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
    public mounts: MountManager;
    public dcache: DirectoryCache;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
        this.mounts = new MountManager(this.kernel);
        this.dcache = new DirectoryCache(this.kernel);
    }

    async mount(device: string, mount: IVFSMount|null, entry: IDEntry, filesystem:IFileSystemType): Promise<IVFSMount>{
        let sb = await filesystem.mount(device);
        let vfsmnt = this.mounts.create(mount, entry, sb);

        entry.superblock = sb;
        entry.mounted = true;
        return vfsmnt;
    }

    registerFS(fst: IFileSystemType){
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

    path(path: IPath): string{
        let buf = "";
        let p: IPath|undefined = path;
        while(p){
            let entry:any = p.entry;
            let mount = p.mount;
            while(entry.parent != null){
                buf = "/" + entry.name + buf;
                entry = entry.parent;
            }
            p = this.kernel.vfs.mounts.lookupMountpoint(mount!);
        }
        return buf.length ? buf : "/";
    }

    findRoot(path: IPath): IPath{
        let p: IPath|undefined = path;
        let entry = p.entry;
        let mount = p.mount;
        while(p){
            entry = p.entry;
            mount = p.mount;
            while(entry.parent != null){
                entry = entry.parent;
            }
            p = this.kernel.vfs.mounts.lookupMountpoint(mount!);
        }
        return {mount:mount, entry:entry};
    }

    lookup(cwd: IPath|null, path: string): IPath{
        const seg = splitInSegments(path);
        if (cwd){
            let pivot: IPath;
            let component: string;
            if(path.startsWith("/")){
                component = seg.shift()!;
                pivot = this.findRoot(cwd);
            }else{
                pivot = {entry:cwd.entry, mount:cwd.mount};
            }
            while(seg.length){
                component = seg.shift()!;
                let child = this.dcache.lookup(pivot.entry, component);

                if(!child){
                    child = this.dcache.alloc(pivot.entry, component);
                    let other = pivot.entry?.inode!.operations.lookup(pivot.entry?.inode!, child);
                    if(other){
                        // ??
                    }
                }

                if(child.mounted){
                    pivot.mount = this.mounts.lookupChild(pivot.mount!, child)!;
                    pivot.entry = pivot.mount.root;
                }else{
                    pivot.entry = child;
                }
            }
            return pivot;
        }else{
            let entry = this.dcache.alloc(null, '');
            return { mount: null, entry: entry }
        }


    }
}

