import {ISystemModule} from "../modules";
import {System} from "../system";
import {IDirtab, mkdirtab, read, walk} from "../dirtab";
import {mkchannel} from "../vfs/channel";
import {Type} from "../../public/api";

const rootdir: IDirtab[] = []

function init(system: System){
    system.dev.registerDriver({
        probe: async (x, match) => {
            rootdir.push({
                name: x.id, id:1, type:Type.FILE, l:0, mode: 0,
                read: async (file, buf) => {
                    return (x as any).properties.image
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
        id: "💾",
        name: "image",
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
}

function cleanup(){

}

const module: ISystemModule = {
    name: "image",
    init: init,
    cleanup: cleanup
}

export default module;
