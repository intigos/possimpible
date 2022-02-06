import {ISystemModule} from "../modules";
import {System} from "../system";
import {getstat, IDirtab, mkdirtabA, read, walk} from "../dirtab";
import {Type} from "../../public/api";

function init(system: System){
    system.dev.registerDriver({
        probe: async (x, match) => {
            const rootdir: IDirtab[] = [
                {
                    name: "console", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                    write: async (file, buf, offset) => {
                        return (x as any).properties.write(new TextDecoder().decode(buf));
                    }
                }
            ]

            system.dev.registerDevice({
                id: "🐛️",
                name: "console",
                operations: {
                    attach: async (options, system1) => {
                        const c = system.channels.mkchannel();
                        c.srv = "🐛️";
                        c.map = mkdirtabA(rootdir, system1);
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
        },
        remove: (x) => {},
        driver:{
            name: "console",
            matchTable: [{compatible: "display:console", data: null}]
        }
    })
}

function cleanup(){

}

const module: ISystemModule = {
    name: "console",
    init: init,
    cleanup: cleanup
}

export default module;
