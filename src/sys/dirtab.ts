import {IChannel, IOperations} from "./vfs/channel";
import {PError, Status, Type} from "../public/api";

export interface IDirtab{
    name: string,
    id: number,
    type: Type,
    l: number,
    mode: number,
    read?: IOperations["read"],
    write?: IOperations["write"]
    dirtab?: IDirtab[]
}

export function mkdirtab(dirtab: IDirtab[]){
    return {dirtab: dirtab};
}

export const read = async (c: IChannel, count: number, offset: number): Promise<string> => {
    const dirtab = (c.map as IDirtab);
    if(c.type & Type.DIR){
        if (dirtab.dirtab){
            return Array.from(dirtab.dirtab.map(x => {
                return x.name;
            })).reduce((x, y) => x + "\n" + y);
        }else{
            return "";
        }
    }else{
        const read = dirtab.read;
        if(read){
            return await read(c, count, offset)
        }
        throw new PError(Status.EPERM);
    }
}

export const walk = async (dir: IChannel, c: IChannel, name: string): Promise<IChannel> => {
    if(dir.map.dirtab){
        for (const tab of dir.map.dirtab as IDirtab[]) {
            if(tab.name == name){
                c.map = tab;
                c.type = tab.type;
                c.name = name;
                c.parent = dir;
                if(tab.type == Type.FILE){
                    c.operations = {
                        read: read,
                        write: tab.write
                    }
                }else{
                    c.operations = {
                        walk: walk,
                        read: read
                    }
                }
                return c;
            }
        }
        throw new PError(Status.ENOENT);
    }
    throw new PError(Status.EPERM);
}
