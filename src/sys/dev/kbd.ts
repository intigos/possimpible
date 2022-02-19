import {System} from "../system";
import {ISystemModule} from "../modules";
import {getstat, IDirtab, mkdirtabA, read, walk} from "../dirtab";
import {Type} from "../../public/api";

function init(system: System) {
    const rootdir: IDirtab[] = [
        {name: "scancode", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser}
    ]

    system.dev.registerDevice({
        id: "b",
        name: "kbd",
        operations: {
            attach: async (options, kernel) => {
                let c = system.channels.mkchannel()
                c.srv = "b";
                c.map = mkdirtabA(rootdir, kernel);
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
    name: "kbd",
    init: init,
    cleanup: cleanup
}
export default module;
