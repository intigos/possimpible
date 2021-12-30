import {Kernel} from "../../kernel";
import {IKernelModule} from "../../sys/modules";
import {
    dir_add_dots,
    IFile,
    IFileOperations,
    IFileSystemType,
    ISuperBlock,
    ISuperBlockOperations,
    LLSeekWhence,
    LockOperation
} from "../vfs";
import {IDEntry} from "../dcache";
import {IDirectoryEntry} from "../../../public/api";
import {IVFSMount} from "../mount";
import {
    blob_add_to_parent,
    blob_data_alloc,
    blob_dirent_alloc,
    blob_get_data,
    blob_inode_alloc,
    blob_inode_find_child,
    blob_set_data,
    BlobDirEnt_ptr,
    BlobINodeType,
    IBlobINode,
    IBlobSuperNode
} from "./structs";
import {IINode, IINodeOperations, inode_get_ptr, inode_new, inode_set_ptr} from "../inode";

const inodeOperators: IINodeOperations = {
    create:(dir, dentry, create) => {
        const dirbn = dir.map as IBlobINode;
        const sb = dir.superblock.device as IBlobSuperNode;

        const nbn = blob_inode_alloc(
            BlobINodeType.REGULAR,
            sb, blob_data_alloc("", sb));

        const de = blob_dirent_alloc(dentry.name, nbn, sb);

        blob_add_to_parent(dirbn, de, sb);

        let newiNode = inode_new(dir.superblock);
        inode_set_ptr<IBlobINode>(newiNode, nbn);

        dentry.inode = newiNode;
    },

    lookup: (dir,entry) => {
        const bn = dir.map as IBlobINode;
        const sb = dir.superblock.device as IBlobSuperNode
        if (bn.type == BlobINodeType.DIRECTORY){
            const direntpos = blob_inode_find_child(bn, entry.name, sb);

            if(direntpos != undefined){
                const foundnode = sb.nodes[sb.dirents[direntpos]!.node]!;
                const inode = inode_new(dir.superblock);
                if(foundnode.type == BlobINodeType.LINK){
                    inode.isLink = true;
                }
                inode_set_ptr<IBlobINode>(inode, foundnode);
                entry.inode = inode;
                entry.superblock = inode.superblock;
            }
        }else{
            // TODO: Throw erro
        }
        return null;
    },

    mkdir: (dir: IINode, dentry: IDEntry) => {
        const dirbn = dir.map as IBlobINode;
        const sb = dir.superblock.device as IBlobSuperNode;
        const nbn = blob_inode_alloc(
            BlobINodeType.DIRECTORY,
            sb, []);

        const de = blob_dirent_alloc(dentry.name, nbn, sb);

        blob_add_to_parent(dirbn, de, sb);

        let newiNode = inode_new(dir.superblock);
        inode_set_ptr<IBlobINode>(newiNode, nbn);

        dentry.inode = newiNode;
    },

    rmdir: (dir, dentry) => {
        const bn = dir.map as IBlobINode;
        const sb = dir.superblock.device as IBlobSuperNode;
        const direntpos = blob_inode_find_child(bn, dentry.name, sb);

        if(direntpos){
            const dirent = sb.dirents[direntpos]
            sb.dirents[direntpos] = null;
            sb.nodes[dirent!.node] = null;
            // TODO: should erase all recursivelly
        }
    },

    link: (olddentry, dir, dentry) => {
        const dirbn = inode_get_ptr<IBlobINode>(dir);
        const sb = dir.superblock.device as IBlobSuperNode;
        const bnold = inode_get_ptr<IBlobINode>(olddentry.inode!);

        const de = blob_dirent_alloc(olddentry.name, bnold, sb);
        blob_add_to_parent(dirbn, de, sb);
    },

    unlink: (dir, dentry) => {
        const dirbn = dir.map as IBlobINode;
        const sb = dir.superblock.device as IBlobSuperNode;

        for(let i=0; i<(dirbn.map as BlobDirEnt_ptr[]).length; i++){
            let x = (dirbn.map as BlobDirEnt_ptr[])[i];
            if (sb.dirents[x]!.name == dentry.name){
                sb.dirents[x] = null
            }
        }
    },

    symlink: (dir, dentry, name) => {
        const dirbn = dir.map as IBlobINode;
        const sb = dir.superblock.device as IBlobSuperNode;

        const nbn = blob_inode_alloc(
            BlobINodeType.LINK,
            sb, blob_data_alloc(name, sb));

        const de = blob_dirent_alloc(dentry.name, nbn, sb);

        blob_add_to_parent(dirbn, de, sb);

        let newiNode = inode_new(dir.superblock);
        inode_set_ptr<IBlobINode>(newiNode, nbn);

        dentry.inode = newiNode;
    },

    async getattr(vfsmount: IVFSMount, dentry: IDEntry): Promise<string>{
        return "";
    }
}

const fileOperations: IFileOperations = {
    open: async (node, entry: IDEntry): Promise<IFile> => {
        let bn = node.map as IBlobINode;
        let sb = node.superblock.device as IBlobSuperNode;
        if (bn.type === BlobINodeType.DIRECTORY){
            return {
                position: 0,
                size: ((node.map as IBlobINode).map as BlobDirEnt_ptr[]).length,
                dentry: entry,
                operations: fileOperations
            }
        }else{
            return {
                position: 0,
                size: blob_get_data(node.map as IBlobINode, sb)!.length,
                dentry: entry,
                operations: fileOperations
            }
        }
    },

    llseek: async (file: IFile, offset: number, origin: LLSeekWhence): Promise<number> => {
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

    read: async (file, count?) => {
        let content = blob_get_data(file.dentry.inode!.map, file.dentry.superblock?.device)
        if (count && count > 0) {
            file.position += count;
            return content!.substring(file.position, count);
        } else {
            return content!.substring(file.position);
        }
    },

    write: async (file, buf) => {
        const content = blob_get_data(file.dentry.inode!.map, file.dentry.superblock?.device)
        file.position += buf.length;
        blob_set_data(file.dentry.inode!.map,
            content!.substring(0, file.position) + buf + content!.substring(file.position + buf.length),
            file.dentry.superblock?.device)
    },

    readdir: async (dirent: IDirectoryEntry): Promise<IDirectoryEntry> => {
        // TODO: not implemented
        return {name: ""}
    },

    poll: async (file: IFile, pollfd) => {
        // TODO: not implemented
        return;
    },

    ioctl: async (file: IFile, cmd: number, arg: number): Promise<number> => {
        // TODO: not implemented
        return 0;
    },

    iterate: async (file) => {
        const dirbn = file.dentry.inode!.map as IBlobINode;
        const sb = file.dentry.inode!.superblock.device as IBlobSuperNode;

        return new Promise<IDirectoryEntry[]>(resolve => {
            const bn:IBlobINode = inode_get_ptr(file.dentry.inode!)
            let result: IDirectoryEntry[] = []
            dir_add_dots(result);
            if ((bn.map as BlobDirEnt_ptr[]).length) {
                const list = (bn.map as BlobDirEnt_ptr[]).map(x => {
                    return {name:sb.dirents[x]?.name!};
                })
                result = result.concat(list);
                resolve(result);
            }else{
                resolve([]);
            }
        })
    },

    flush: (file: IFile) => {
        //  TODO: not implemented
    },

    release: (inode: IINode, file: IFile) => {

    },

    fsync: (file: IFile, dentry: IDEntry, datasync: boolean) => {
        // TODO: not implemented
    },

    lock: (file: IFile, operation: LockOperation) => {

    }
}



async function mount(device: string): Promise<ISuperBlock>{
    let txt = await(await (await fetch(device)).blob()).text();
    let content = JSON.parse(txt) as IBlobSuperNode;

    const entry = KERNEL.vfs.dcache.alloc(null, "");

    const sb = {
        root: entry,
        device: content,
        fileSystemType: fs,
        superblockOperations:superBlockOperations,
    }

    entry.inode = inode_new(sb);
    inode_set_ptr(entry.inode, content.nodes[0]);

    return sb;
}

const superBlockOperations:ISuperBlockOperations = {
    alloc_inode(sb: ISuperBlock): IINode{
        return {
            mode: true,
            user: true,
            map: null,
            isLink: false,
            superblock: sb,
            operations: inodeOperators,
            fileOperations: fileOperations
        }
    },

    destroy_inode(inode: IINode){
        return;
    },

    write_inode(inode:IINode){

    },

    dirty_inode(inode: IINode){
        return;
    },

    put_inode(inode: IINode){
        return;
    },

    put_super(inode: ISuperBlock){
      return;
    },

    write_super(inode: ISuperBlock){
        return;
    },

    sync_fs(inode: ISuperBlock){
        return;
    }
}

const fs: IFileSystemType = {
    name:"blob",
    mount: mount,
    unmount: (sb: ISuperBlock) => {}
}
let KERNEL;
function init(kernel: Kernel){
    KERNEL = kernel;
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
