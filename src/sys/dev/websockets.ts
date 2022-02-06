import {System} from "../system";
import {ISystemModule} from "../modules";
import {getstat, IDirtab, mkdirtab, mkdirtabA, read, walk} from "../dirtab";
import {PError, Status, Type} from "../../public/api";
import {IChannel} from "../vfs/channel";

class Socket implements IDirtab{
    name: string;
    id: number;
    type: Type;
    l: number;
    mode: number;
    uid: string;
    private websocket?: WebSocket;
    dirtab: IDirtab['dirtab'];

    constructor(socket: string, system: System) {

        this.name = socket
        this.id = 1
        this.type = Type.DIR
        this.l = 0
        this.mode =  0
        this.uid = system.sysUser
        this.dirtab = [
            {name: "ctrl", id: 1, type: Type.FILE, l: 0, mode: 0, uid: system.sysUser, write:this.ctrlWrite},
            {name: "data", id: 1, type: Type.FILE, l: 0, mode: 0, uid: system.sysUser },
            {name: "local", id: 1, type: Type.FILE, l: 0, mode: 0, uid: system.sysUser },
            {name: "remote", id: 1, type: Type.FILE, l: 0, mode: 0, uid: system.sysUser },
            {name: "status", id: 1, type: Type.FILE, l: 0, mode: 0, uid: system.sysUser }
        ];
        mkdirtab(this, system);
    }

    async ctrlWrite(file: IChannel, buf: Uint8Array, offset: number) {
        const command = new TextDecoder().decode(buf);
        const argv = command.split(/\s+/);
        switch (command[0]){
            case "connect":
                if(!this.websocket){
                    const path = argv[0];
                    this.websocket = new WebSocket(path);
                } else throw new PError(Status.EIO);
        }
    }
}



async function init(system: System) {
    const rootdir: IDirtab[] = [
        {name: "clone", id:1, type:Type.FILE, l:0, mode: 0, uid:system.sysUser,
            read: async (c, count, offset) => {
                const process = new Socket("bananas", system);
                rootdir.push(mkdirtab(process, system));
                return new TextEncoder().encode(process.name);
            }
        },
    ]

    system.dev.registerDevice({
        id: "w",
        name: "websockets",
        operations: {
            attach: async (options, kernel) => {
                let c = system.channels.mkchannel()
                c.srv = "w";
                c.type = Type.DIR;
                c.map = mkdirtabA(rootdir, kernel);
                c.operations = {
                    walk: walk,
                    read: read,
                    getstat: getstat
                }
                return c;
            },
        }
    });
}

function cleanup(){

}

const module: ISystemModule = {
    name: "websockets",
    init: init,
    cleanup: cleanup
}
export default module;
