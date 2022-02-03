import {System} from "../system";
import {IChannel, mkchannel} from "../vfs/channel";
import {ISystemModule} from "../modules";
import {IDirtab, mkdirtab, read, walk} from "../dirtab";
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

    constructor() {
        this.worker = new Worker(workerImage, {
            name: "" + this.name
        });

        this.worker.addEventListener("message", async (ev: MessageEvent<Uint8Array>) => {
            console.log(debug(ev.data));
            await enqueue(this.aqueue, ev.data);
        });
    }

    async read(c:IChannel, count:number, offset:number): Promise<Uint8Array> {
        return await dequeue(c.map.aqueue);
    }

    async write(c:IChannel, buf:Uint8Array, offset: number) {
        console.log(debug(buf));
        c.map.worker.postMessage(buf);
    }

    async remove(c: IChannel) {
        c.map.worker.terminate();
    }
}

const cpudir: IDirtab[] = [
    {name: "ctrl", id:1, type:Type.FILE, l:0, mode: 0,
        read: async (c, count, offset) => {
            const process = new Process();

            cpudir.push(process);

            return new TextEncoder().encode(process.name);
        }
    }
];

const rootdir: IDirtab[] = [
    {name: "cpu", id:1, type:Type.DIR, l:0, mode: 0, dirtab:cpudir},
]

async function init(system: System) {
    system.dev.registerDevice({
        id: "C",
        name: "cpu",
        operations: {
            attach: async (options, kernel) => {
                let c = mkchannel();
                c.type = Type.DIR;
                c.map = mkdirtab(rootdir);
                c.operations = {
                    walk: walk,
                    read: read,
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
