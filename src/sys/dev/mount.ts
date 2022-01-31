import {System} from "../system";
import {IChannel, mkchannel} from "../vfs/channel";
import {ISystemModule} from "../modules";
import {OpenMode, PError, Status, Type} from "../../public/api";
import {
    MPTattach,
    MPTopen,
    MPTread,
    MPTwalk, MPTwrite,
    MURattach,
    MURerror,
    MURopen,
    MURread,
    MURwalk, MURwrite,
    peak9p,
    Protocol9P
} from "../../public/9p";

interface MountRPCNode{
    client: MountClient,
    fid: number
    type: Type
}

class MountClient{
    private tag: number;
    private fid: number;
    private srv: IChannel;
    private aname: string;

    constructor(fd, aname) {
        this.srv = fd;
        this.tag = 0;
        this.fid = 1;
        this.aname = aname;
    }

    private async mountrpc<T extends (...args) => Uint8Array,R extends (m: Uint8Array) => any>(args: Parameters<typeof pack>, pack:T, unpack:R): Promise<ReturnType<R>>{
        const tag = this.tag++;
        debugger
        args[0] = tag
        await this.srv.operations.write?.(this.srv, pack(...args), 0)
        const buf = await this.srv.operations.read?.(this.srv, -1, 0)!;
        const [type, t] = peak9p(buf);
        if(type != Protocol9P.Rerror){
            if(t == tag){
                return unpack(buf);
            }
            throw new PError(Status.ENOENT);
        }else if(type == Protocol9P.Rerror){
            const c = MURerror(buf);
            throw new PError(Status.ENOENT);
        }else{
            throw new PError(Status.ENOENT);
        }
    }

    async attach(): Promise<MountRPCNode> {
        const result = await this.mountrpc([0, 0, "", this.aname], MPTattach, MURattach);
        return {
            client: this,
            fid : 0,
            type: result[2]
        };
    }

    async open(node: MountRPCNode, mode: OpenMode): Promise<MountRPCNode>{
        await this.mountrpc([0, node.fid, mode], MPTopen, MURopen);
        return node;
    }

    async read(node: MountRPCNode, offset: number, count: number): Promise<Uint8Array>{
        const result = await this.mountrpc([0, node.fid, offset, count], MPTread, MURread);
        return result[2];
    }

    async write(node: MountRPCNode, offset: number, buf: Uint8Array): Promise<number>{
        const result = await this.mountrpc([0, node.fid, offset, buf], MPTwrite, MURwrite);
        return result[2];
    }

    async walk(node: MountRPCNode, wname: string[]): Promise<MountRPCNode>{
        const fid = this.fid++;
        const result = await this.mountrpc([0, node.fid, fid, wname], MPTwalk, MURwalk);
        return {
            client: this,
            fid: fid,
            type: result[2].pop()!,
        };
    }
}

async function mountread(c: IChannel, count: number, offset: number): Promise<Uint8Array> {
    const node = c.map as MountRPCNode;
    const buf = await node.client.read(node, offset, count);
    return buf;
}

async function mountwrite(c: IChannel, buf: Uint8Array, offset: number): Promise<number> {
    const node = c.map as MountRPCNode;
    return await node.client.write(node, offset, buf);
}

async function mountopen(c: IChannel, mode: OpenMode) : Promise<IChannel> {
    const node = c.map as MountRPCNode;
    await node.client.open(node, mode);
    return c;
}

async function mountwalk(dir: IChannel, c1: IChannel, name: string): Promise<void> {
    const node = dir.map as MountRPCNode
    const newnode = await node.client.walk(node, [name]);
    c1.map = newnode
    c1.parent = dir;
    c1.name = name;
    c1.type = newnode.type;
    if(c1.type == Type.DIR){
        c1.operations = {
            walk: mountwalk,
            open: mountopen,
            read: mountread,
        }
    }else{
        c1.operations = {
            read: mountread,
            open: mountopen,
            write: mountwrite
        }
    }
}

async function init(system: System) {
    system.dev.registerDevice({
        id: "M",
        name: "mount",
        operations: {
            attach: async (options, kernel) => {
                const struct = options as { fd: IChannel, afd: IChannel, aname:string }
                let c = mkchannel();
                const node = await (new MountClient(struct.fd, struct.aname).attach());
                c.map = node
                c.type = node.type;
                c.parent = null;
                c.operations = {
                    walk: mountwalk,
                    open: mountopen,
                    read: mountread
                }
                return c;
            },
        }
    });
}

function cleanup(){

}

const module: ISystemModule = {
    name: "rootfs",
    init: init,
    cleanup: cleanup
}
export default module;
