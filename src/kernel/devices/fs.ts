import {IINode, IINodeOperations, inode_new} from "../fs/inode";
import {
    dir_add_dots,
    IFile,
    IFileOperations, IFileSystemType,
    ISuperBlock,
    ISuperBlockOperations,
} from "../fs/vfs";
import {IDirectoryEntry} from "../../public/api";
import {Kernel} from "../kernel";
import {DeviceManager} from "./drivers";

const inodeOperators: IINodeOperations = {
    lookup: (node,entry) => {
        const x = (node.map as DeviceManager).devices.get(entry.name);
        if(x){
            entry.inode = inode_new(node.superblock);
            entry.inode.map = x;
            entry.inode.fileOperations = x!;
        }else{
            // TODO: Does not exist here;
        }

        return entry;
    },
    getattr: async (vfsmount, dentry) => {
        return ""
    }
}

const fileOperations: IFileOperations = {
    iterate: async (file): Promise<IDirectoryEntry[]> => {
        const map = file.dentry.inode!.map.devices as Map<string, IFileOperations>;
        const result: IDirectoryEntry[] = [];
        dir_add_dots(result);
        const devices = Array.from(map.keys()).map(x => {
            return {name: x};
        });
        return result.concat(devices);
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

async function mount(device: string, options: string, kernel: Kernel): Promise<ISuperBlock>{
    let entry = kernel.vfs.dcache.alloc(null, "");
    const sb = {
        device: "dev",
        superblockOperations: superblockOperations,
        fileSystemType: devfs,
        root: entry
    };

    entry.inode = inode_new(sb);
    entry.inode.map = kernel.devices

    return sb;
}

export const devfs: IFileSystemType = {
    name:"dev",
    mount: mount,
    unmount: sb => {}
}
