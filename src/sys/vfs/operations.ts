

export interface IDirectoryEntry{
    name: string
}

export function dir_add_dots(list: IDirectoryEntry[]){
    list.push({name:"."})
    list.push({name:".."})
}
