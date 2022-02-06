import {System} from "../system";
import {IChannel} from "../vfs/channel";
import {ISystemModule} from "../modules";
import {getstat, IDirtab, mkdirtab, mkdirtabA, read, walk} from "../dirtab";
import {Type} from "../../public/api";
import {v4 as UUID } from 'uuid';
import {debug, MessageType, peak} from "../../shared/proc";
// @ts-ignore
import workerImage from '&/worker.img';
import {dequeue, enqueue, mkaqueue} from "../aqueue";


class Process implements IDirtab{
    name = UUID();
    id = 1;
    type = Type.FILE;
    l = 0;
    mode = 0;
    worker: Worker;
    aqueue = mkaqueue<Uint8Array>()
    atime: number;
    mtime: number;
    muid: string;
    uid: string;

    constructor(system: System) {
        this.muid = system.sysUser;
        this.uid = system.sysUser;
        this.atime = new Date().valueOf();
        this.mtime = this.atime;
        this.worker = new Worker(workerImage, {
            name: "" + this.name
        });

        this.worker.addEventListener("message", async (ev: MessageEvent<Uint8Array>) => {
            console.log(this.name.substring(0,5) + " <", debug(ev.data));
            await enqueue(this.aqueue, ev.data);
        });
    }

    async read(c:IChannel, count:number, offset:number): Promise<Uint8Array> {
        return await dequeue(c.map.aqueue);
    }

    async write(c:IChannel, buf:Uint8Array, offset: number) {
        console.log(c.name.substring(0,5) + " >", debug(buf));
        c.map.worker.postMessage(buf);
    }

    async remove(c: IChannel) {
        c.map.worker.terminate();
    }
}

async function init(system: System) {
    const cpudir: IDirtab[] = [
        {name: "clone", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
            read: async (c, count, offset) => {
                const process = new Process(system);
                cpudir.push(mkdirtab(process, system));
                return new TextEncoder().encode(process.name);
            }
        }
    ];

    const rootdir: IDirtab[] = [
        {name: "ctrl", id:1, type:Type.DIR, l:0, mode: 0, uid:system.sysUser, dirtab:cpudir},
    ]

    system.dev.registerDevice({
        id: "h",
        name: "http",
        operations: {
            attach: async (options, kernel) => {
                let c = system.channels.mkchannel()
                c.srv = "h";
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
    name: "http",
    init: init,
    cleanup: cleanup
}
export default module;
