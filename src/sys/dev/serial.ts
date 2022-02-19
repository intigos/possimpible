import {ISystemModule} from "../modules";
import {System} from "../system";
import {getstat, IDirtab, mkdirtabA, read, walk} from "../dirtab";
import {IChannel} from "../vfs/channel";
import {Type} from "../../public/api";

function init(system: System){
    system.dev.registerDriver({
        probe: async (x, match) => {
            const rootdir: IDirtab[] = [
                {
                    name: "serial", id:1, type:Type.DIR, l:0, mode: 0, uid: system.sysUser, dirtab: [
                        {name: "data", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                            write: async (file, buf, offset) => {
                                return (x as any).properties.write(buf);
                            },
                            read: async (c: IChannel, count: number, offset: number) => {
                                const buf = await (x as any).properties.read();
                                return new TextEncoder().encode(buf);
                            }
                        },
                        {name: "ctrl", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                            write: async (file, buf, offset) => {
                                switch (new TextDecoder().decode(buf)){
                                    case "hide":
                                        (x as any).properties.visibility(false);
                                        break;
                                    case "show":
                                        (x as any).properties.visibility(true);
                                        break;
                                }
                            }
                        },
                    ]

                }
            ]

            system.dev.registerDevice({
                id: "⌨️",
                name: "serial",
                operations: {
                    attach: async (options, system1) => {
                        const c = system.channels.mkchannel();
                        c.srv = "⌨️";
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
