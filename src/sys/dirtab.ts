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
    remove?: IOperations["remove"]
    dirtab?: IDirtab[]
}

export function mkdirtab(dirtab: IDirtab[] | (() => IDirtab[])){
    return {dirtab: dirtab};
}
const te = new TextEncoder()
export const read = async (c: IChannel, count: number, offset: number): Promise<Uint8Array> => {
    const dirtab = (c.map as IDirtab);
    if(c.type & Type.DIR){
        if (dirtab.dirtab){
            let d:IDirtab[] = dirtab.dirtab;

            if({}.toString.call(d) === '[object Function]'){
                d = (d as any)() as IDirtab[];
            }

            return te.encode(Array.from(d.map(x => {
                return x.name;
            })).reduce((x, y) => x + "\n" + y));
        }else{
            return te.encode("");
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
        let dirtab = dir.map.dirtab;
        if({}.toString.call(dirtab) === '[object Function]'){
            dirtab = dirtab();
        }

        for (const tab of dirtab as IDirtab[]) {
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
