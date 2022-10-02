import {System} from "../system";
import {ISystemModule} from "../modules";
// @ts-ignore
import bootbin from "&/bin/boot.wasm";
// @ts-ignore
import memfs from "&/bin/memfs.img";
import {getstat, IDirtab, mkdirtabA, read, walk} from "../dirtab";
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
    ];

    const rootdir: IDirtab[] = [
        {name: "dev", id:1, type:Type.DIR, l:0, mode: 0, atime: system.boottime, uid: system.sysUser},
        {name: "env", id:1, type:Type.DIR, l:0, mode: 0, atime: system.boottime, uid: system.sysUser},
        {name: "fd", id:1, type:Type.DIR, l:0, mode: 0, atime: system.boottime, uid: system.sysUser},
        {name: "mnt", id:1, type:Type.DIR, l:0, mode: 0, atime: system.boottime, uid: system.sysUser},
        {name: "net", id:1, type:Type.DIR, l:0, mode: 0, atime: system.boottime, uid: system.sysUser},
        {name: "proc", id:1, type:Type.DIR, l:0, mode: 0, atime: system.boottime, uid: system.sysUser},
        {name: "root", id:1, type:Type.DIR, l:0, mode: 0, atime: system.boottime, uid: system.sysUser},
        {name: "srv", id:1, type:Type.DIR, l:0, mode: 0, atime: system.boottime, uid: system.sysUser},
        {name: "boot", id:1, type:Type.DIR, l:0, mode: 0, atime: system.boottime, uid: system.sysUser, dirtab: bootdir},

        // TODO: Check if this below is really needed
        {name: "bin", id:1, type:Type.DIR, l:0, mode: 0, atime: system.boottime, uid: system.sysUser},
        {name: "lib", id:1, type:Type.DIR, l:0, mode: 0, atime: system.boottime, uid: system.sysUser},
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
    name: "rootfs",
    init: init,
    cleanup: cleanup
}
export default module;
