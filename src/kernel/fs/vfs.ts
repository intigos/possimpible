import {Kernel} from "../kernel";
import {DirectoryCache, IDEntry} from "./dcache";
import {IVFSMount, MountManager} from "./mount";
import {IDirectoryEntry} from "../../public/api";
import {IINode} from "./inode";
import {PError, Status} from "../../public/status";
import {NameI} from "./namei";
import {IProtoTask, ITask} from "../proc/process";

export interface IFileSystemType{
    name: string;
    mount: (device: string, options:string) => Promise<ISuperBlock>;
    unmount: (sb: ISuperBlock) => void;
}

export interface IPath{
    entry: IDEntry;
    mount: IVFSMount|null;
}

export interface ISuperBlockOperations{
    //  alloc_inode: this method is called by alloc_inode() to allocate memory
    //  	for struct inode and initialize it.  If this function is not
    //  	defined, a simple 'struct inode' is allocated.  Normally
    //  	alloc_inode will be used to allocate a larger structure which
    //  	contains a 'struct inode' embedded within it.
    alloc_inode: (sb: ISuperBlock) => IINode;

    //  destroy_inode: this method is called by destroy_inode() to release
    //   	resources allocated for struct inode.  It is only required if
    //   	->alloc_inode was defined and simply undoes anything done by
    // 	->alloc_inode.
    destroy_inode: (inode: IINode) => void;

    //  dirty_inode: this method is called by the VFS to mark an inode dirty.
    dirty_inode: (inode: IINode) => void;

    //  write_inode: this method is called when the VFS needs to write an
    // 	inode to disc.  The second parameter indicates whether the write
    // 	should be synchronous or not, not all filesystems check this flag.
    write_inode: (inode: IINode) => void;

    // This function releases the given inode.
    put_inode: (inode: IINode) => void;

    //  drop_inode: called when the last access to the inode is dropped,
    // 	with the inode->i_lock spinlock held.
    //
    // 	This method should be either NULL (normal UNIX filesystem
    // 	semantics) or "generic_delete_inode" (for filesystems that do not
    // 	want to cache inodes - causing "delete_inode" to always be
    // 	called regardless of the value of i_nlink)
    //
    // 	The "generic_delete_inode()" behavior is equivalent to the
    // 	old practice of using "force_delete" in the put_inode() case,
    // 	but does not have the races that the "force_delete()" approach
    // 	had.
    drop_inode?: (inode: IINode) => void;

    //  put_super: called when the VFS wishes to free the superblock
    // 	(i.e. unmount). This is called with the superblock lock held
    put_super: (sb: ISuperBlock) => void;

    // This function updates the on-disk superblock with the specified
    // superblock. The VFS uses this function to synchronize a modified
    // in-memory superblock with the disk.
    write_super: (sb: ISuperBlock) => void;

    // sync_fs: called when VFS is writing out all dirty data associated with
    //   	a superblock. The second parameter indicates whether the method
    // 	should wait until the write out has been completed. Optional.
    sync_fs: (sb: ISuperBlock) => void;
}

export enum MkNodeMode {
    BLOCK,
    CHAR,
    PIPE
}

export interface IFile {
    position: number;
    size: number;
    dentry: IDEntry;
    operations: IFileOperations;
}

export enum LLSeekWhence{
    SEEK_SET,
    SEEK_CUR,
    SEEK_END
}

export enum LockOperation{
    LOCK_SHARED,
    LOCK_EXCLUSIVE,
    LOCK_UNLOCK,
    LOCK_NONBLOCK,
}

export interface IPollTable {
}

export interface IFileOperations {
    open: (node: IINode, entry: IDEntry) => Promise<IFile>

    // The _llseek() system call repositions the offset of the open file
    // description associated with the file descriptor fd to the value
    //
    //        (offset_high << 32) | offset_low
    //
    // This new offset is a byte offset relative to the beginning of the
    // file, the current file offset, or the end of the file, depending
    // on whether whence is SEEK_SET, SEEK_CUR, or SEEK_END,
    // respectively.
    //
    // The new file offset is returned in the argument result.  The
    // type loff_t is a 64-bit signed type.
    llseek: (file :IFile, offset:number, origin:LLSeekWhence) => Promise<number>;

    // The readdir() function returns a pointer to a dirent structure
    // representing the next directory entry in the directory stream
    // pointed to by dirp.  It returns NULL on reaching the end of the
    // directory stream or if an error occurred.
    readdir: (dirent: IDirectoryEntry) => Promise<IDirectoryEntry>;

    // poll() performs a similar task to select(2): it waits for one of
    // a set of file descriptors to become ready to perform I/O.  The
    // Linux-specific epoll(7) API performs a similar task, but offers
    // features beyond those found in poll().
    poll: (file: IFile, pollfd: IPollTable) => Promise<void>;

    // The ioctl() system call manipulates the underlying device
    // parameters of special files.  In particular, many operating
    // characteristics of character special files (e.g., terminals) may
    // be controlled with ioctl() requests.  The argument fd must be an
    // open file descriptor.
    ioctl: (file: IFile, cmd: number, arg: number) => Promise<number>;

    // mmap -> does not make sense in this context;

    // For output streams, fflush() forces a write of all user-space
    // buffered data for the given output or update stream via the
    // stream's underlying write function.
    //
    // For input streams associated with seekable files (e.g., disk
    // files, but not pipes or terminals), fflush() discards any
    // buffered data that has been fetched from the underlying file, but
    // has not been consumed by the application.
    flush: (file: IFile) => void;

    //
    // The role of the release method is the reverse of open. Sometimes
    // you’ll find that the method implementation is called device _close
    // instead of device _release. Either way, the device method should
    // perform the following tasks:
    release: (inode: IINode, file: IFile) => void;

    // fsync() transfers ("flushes") all modified in-core data of (i.e.,
    // modified buffer cache pages for) the file referred to by the file
    // descriptor fd to the disk device (or other permanent storage
    // device) so that all changed information can be retrieved even if
    // the system crashes or is rebooted.  This includes writing through
    // or flushing a disk cache if present.  The call blocks until the
    // device reports that the transfer has completed.
    fsync: (file: IFile, dentry: IDEntry, datasync: boolean) => void;
    // Apply or remove an advisory lock on the open file specified by fd.
    // The argument operation is one of the following:
    lock: (file: IFile, operation: LockOperation) => void;

    // sendfile() copies data between one file descriptor and another.
    // Because this copying is done within the kernel, sendfile() is
    // more efficient than the combination of read(2) and write(2),
    // which would require transferring data to and from user space.
    sendfile?: (outfile: IFile, infile: IFile, offset: number, count: number) => void;

    read: (file: IFile, count?: number) => Promise<string>;
    write?: (file: IFile, buf: string) => Promise<void>;
    iterate: (file: IFile) => Promise<IDirectoryEntry[]>;
}

export function dir_add_dots(list: IDirectoryEntry[]){
    list.push({name:"."})
    list.push({name:".."})
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
    private namei: NameI;

    constructor(kernel: Kernel) {
        this.kernel = kernel;
        this.mounts = new MountManager(this.kernel);
        this.dcache = new DirectoryCache(this.kernel);
        this.namei = new NameI(this.kernel);
    }

    async mount(device: string, options:string, mount: IVFSMount|null, entry: IDEntry, filesystem:IFileSystemType): Promise<IVFSMount>{
        let sb = await filesystem.mount(device, options);
        let vfsmnt = this.mounts.create(mount, entry, sb);

        entry.superblock = sb;
        entry.mounted++;
        return vfsmnt;
    }

    async unmount(mount: IVFSMount, entry: IDEntry): Promise<void>{
        let sb = this.mounts.delete(mount!, entry)
        sb.fileSystemType.unmount(sb);

        entry.superblock = null;
        entry.mounted--;
        return;
    }

    registerFS(fst: IFileSystemType){
        this.filesystems[fst.name] = fst;
    }
    getFS(name: string): IFileSystemType{
        return this.filesystems[name];
    }

    async open(path: IPath): Promise<IFile>{
        if(path.entry.inode){
            const file = await path.entry.inode!.fileOperations.open(path.entry.inode!, path.entry);
            file.dentry = path.entry;
            return file;
        }else{
            throw new PError(Status.ENOENT);
        }
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

    lookup(path: string, task: IProtoTask|null): IPath{
        // const seg = splitInSegments(path);
        // if (cwd){
        //     let pivot: IPath;
        //     let component: string;
        //     if(path.startsWith("/")){
        //         component = seg.shift()!;
        //         pivot = this.findRoot(cwd);
        //     }else{
        //         pivot = {entry:cwd.entry, mount:cwd.mount};
        //     }
        //     while(seg.length){
        //         component = seg.shift()!;
        //         let child = this.dcache.lookup(pivot.entry, component);
        //         if(!child || (child!.operations?.revalidate && child.operations?.revalidate(child))){
        //             child = this.dcache.alloc(pivot.entry, component);
        //             let other = pivot.entry?.inode!.operations.lookup(pivot.entry?.inode!, child);
        //             if(other?.inode){
        //
        //             }
        //         }
        //
        //         if(child.mounted){
        //             pivot.mount = this.mounts.lookupChild(pivot.mount!, child)!;
        //             pivot.entry = pivot.mount.root;
        //         }else{
        //             pivot.entry = child;
        //         }
        //     }
        //     return pivot;
        // }else{
        //     let entry = this.dcache.alloc(null, '');
        //     return { mount: null, entry: entry }
        // }
        if (task){
            const nd = this.namei.pathLookup(path, 0, task);
            return nd.path;
        }else{
            let entry = this.dcache.alloc(null, '');
            return { mount: null, entry: entry }
        }
    }
}

