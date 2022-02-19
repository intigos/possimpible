import {System} from "../system";
import {ISystemModule} from "../modules";
import {getstat, IDirtab, mkdirtab, mkdirtabA, read, walk} from "../dirtab";
import {PError, Status, Type} from "../../public/api";
import {IChannel} from "../vfs/channel";
import {dequeue, enqueue, IAsyncQueue, mkaqueue} from "../aqueue";

class Socket implements IDirtab{
    name: string;
    id: number;
    type: Type;
    l: number;
    mode: number;
    uid: string;
    websocket?: WebSocket;
    dirtab: IDirtab['dirtab'];
    aqueue: IAsyncQueue<Uint8Array>;
    binary: boolean = false;


    constructor(socket: string, system: System) {

        this.name = socket
        this.id = 1
        this.type = Type.DIR
        this.l = 0
        this.mode =  0
        this.uid = system.sysUser
        this.dirtab = [
            {name: "ctrl", id: 1, type: Type.FILE, l: 0, mode: 0, uid: system.sysUser, write:this.ctrlWrite.bind(this)},
            {name: "data", id: 1, type: Type.FILE, l: 0, mode: 0, uid: system.sysUser, write:this.dataWrite.bind(this), read:this.dataRead.bind(this) },
            {name: "status", id: 1, type: Type.FILE, l: 0, mode: 0, uid: system.sysUser }
        ];
        this.aqueue = mkaqueue<Uint8Array>();
        mkdirtab(this, system);
    }

    async ctrlWrite(file: IChannel, buf: Uint8Array, offset: number) {
        const command = new TextDecoder().decode(buf);
        const argv = command.split(/\s+/);
        switch (argv[0]){
            case "connect":
                if(!this.websocket){
                    const path = argv[1];
                    this.websocket = new WebSocket("ws://" + path);
                    if(this.binary){
                        this.websocket.binaryType = 'arraybuffer';
                    }
                    this.websocket.addEventListener("message", (ev) => {
                        enqueue(this.aqueue, new Uint8Array(ev.data))
                    })
                } else throw new PError(Status.EIO);
            case 'mode':
                if(argv[1] == "binary"){
                    this.binary = true;
                }
        }
    }

    async dataWrite(file: IChannel, buf: Uint8Array, offset: number) {
        let data:any = buf;
        if(!this.binary){
            data = new TextDecoder().decode(buf);
        }
        this.websocket?.send(data);
    }
    async dataRead(file: IChannel, count: number, offset: number) {
        return dequeue(this.aqueue);
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
