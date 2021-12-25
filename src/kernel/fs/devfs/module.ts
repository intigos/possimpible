import {Kernel} from "../../kernel";
import {IKernelModule} from "../../sys/modules";
import {
    IFileOperations,
    IFileSystemType,
    IINode,
    IINodeOperations,
    ISuperBlock
} from "../vfs";
import {IDevice} from "../../sys/devices";
import {d_alloc} from "../dcache";

const devices = new Map<string, IDevice>();


const inodeOperators: IINodeOperations = {
    lookup: (node,entry) => {
        const x = node.map.get(entry.name);

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
        const device = file.dentry.inode.map as IDevice;
        return device.read(count);
    },
    write: (file, buf) => {
        const device = file.dentry.inode.map as IDevice;
        return device.write(buf);
    }
}

async function mount(device: string): Promise<ISuperBlock>{
    let entry = d_alloc(null, "");
    entry.inode = {
        mode: true,
        user: true,
        map: devices,
        operations: inodeOperators,
        fileOperations: fileOperations
    }
    return {
        device: "dev",
        superblockOperations: {},
        root: entry
    }
}

const fs: IFileSystemType = {
    name:"devfs",
    mount: mount
}

function init(kernel: Kernel){
    devices.set("tty", kernel.tty);
    devices.set("console", kernel.tty);
    kernel.vfs.registerFS(fs);
}

function cleanup(){

}

const m: IKernelModule = {
    name: "devfs",
    init: init,
    cleanup: cleanup
}

export default m;
