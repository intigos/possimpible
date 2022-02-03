import {System} from "../system";
import {mkchannel} from "../vfs/channel";
import {ISystemModule} from "../modules";
import {IDirtab, mkdirtab, read, walk} from "../dirtab";
import {Type} from "../../public/api";


function gendirtab(system: System){
    const task = system.current;
    const result:IDirtab[] = []
    for(const key of task?.env!.keys()!){
        const f: IDirtab = {name: key, id:1, type:Type.FILE, l:0, mode: 0,
            read:async (c, count, offset): Promise<Uint8Array> => {
                const task =  system.current;
                return new TextEncoder().encode(task?.env.get(c.name));
            }
        };
        result.push(f);
    }
    return result;
}

async function init(system: System) {
    system.dev.registerDevice({
        id: "e",
        name: "env",
        operations: {
            attach: async (options, kernel) => {
                let c = mkchannel();
                c.type = Type.DIR;
                c.map = mkdirtab(() => gendirtab(system));
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
    name: "rootfs",
    init: init,
    cleanup: cleanup
}
export default module;
