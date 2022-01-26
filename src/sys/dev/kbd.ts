import {System} from "../system";
import {mkchannel} from "../vfs/channel";
import {ISystemModule} from "../modules";
import {IDirtab, mkdirtab, read, walk} from "../dirtab";
import {Type} from "../../public/api";

const rootdir: IDirtab[] = [
    {name: "scancode", id:1, type:Type.FILE, l:0, mode: 0}
]


function init(system: System) {
    system.dev.registerDevice({
        id: "b",
        name: "kbd",
        operations: {
            attach: async (options, kernel) => {
                let c = mkchannel();
                c.map = mkdirtab(rootdir);
                c.operations = {
                    read: read,
                    walk: walk
                }
                return c;
            }
        }
    });
}

function cleanup(){

}

const module: ISystemModule = {
    name: "cons",
    init: init,
    cleanup: cleanup
}
export default module;
