import {ISystemModule} from "../modules";
import {System} from "../system";
import {getstat, IDirtab, mkdirtabA, read, walk} from "../dirtab";
import {Type} from "../../public/api";
import { init as i, classModule, styleModule } from "snabbdom";

const patch = i([classModule, styleModule]);

function init(system: System){
    system.dev.registerDriver({
        probe: async (x, match) => {
            const rootdir: IDirtab[] = [
                {
                    name: "dom", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                    write: async (file, buf, offset) => {
                        const dom = (x as any).root as HTMLElement
                        const change = JSON.parse(system.decoder.decode(buf));
                        patch(dom, change);
                    }
                },
                {
                    name: "mouse", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                    write: async (file, buf, offset) => {
                        return (x as any).properties.write(new TextDecoder().decode(buf));
                    }
                },
                {
                    name: "style", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
                    write: async (file, buf, offset) => {
                        const style = (x as any).dom as Text;
                        style.textContent = new TextDecoder().decode(buf);
                    }
                }
            ]

            system.dev.registerDevice({
                id: "^",
                name: "browser",
                operations: {
                    attach: async (options, system1) => {
                        const c = system.channels.mkchannel();
                        c.srv = "^";
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
            name: "browser",
            matchTable: [{compatible: "display:browser", data: null}]
        }
    })
}

function cleanup(){

}

const module: ISystemModule = {
    name: "browser",
    init: init,
    cleanup: cleanup
}

export default module;
