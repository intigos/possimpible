import {System} from "../system";
import {ISystemModule} from "../modules";
import {create, getstat, IDirtab, mkdirtab, mkdirtabA, read, walk} from "../dirtab";
import {OMode, Perm, Type} from "../../public/api";
import {IChannel} from "../vfs/channel";
import {Task} from "../proc/task";


function gendirtab(system: System){
    const task = system.current!;
    const result:IDirtab[] = []
    for(const key of task?.env!.keys()!){
        const f: IDirtab = {name: key, id:1, type:Type.FILE, l:0, mode: 0, uid:task.uid,
            read:async (c, count, offset): Promise<Uint8Array> => {
                const task = system.current;
                return new TextEncoder().encode(task?.env.get(c.name));
            },
            write:(c, buf, offset) => {
                const task = system.current;
                task?.env.set(c.name, new TextDecoder().decode(buf))
            }
        };
        result.push(mkdirtab(f, system));
    }
    return result;
}



async function init(system: System) {
    system.dev.registerDevice({
        id: "e",
        name: "env",
        operations: {
            attach: async (options, kernel) => {
                let c = system.channels.mkchannel()
                c.srv = "e";
                c.type = Type.DIR;
                c.map = mkdirtabA(() => gendirtab(system), kernel);
                c.operations = {
                    walk: walk,
                    read: read,
                    getstat: getstat,
                    create: (dir, c1, name, mode, perm) => {
                        create(dir, c1, name, mode, perm);
                        const task = system.current;
                        task?.env.set(name, "");
                    }
                }
                return c;
            },
        }
    });
}

function cleanup(){

}

const module: ISystemModule = {
    name: "env",
    init: init,
    cleanup: cleanup
}
export default module;
