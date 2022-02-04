import {ISystemModule} from "../modules";
import {System} from "../system";
import {IChannel} from "../vfs/channel";
import {CreateMode, IStat, PError, Status, Type} from "../../public/api";
import {Task} from "../proc/task";

interface Srv {
    name: string,
    c?: IChannel
}

function init(system: System){
    const root: Srv[] = []
    const te = new TextEncoder();
    const td = new TextDecoder();

    function srvcreate(dir: IChannel, c: IChannel, name: string, mode: number){
        if(mode & CreateMode.DIR){
            throw new PError(Status.EPERM);
        }

        let srv = {
            name: name,
        };
        c.name = name;
        c.map = srv;
        c.type = Type.FILE;
        c.operations = {
            write: srvwrite,
            getstat: srvstat
        }
        root.push(srv);
    }

    async function srvread(c: IChannel, count: number, offset: number): Promise<Uint8Array>{
        if(c.type & Type.DIR){
            return te.encode(root.map(x => x.name).reduce((x,y) => x + "\n" + y) || "");
        }
        throw new PError(Status.EPERM);
    }

    async function srvwrite(c: IChannel, buf: Uint8Array, offset: number){
        let fd = parseInt(td.decode(buf));

        (c.map as Srv).c = (system.current as Task).files.fileDescriptors[fd]?.channel;
    }

    async function srvstat(c: IChannel): Promise<IStat>{
        return {
            srv: c.srv,
            subsrv: c.subsrv,
            type: c.type,
            uid: system.sysUser,
            mode: 0,
            muid: system.sysUser,
            gid: system.sysUser,
            name: c.name,
            mtime: system.boottime,
            atime: system.boottime,
            length: 0,
        };
    }

    async function srvopen(c: IChannel, mode: number): Promise<IChannel>{
        const s = root.find(x => x.name == c.name);
        if(s){
            return s.c!;
        }
        throw new PError(Status.ENOENT)
    }

    async function srvwalk(dir:IChannel, c:IChannel, name: string){
        for (const srv of root) {
            if (srv.name == name){
                c.parent = dir;
                c.map = srv;
                c.name = name;
                c.type = Type.FILE;
                c.operations = {
                    open: srvopen,
                    getstat: srvstat
                }
                return;
            }
        }
        throw new PError(Status.ENOENT)
    }

    system.dev.registerDevice({
        id: "s",
        name: "srv",
        operations: {
            attach: async (options, system1) => {
                const c = system.channels.mkchannel();
                c.srv = "s";
                c.map = root;
                c.type = Type.DIR;
                c.operations = {
                    read: srvread,
                    walk: srvwalk,
                    create: srvcreate,
                    getstat: srvstat
                }
                return c;
            }
        }
    });
}

function cleanup(){

}

const module: ISystemModule = {
    name: "srv",
    init: init,
    cleanup: cleanup
}

export default module;
