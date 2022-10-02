//import {IDynaLib, IPEXF} from "../src/shared/pexf";

import {generateDynaLib, generatePEXF} from "./pld";
import {
    mem_add_to_parent,
    mem_alloc_superblock, mem_data_alloc,
    mem_dirent_alloc, mem_inode_alloc,
    MemINodeType,
    IMemINode,
    IMemSuperNode
} from "../src/sys/memfs/low";

const fs = require("fs");

// load toolchain files

let rawdata = fs.readFileSync('config/toolchain.json');
let toolchainConfig = JSON.parse(rawdata.toString());

function getDependencies(art){
    if (fs.existsSync(`src/toolchain/${art}/deps.json`)) {
        let json = JSON.parse(fs.readFileSync(`src/toolchain/${art}/deps.json`).toString())
        return json.libraries;
    }else{
        return []
    }

}

function makeINode(data: number|number[], name:string,
                   parent: IMemINode|undefined, type: MemINodeType, sb: IMemSuperNode): IMemINode{

    let bn = mem_inode_alloc(type, sb, parent?.pos || null, data)
    let de = mem_dirent_alloc(name, bn,sb)

    if(parent)
        mem_add_to_parent(parent, de, sb);

    return bn;
}
function mkdatablock(dataspace: string[], data: string): number{
    return dataspace.push(data) - 1
}

let sb = mem_alloc_superblock()

let root = makeINode([], "", undefined, MemINodeType.DIRECTORY, sb)
let bin = makeINode([], "bin", root, MemINodeType.DIRECTORY, sb)
process.stdout.write("repack bins... \n");
for (let binname of toolchainConfig.execs){
    console.log(binname);
    fs.writeFileSync("dist/bin/" + binname + ".img", generatePEXF(binname, `dist/toolchain/js/${binname}.js`, getDependencies(binname)));
    if(binname in toolchainConfig.exclude){
        continue;
    }
    makeINode(mem_data_alloc(fs.readFileSync("dist/bin/" + binname), sb),
              binname, bin, MemINodeType.REGULAR, sb)
}
// let lib = makeINode([], "lib", root, MemINodeType.DIRECTORY, sb)
// process.stdout.write("repack libs... \n");
// for (let libname of toolchainConfig.libs){
//     console.log(libname);
//     makeINode(mem_data_alloc(generateDynaLib(libname, `dist/libs/js/${libname}.js`, getDependencies(libname)), sb),
//               libname + ".dyna", lib, MemINodeType.REGULAR, sb)
// }
process.stdout.write("building initrd... ");


const buf = JSON.stringify(sb);
fs.writeFile('dist/initrd.img', buf, (err) => {
    if (err) throw err;
    console.log(`size ${buf.length} done`);
    console.log(`inodes:${sb.nodes.length} dirents:${sb.dirents.length} data:${sb.data.length}`);
});


