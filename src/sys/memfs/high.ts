import {
    IMemINode,
    IMemSuperNode,
    mem_add_to_parent,
    mem_alloc_superblock,
    mem_data_alloc,
    mem_dirent_alloc,
    mem_inode_alloc,
    mem_inode_find_child, MemDirEnt_ptr,
    MemINodeType
} from "./low";
import {IChannel} from "../vfs/channel";
import {IDirectoryEntry} from "../vfs/operations";
import {PError, Status, Type} from "../../public/api";
import {getstat} from "../dirtab";

export function mksb(): IMemSuperNode{
    const sb = mem_alloc_superblock();

    mem_inode_alloc(
        MemINodeType.DIRECTORY,
        sb, null, []);

    return sb;
}

export function getroot(sb: IMemSuperNode): IMemINode{
    return sb.nodes[0]!
}

export function mkdir(name: string, dirbn: IMemINode, sb: IMemSuperNode){
    const nbn = mem_inode_alloc(
        MemINodeType.DIRECTORY,
        sb, dirbn.pos,[]);

    const de = mem_dirent_alloc(name, nbn, sb);

    mem_add_to_parent(dirbn, de, sb);

    return nbn;
}

export function mkfile(name: string, dirbn: IMemINode, content:string, sb: IMemSuperNode){
    const nbn = mem_inode_alloc(
        MemINodeType.REGULAR,
        sb, dirbn.pos, mem_data_alloc(content, sb));

    const de = mem_dirent_alloc(name, nbn, sb);

    mem_add_to_parent(dirbn, de, sb);

    return nbn;
}

