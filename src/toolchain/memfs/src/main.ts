import {CreateMode, OpenMode, Type} from "../../../public/api";
import {Fid, Service9P} from "../../../public/9p";
import {IMemINode, IMemSuperNode, MemDirEnt_ptr, MemINodeType} from "../../../sys/memfs/low";
import {IStat} from "../../../sys/vfs/operations";

async function slurp(s: string){
    const fd = await self.proc.sys.open(s, OpenMode.READ);
    return new TextDecoder().decode(await self.proc.sys.read(fd, -1));
}

function dirp(type: MemINodeType): Type {
    return type == MemINodeType.DIRECTORY ? Type.DIR : Type.FILE;
}

setTimeout(async () => {
    let syscall = self.proc.sys;
    const path = self.proc.argv;
    const img = path[1];
    const name = path[2];
    const srvfd = await syscall.create(name, CreateMode.WRITE);

    const pipefd = await syscall.pipe();

    syscall.write(srvfd, new TextEncoder().encode("" + pipefd[0]));

    const zzz = await slurp(img);
    const sb: IMemSuperNode = JSON.parse(zzz);

    const srv = new Service9P(pipefd[1], {
        async attach(fid: Fid, aname: string): Promise<Type> {
            debugger;
            const root = sb.nodes[0];
            srv.set(fid, root);
            return root?.type == MemINodeType.DIRECTORY ? Type.DIR : Type.FILE;
        },

        attr(fid: Fid, l: string): Promise<string> {
            return Promise.resolve("");
        },

        clunk(fid: Fid): Promise<void> {
            return Promise.resolve(undefined);
        },

        create(fid: Fid, name: string, mode: CreateMode): Promise<Type> {
            throw "NI";
        },

        open(fid: Fid, mode: OpenMode): Promise<Type> {
            const node = srv.get(fid) as IMemINode;
            return Promise.resolve(MemINodeType.DIRECTORY ? Type.DIR : Type.FILE);
        },

        read(fid: Fid, offset: number, count: number): Promise<Uint8Array> {
            const node = srv.get(fid) as IMemINode;
            let s = sb.data[node.pos]!;
            return Promise.resolve(new TextEncoder().encode(s));
        },

        remove(fid: Fid): Promise<void> {
            throw "NI";
        },

        stat(fid: Fid): Promise<IStat> {
            throw "NI";
        },

        walk(fid: Fid, newfid: Fid, name: string[]): Promise<Type[]> {
            let node = srv.get(fid) as IMemINode;
            let result: Type[] = []
            for(const n of name){
                if(n == ".") {
                    result.push(dirp(node.type));
                    continue;
                }else if(n == ".." && node.parent) {
                    node = sb.nodes[node.parent]!;
                    result.push(dirp(node.type));
                    continue;
                }
                else if(node.type == MemINodeType.DIRECTORY){
                    for(const ptr of node.map as MemDirEnt_ptr[]){
                        const dirent = sb.dirents[ptr];

                        if(dirent?.name){
                            node = sb.nodes[dirent.node]!;
                            result.push(dirp(node.type));
                            continue;
                        }
                    }
                    throw "Not an entity";
                }else{
                    throw "not a dir";
                }
            }


            return Promise.resolve([]);
        },

        wattr(fid: Fid, l: string, s: string): Promise<void> {
            throw "NI";
        },

        write(fid: Fid, buf: Uint8Array, offset: number): Promise<number> {
            return Promise.resolve(0);
        },

        wstat(fid: Fid, s: IStat): Promise<void> {
            throw "NI";
        }

    })
    await srv.run();

},0);
