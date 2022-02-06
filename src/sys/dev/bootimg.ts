import {ISystemModule} from "../modules";
import {System} from "../system";
import {getstat, IDirtab, mkdirtabA, read, walk} from "../dirtab";
import {Type} from "../../public/api";

const rootdir: IDirtab[] = []

function init(system: System){
    system.dev.registerDriver({
        probe: async (x, match) => {
            rootdir.push({
                name: x.id, id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                read: async (file, buf) => {
                    return new Uint8Array(await (await (await fetch((x as any).properties.image)).blob()).arrayBuffer())
                }
            });
        },
        remove: (x) => {},
        driver:{
            name: "image",
            matchTable: [{compatible: "storage:image", data: null}]
        }
    })

    system.dev.registerDevice({
        id: "i",
        name: "image",
        operations: {
            attach: async (options, system1) => {
                let c = system.channels.mkchannel();
                c.srv = "i"
                c.map = mkdirtabA(rootdir, system1);
                c.type = Type.DIR
                c.operations = {
                    read: read,
                    walk: walk,
                    getstat: getstat
                }
                return c;
            }
        }
    });
}

function cleanup(){

}

const module: ISystemModule = {
    name: "image",
    init: init,
    cleanup: cleanup
}

export default module;
