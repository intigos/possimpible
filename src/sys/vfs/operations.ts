export interface IStat{
    /* system–modified data */
    id: string;     /* server type */
    dev: string;    /* server subtype */
    /* file data */
    mode: number;   /* permissions */
    atime: Date;    /* last read time */
    mtime: Date;    /* last write time */
    length: number; /* file length */
    name: string;   /* last element of path */
    uid: string;    /* owner name */
    gid: string;    /* group name */
    muid: string;   /* last modifier name */
}

export interface IDirectoryEntry{
    name: string
}

export function dir_add_dots(list: IDirectoryEntry[]){
    list.push({name:"."})
    list.push({name:".."})
}
