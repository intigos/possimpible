import {System} from "../system";
import {ISystemModule} from "../modules";
import {getstat, IDirtab, mkdirtabA, read, walk} from "../dirtab";
import {dequeue, enqueue, mkaqueue} from "../aqueue";
import {Type} from "../../public/api";

async function init(system: System) {
    system.dev.registerDevice({
        id: "|",
        name: "pipe",
        operations: {
            attach: async (options, kernel) => {
                const queue1 = mkaqueue<Uint8Array>();
                const queue2 = mkaqueue<Uint8Array>();

                const rootdir: IDirtab[] = [
                    {name: "data", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                        read: async (c1, count, offset): Promise<Uint8Array> => {
                            return await dequeue(queue1);
                        },
                        write: (c1, buf, offset) => {
                            enqueue(queue2, buf);
                        }
                    },
                    {name: "data1", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                        read: async (c1, count, offset): Promise<Uint8Array> => {
                            return await dequeue(queue2);
                        },
                        write: (c1, buf, offset) => {
                            enqueue(queue1, buf);
                        }
                    }
                ]

                let c = system.channels.mkchannel();
                c.srv = "|";
                c.type = Type.DIR;
                c.map = mkdirtabA(rootdir, system);
                c.operations = {
                    walk: walk,
                    read: read,
                    getstat: getstat,
                }
                return c;
            },
        }
    });
}

function cleanup(){

}

const module: ISystemModule = {
    name: "pipe",
    init: init,
    cleanup: cleanup
}
export default module;
