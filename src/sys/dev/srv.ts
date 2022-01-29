import {ISystemModule} from "../modules";
import {System} from "../system";
import {IChannel, mkchannel} from "../vfs/channel";
import {IDirectoryEntry} from "../vfs/operations";
import {ITask} from "../proc/proc";
import {CreateMode, PError, Status, Type} from "../../public/api";

interface Srv {
    name: string,
    c?: IChannel
}

const root: Srv[] = []

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
        write: srvwrite
    }
    root.push(srv);
}

async function srvread(c: IChannel, count: number, offset: number){
    if(c.type & Type.DIR){
        return root.map(x => x.name).reduce((x,y) => x + "\n" + y) || "";
    }
    throw new PError(Status.EPERM);
}

async function srvwrite(c: IChannel, buf: string, offset: number){
    let fd = parseInt(buf);

    (c.map as Srv).c = (S.current as ITask).files.fileDescriptors[fd]?.channel;
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
                open: srvopen
            }
            return;
        }
    }
    throw new PError(Status.ENOENT)
}

let S: System;
function init(system: System){
    S = system;
    system.dev.registerDevice({
        id: "s",
        name: "srv",
        operations: {
            attach: async (options, system1) => {
                let c = mkchannel();
                c.map = root;
                c.operations = {
                    read: srvread,
                    walk: srvwalk,
                    create: srvcreate
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
