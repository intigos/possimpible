import {ISystemModule} from "../modules";
import {System} from "../system";
import {IDirtab, mkdirtab, read, walk} from "../dirtab";
import {mkchannel} from "../vfs/channel";
import {Type} from "../../public/api";

function init(system: System){
    system.dev.registerDriver({
        probe: async (x, match) => {
            const rootdir: IDirtab[] = [
                {
                    name: "serial", id:1, type:Type.FILE, l:0, mode: 0,
                    write: async (file, buf, offset) => {
                        return (x as any).properties.write(buf);
                    },
                    read: async (file, buf) => {
                        return (x as any).properties.write(buf);
                    },
                }
            ]

            system.dev.registerDevice({
                id: "⌨️",
                name: "serial",
                operations: {
                    attach: async (options, system1) => {
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
        },
        remove: (x) => {},
        driver:{
            name: "serial",
            matchTable: [{compatible: "serial:terminal", data: null}]
        }
    })
}

function cleanup(){

}

const module: ISystemModule = {
    name: "serial",
    init: init,
    cleanup: cleanup
}

export default module;
