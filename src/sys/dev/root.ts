import {System} from "../system";
import {ISystemModule} from "../modules";
// @ts-ignore
import bootbin from "&/bin/boot.img";
// @ts-ignore
import memfs from "&/bin/memfs.img";
// @ts-ignore
import pclient from "&/bin/11pclient.img";
import {create, getstat, IDirtab, mkdirtabA, read, walk} from "../dirtab";
import {Type} from "../../public/api";

async function init(system: System) {
    const bootdir: IDirtab[] = [
        {name: "boot", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
            read: async (c, count, offset) => {
                return new Uint8Array(await (await (await fetch(bootbin)).blob()).arrayBuffer());
            }},
        {name: "memfs", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
            read: async (c, count, offset) => {
                return new Uint8Array(await (await (await fetch(memfs)).blob()).arrayBuffer());
            }},
        {name: "11pclient", id:1, type:Type.FILE, l:0, mode: 0, uid: system.sysUser,
            read: async (c, count, offset) => {
                return new Uint8Array(await (await (await fetch(pclient)).blob()).arrayBuffer());
            }},
    ];

    const rootdir: IDirtab[] = [
        {name: "dev", id:1, type:Type.DIR, l:0, mode:0, create: create},
        {name: "env", id:1, type:Type.DIR, l:0, mode:0, create: create},
        {name: "fd", id:1, type:Type.DIR, l:0, mode:0, create: create},
        {name: "mnt", id:1, type:Type.DIR, l:0, mode:0, create: create},
        {name: "net", id:1, type:Type.DIR, l:0, mode:0, create: create},
        {name: "proc", id:1, type:Type.DIR, l:0, mode:0, create: create},
        {name: "root", id:1, type:Type.DIR, l:0, mode:0, create: create},
        {name: "srv", id:1, type:Type.DIR, l:0, mode:0, create: create},
        {name: "sys", id:1, type:Type.DIR, l:0, mode:0, create: create},
        {name: "boot", id:1, type:Type.DIR, l:0, mode:0, create: create, dirtab: bootdir},
    ]

    system.dev.registerDevice({
        id: "/",
        name: "root",

        operations: {
            attach: async (options, kernel) => {
                const c = system.channels.mkchannel();
                c.srv = "/";
                c.type = Type.DIR;
                c.map = mkdirtabA(rootdir, kernel);
                c.map.uid = system.sysUser;
                c.map.atime = system.boottime;
                c.operations = {
                    walk: walk,
                    read: read,
                    create: create,
                    getstat: getstat
                }
                return c;
            },
        }
    });
}

function cleanup(){

}

const module: ISystemModule = {
    name: "root",
    init: init,
    cleanup: cleanup
}
export default module;
