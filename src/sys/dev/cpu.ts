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
import SharedBufferExchange from "../../proc/sbx";


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
    private buffer: SharedArrayBuffer;
    private sbx: SharedBufferExchange;

    constructor(system: System) {
        this.muid = system.sysUser;
        this.uid = system.sysUser;
        this.atime = new Date().valueOf();
        this.mtime = this.atime;
        this.buffer = new SharedArrayBuffer(1025);
        this.worker = new Worker(workerImage, {
            name: "" + this.name
        });
        this.sbx = new SharedBufferExchange();
        this.worker.postMessage(this.sbx.buffer);

    }

    async init(){
        await this.sbx.ready();
    }

    async read(c:IChannel, count:number, offset:number): Promise<Uint8Array> {
        const data = await (c.map as Process).sbx.read();
        console.log(c.name.substring(0,5) + " <", debug(data));
        return data;
    }

    async write(c:IChannel, buf:Uint8Array, offset: number) {
        console.log(c.name.substring(0,5) + " >", debug(buf));
        await (c.map as Process).sbx.write(buf);
    }

    async remove(c: IChannel) {
        c.map.worker.terminate();
    }
}

async function init(system: System) {
    const cpudir: IDirtab[] = [
        {name: "ctrl", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
            read: async (c, count, offset) => {
                const process = new Process(system);
                await process.init();

                cpudir.push(mkdirtab(process, system));

                return new TextEncoder().encode(process.name);
            }
        }
    ];

    const rootdir: IDirtab[] = [
        {name: "cpu", id:1, type:Type.DIR, l:0, mode: 0, uid:system.sysUser, dirtab:cpudir},
    ]

    system.dev.registerDevice({
        id: "C",
        name: "cpu",
        operations: {
            attach: async (options, kernel) => {
                let c = system.channels.mkchannel()
                c.srv = "C";
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
    name: "cpu",
    init: init,
    cleanup: cleanup
}
export default module;
