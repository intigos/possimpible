import {Kernel} from "../../kernel";
import {IKernelModule} from "../../sys/modules";
import {IFileOperations, IFileSystemType, IINode, IINodeOperations, ISuperBlock} from "../vfs";
import {d_alloc, IDEntry} from "../dcache";


const inodeOperators: IINodeOperations = {
    lookup: (node,entry) => {
        const x = node.map.files.filter(x => x.name == entry.name)[0] as IINode;
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
        return new Promise<string>(resolve => resolve(file.dentry.inode.map.content));
    },
    write: (file, buf) => {
        file.dentry.inode.map.content += buf;
    }
}

async function mount(device: string): Promise<ISuperBlock>{
    let txt = await(await (await fetch(device)).blob()).text();
    let content = JSON.parse(txt);

    const entry = d_alloc(null, "");
    entry.inode = {
        mode: true,
        user: true,
        map: content,
        operations: inodeOperators,
        fileOperations: fileOperations
    }

    return {
        root: entry,
        device: "blob",
        superblockOperations:{},
    }
}

const fs: IFileSystemType = {
    name:"blobfs",
    mount: mount
}

function init(kernel: Kernel){
    kernel.vfs.registerFS(fs);
}

function cleanup(){

}

const m: IKernelModule = {
    name: "blobfs",
    init: init,
    cleanup: cleanup
}

export default m;
