import {System} from "../system";
import {mkchannel} from "../vfs/channel";
import {ISystemModule} from "../modules";
import {IDirtab, mkdirtab, read, walk} from "../dirtab";
import {dequeue, enqueue, mkaqueue} from "../aqueue";
import {Type} from "../../public/api";

async function init(system: System) {
    system.dev.registerDevice({
        id: "|",
        name: "pipe",
        operations: {
            attach: async (options, kernel) => {
                const queue1 = mkaqueue<string>();
                const queue2 = mkaqueue<string>();

                const rootdir: IDirtab[] = [
                    {name: "data", id:1, type:Type.FILE, l:0, mode: 0,
                        read: async (c1, count, offset): Promise<string> => {
                            return await dequeue(queue1);
                        },
                        write: (c1, buf, offset) => {
                            enqueue(queue2, buf);
                        }
                    },
                    {name: "data1", id:1, type:Type.FILE, l:0, mode: 0,
                        read: async (c1, count, offset): Promise<string> => {
                            return await dequeue(queue2);
                        },
                        write: (c1, buf, offset) => {
                            enqueue(queue1, buf);
                        }
                    }
                ]

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
    name: "pipe",
    init: init,
    cleanup: cleanup
}
export default module;
