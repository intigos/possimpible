import {System} from "../system";
import {mkchannel} from "../vfs/channel";
import {ISystemModule} from "../modules";
// @ts-ignore
import bootbin from "&/bin/boot.img";
// @ts-ignore
import memfs from "&/bin/memfs.img";
import {IDirtab, mkdirtab, read, walk} from "../dirtab";
import {Type} from "../../public/api";

const bootdir: IDirtab[] = [
    {name: "boot", id:1, type:Type.FILE, l:0, mode: 0,
     read: async (c, count, offset) => {
        return new Uint8Array(await (await (await fetch(bootbin)).blob()).arrayBuffer());
     }},
    {name: "memfs", id:1, type:Type.FILE, l:0, mode: 0,
     read: async (c, count, offset) => {
        return new Uint8Array(await (await (await fetch(memfs)).blob()).arrayBuffer());
    }},
];

const rootdir: IDirtab[] = [
    {name: "dev", id:1, type:Type.DIR, l:0, mode: 0},
    {name: "env", id:1, type:Type.DIR, l:0, mode: 0},
    {name: "fd", id:1, type:Type.DIR, l:0, mode: 0},
    {name: "mnt", id:1, type:Type.DIR, l:0, mode: 0},
    {name: "net", id:1, type:Type.DIR, l:0, mode: 0},
    {name: "proc", id:1, type:Type.DIR, l:0, mode: 0},
    {name: "root", id:1, type:Type.DIR, l:0, mode: 0},
    {name: "srv", id:1, type:Type.DIR, l:0, mode: 0},
    {name: "boot", id:1, type:Type.DIR, l:0, mode: 0, dirtab: bootdir},
]

async function init(system: System) {
    system.dev.registerDevice({
        id: "/",
        name: "root",
        operations: {
            attach: async (options, kernel) => {
                let c = mkchannel();
                c.type = Type.DIR;
                c.map = mkdirtab(rootdir);
                c.operations = {
                    walk: walk,
                    read: read,
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
