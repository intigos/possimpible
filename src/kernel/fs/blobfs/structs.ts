export interface IBlobSuperNode{
    nodes: (IBlobINode|null)[],
    dirents: (IBlobDirEnt|null)[],
    data: (string|null)[],
}

export enum BlobINodeType {
    REGULAR,
    DIRECTORY,
    LINK
}
export type BlobDirEnt_ptr = number;
export type BlobINode_ptr = number;
export type BlobData_ptr = number;

export interface IBlobDirEnt {
    name: string,
    node: BlobINode_ptr,
}

export function blob_alloc_superblock(): IBlobSuperNode{
    return {
        nodes: [],
        data: [],
        dirents: [],
    };
}

export interface IBlobINode{
    type: BlobINodeType,
    pos: BlobINode_ptr,
    map: BlobData_ptr|BlobDirEnt_ptr[]
}



export function blob_dirent_alloc(name: string, inode: IBlobINode, sb: IBlobSuperNode): BlobDirEnt_ptr{
    const dirent: IBlobDirEnt = {
        name: name,
        node: inode.pos,
    }

    return sb.dirents!.push(dirent) - 1;
}

export function blob_inode_alloc(type: BlobINodeType, sb: IBlobSuperNode,
                                 content :BlobData_ptr|BlobDirEnt_ptr[]): IBlobINode{
    const node: IBlobINode = {
        type: type,
        pos: sb.nodes.length,
        map: content
    }

    sb.nodes.push(node)

    return node;
}

export function blob_add_to_parent(parent: IBlobINode, dirent: BlobDirEnt_ptr, sb: IBlobSuperNode){
    (parent.map as BlobDirEnt_ptr[]).push(dirent)
}

export function blob_remove_from_parent(parent: IBlobINode, dirent: BlobDirEnt_ptr, sb: IBlobSuperNode){
    const map = (parent.map as BlobDirEnt_ptr[]);
    const index = map.indexOf(dirent);
    if (index > -1) {
        map.splice(index, 1);
    }
}

export function blob_inode_find_child(node: IBlobINode, name: string, sb: IBlobSuperNode): BlobDirEnt_ptr|undefined{
    return (node.map as BlobDirEnt_ptr[]).find(x => sb.dirents[x]!.name ==  name);
}

export function blob_data_alloc(content: string, sb: IBlobSuperNode): BlobData_ptr{
    return sb.data.push(content) - 1;
}

export function blob_get_data(node: IBlobINode, sb: IBlobSuperNode){
    return sb.data[node.map as number];
}

export function blob_set_data(node: IBlobINode, content: string, sb: IBlobSuperNode): string{
    return sb.data[node.map as number] = content;
}
