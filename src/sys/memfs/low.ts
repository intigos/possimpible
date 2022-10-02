
export interface IMemSuperNode{
    nodes: (IMemINode|null)[],
    dirents: (IMemDirEnt|null)[],
    data: (string|null)[],
}

export enum MemINodeType {
    REGULAR,
    DIRECTORY,
    LINK
}
export type MemDirEnt_ptr = number;
export type MemINode_ptr = number;
export type MemData_ptr = number;

export interface IMemDirEnt {
    name: string,
    node: MemINode_ptr,
}

export function mem_alloc_superblock(): IMemSuperNode{
    return {
        nodes: [],
        data: [],
        dirents: [],
    };
}

export interface IMemINode{
    type: MemINodeType,
    pos: MemINode_ptr,
    parent: MemINode_ptr|null,
    map: MemData_ptr|MemDirEnt_ptr[]
}



export function mem_dirent_alloc(name: string, inode: IMemINode, sb: IMemSuperNode): MemDirEnt_ptr{
    const dirent: IMemDirEnt = {
        name: name,
        node: inode.pos,
    }

    return sb.dirents!.push(dirent) - 1;
}

export function mem_inode_alloc(type: MemINodeType, sb: IMemSuperNode,
                                 parent: MemINode_ptr|null,
                                 content :MemData_ptr|MemDirEnt_ptr[]): IMemINode{
    const node: IMemINode = {
        type: type,
        pos: sb.nodes.length,
        map: content,
        parent: parent
    }

    sb.nodes.push(node)

    return node;
}

export function mem_add_to_parent(parent: IMemINode, dirent: MemDirEnt_ptr, sb: IMemSuperNode){
    (parent.map as MemDirEnt_ptr[]).push(dirent)
}

export function mem_remove_from_parent(parent: IMemINode, dirent: MemDirEnt_ptr, sb: IMemSuperNode){
    const map = (parent.map as MemDirEnt_ptr[]);
    const index = map.indexOf(dirent);
    if (index > -1) {
        map.splice(index, 1);
    }
}

export function mem_inode_find_child(node: IMemINode, name: string, sb: IMemSuperNode): MemDirEnt_ptr|undefined{
    return (node.map as MemDirEnt_ptr[]).find(x => sb.dirents[x]!.name ==  name);
}
const d = new TextDecoder()
export function mem_data_alloc(content: Uint8Array, sb: IMemSuperNode): MemData_ptr{
    return sb.data.push(d.decode(content)) - 1;
}

export function mem_get_data(node: IMemINode, sb: IMemSuperNode){
    return sb.data[node.map as number];
}

export function mem_set_data(node: IMemINode, content: Uint8Array, sb: IMemSuperNode): string{
    return sb.data[node.map as number] = d.decode(content);
}
