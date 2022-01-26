import {ISystemModule} from "../modules";
import {System} from "../system";
import {IDirtab, read, walk} from "../dirtab";
import {mkchannel} from "../vfs/channel";
import {Type} from "../../public/api";

const rootdir: IDirtab[] = [
    {name: "dev", id:1, type:Type.DIR, l:0, mode: 0},
    {name: "vfs", id:1, type:Type.DIR, l:0, mode: 0},
    {name: "mod", id:1, type:Type.DIR, l:0, mode: 0},
    {name: "options", id:1, type:Type.DIR, l:0, mode: 0},
]

function init(system: System){
    system.dev.registerDevice({
        id: "⌨️",
        name: "serial",
        operations: {
            attach: async (options, system1) => {
                let c = mkchannel();
                c.map = {dirtab: rootdir};
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
    name: "serial",
    init: init,
    cleanup: cleanup
}

export default module;
