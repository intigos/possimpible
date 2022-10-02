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

export function mkfile(name: string, dirbn: IMemINode, content:Uint8Array, sb: IMemSuperNode){
    const nbn = mem_inode_alloc(
        MemINodeType.REGULAR,
        sb, dirbn.pos, mem_data_alloc(content, sb));

    const de = mem_dirent_alloc(name, nbn, sb);

    mem_add_to_parent(dirbn, de, sb);

    return nbn;
}

export const readdir = async (c: IChannel): Promise<IDirectoryEntry[]> => {

    throw new PError(Status.ENOTDIR);
}

const te = new TextEncoder();
export const read = async (c: IChannel, count: number, offset: number): Promise<Uint8Array> => {
    if(c.type & Type.DIR){
        const {sb, root} = c.map as {sb: IMemSuperNode, root: IMemINode};
        console.log(sb.data[root.map as number]!);
        return te.encode(sb.data[root.map as number]!);
    }else{
        const {sb, root} = c.map as {sb: IMemSuperNode, root: IMemINode};
        if (root.type == MemINodeType.DIRECTORY) {
            return te.encode((root.map as MemDirEnt_ptr[]).map(x => {return sb.dirents[x]!.name})
                .reduce((x, y) =>  x + "\n" + y) || "");
        }else{
            throw new PError(Status.ENOTDIR)
        }
    }
}

export const walk = async (dir: IChannel, c: IChannel, name: string): Promise<IChannel> => {
    const {sb, root} = dir.map as {sb: IMemSuperNode, root: IMemINode};
    if (root.type == MemINodeType.DIRECTORY){
        const direntpos = mem_inode_find_child(root, name, sb);

        if(direntpos != undefined){
            const foundnode = sb.nodes[sb.dirents[direntpos]!.node]!;

            c.parent = dir;
            c.map = {sb: sb, root: foundnode}
            c.name = sb.dirents[direntpos]!.name
            if (foundnode.type == MemINodeType.DIRECTORY){
                c.type = Type.DIR;
                c.operations = {
                    walk: walk,
                    read: read,
                    getstat: getstat
                }
            }else{
                c.type = Type.FILE;
                c.operations = {
                    read: read,
                    getstat: getstat
                }
            }
            return c;
        }
    }
    throw new PError(Status.ENOTDIR);
}
