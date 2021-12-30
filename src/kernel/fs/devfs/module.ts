import {Kernel} from "../../kernel";
import {IKernelModule} from "../../sys/modules";
import {
    IFile,
    IFileOperations,
    IFileSystemType, IPollTable,
    ISuperBlock, ISuperBlockOperations, LLSeekWhence, LockOperation
} from "../vfs";
import {IDevice} from "../../sys/devices";
import {IDEntry} from "../dcache";
import {IDirectoryEntry} from "../../../public/api";
import {IINode, IINodeOperations, inode_new} from "../inode";

const devices = new Map<string, IDevice>();


const inodeOperators: IINodeOperations = {
    lookup: (node,entry) => {
        const x = node.map.get(entry.name);
        entry.inode = inode_new(node.superblock);
        entry.inode.map = x;

        return null;
    },
    getattr: async (vfsmount, dentry) => {
        return ""
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

    llseek: async(file: IFile, offset: number, origin: LLSeekWhence): Promise<number> => {
        switch (origin) {
            case LLSeekWhence.SEEK_SET:
                file.position = offset;
                break;
            case LLSeekWhence.SEEK_END:
                file.position = file.size - offset;
                break;
            case LLSeekWhence.SEEK_CUR:
                file.position = file.position + offset;
                break;
        }

        return file.position;
    },

    lock(file: IFile, operation: LockOperation): void {
    },

    poll(file: IFile, pollfd: IPollTable): Promise<void> {
        return Promise.resolve(undefined);
    },

    readdir: async (dirent): Promise<IDirectoryEntry> => {
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
    read: async (file, count): Promise<string> => {
        const device = file.dentry.inode!.map as IDevice;
        let content;
        try{
            content = await device.read(count || -1);
        }catch (e){
            console.log(e)
        }
        return content
    },
    write: (file, buf) => {
        const device = file.dentry.inode!.map as IDevice;
        return device.write(buf);
    },
    iterate: (file): Promise<IDirectoryEntry[]> => {
        return new Promise<IDirectoryEntry[]>(resolve => {
            if(file.dentry.inode!.map.set){
                const map = file.dentry.inode!.map as Map<string, IDevice>;
                resolve(Array.from(map.keys()).map(x => {
                    return {name: x};
                }));
            } else {
                resolve([] as IDirectoryEntry[]);
            }
        })
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
        superblockOperations: superblockOperations,
        fileSystemType: fs,
        root: entry
    };

    entry.inode = inode_new(sb);
    entry.inode.map = devices

    return sb;
}

const fs: IFileSystemType = {
    name:"dev",
    mount: mount,
    unmount: sb => {}
}
let KERNEL: Kernel;

function init(kernel: Kernel){
    devices.set("tty", kernel.tty);
    devices.set("console", kernel.tty);
    kernel.vfs.registerFS(fs);
    KERNEL = kernel;
}

function cleanup(){

}

const m: IKernelModule = {
    name: "devfs",
    init: init,
    cleanup: cleanup
}

export default m;
