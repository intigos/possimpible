import {ISystemModule} from "../modules";
import {System} from "../system";
import {getstat, IDirtab, read, walk} from "../dirtab";
import {Type} from "../../public/api";

function init(system: System){
    const rootdir: IDirtab[] = [
        {name: "dev", id:1, type:Type.DIR, l:0, mode: 0, uid: system.sysUser,},
        {name: "vfs", id:1, type:Type.DIR, l:0, mode: 0, uid: system.sysUser,},
        {name: "mod", id:1, type:Type.DIR, l:0, mode: 0, uid: system.sysUser,},
        {name: "options", id:1, type:Type.DIR, l:0, mode: 0,  uid: system.sysUser,},
    ]

    system.dev.registerDevice({
        id: "⌨️",
        name: "serial",
        operations: {
            attach: async (options, system1) => {
                let c = system.channels.mkchannel();
                c.srv = "⌨️";
                c.map = {dirtab: rootdir};
                c.type = Type.DIR;
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
    name: "serial",
    init: init,
    cleanup: cleanup
}

export default module;
