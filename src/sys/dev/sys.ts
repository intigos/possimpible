import {ISystemModule} from "../modules";
import {System} from "../system";
import {getstat, IDirtab, mkdirtabA, read, walk} from "../dirtab";
import {Type} from "../../public/api";

function init(system: System){
    const rootdir = (): IDirtab[] => {
        const d:IDirtab[] = [];
        d.push({name: "modules", id:1, type:Type.DIR, l:0, mode: 0, uid: system.sysUser, dirtab:():IDirtab[] => {
            const lst:IDirtab[] = Array.from(system.mod.modules.map(x => {
                return {name: x.module.name, id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser}
            }));

            lst.push(
                {name: "ctrl", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                      write:async (c, buf, offset) => {
                          const module = eval(system.decoder.decode(buf));
                          await system.mod.installModule(module);
                      }
                });
            return lst;
        }
        })

        d.push({name: "boot", id:1, type:Type.DIR, l:0, mode: 0, uid: system.sysUser, dirtab:():IDirtab[] => {
                const d:IDirtab[] = [
                    {name: "time", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                        read:async (c, count, offset) => {
                            return system.encoder.encode("" + system.boottime);
                        }
                    },
                    {name: "params", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                        read:async (c, count, offset) => {
                            return system.encoder.encode(JSON.stringify(system.options));
                        }
                    }
                ];
                return d;
            }
        });

        d.push({name: "device", id:1, type:Type.DIR, l:0, mode: 0, uid: system.sysUser, dirtab:():IDirtab[] => {
                let d:IDirtab[] = [];

                for (const dev of system.descriptions!) {
                    d.push({name: dev.id, id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser});
                }
                return d;
            }
        })
        return d;
    }

    system.dev.registerDevice({
        id: "y",
        name: "sys",
        operations: {
            attach: async (options, system1) => {
                const c = system.channels.mkchannel();
                c.srv = "y";
                c.map = mkdirtabA(rootdir, system1);
                c.type = Type.DIR;
                c.operations = {
                    read: read,
                    walk: walk,
                    getstat:getstat
                }
                return c;
            }
        }
    });
}

function cleanup(){

}

const module: ISystemModule = {
    name: "sys",
    init: init,
    cleanup: cleanup
}

export default module;
