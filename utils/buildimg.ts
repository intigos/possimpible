//import {IDynaLib, IPEXF} from "../src/shared/pexf";

import {generateDynaLib, generatePEXF} from "./pld";
import {
    blob_add_to_parent,
    blob_alloc_superblock, blob_data_alloc,
    blob_dirent_alloc, blob_inode_alloc,
    BlobINodeType,
    IBlobINode,
    IBlobSuperNode
} from "../src/kernel/fs/blobfs/structs";

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
                   parent: IBlobINode|undefined, type: BlobINodeType, sb: IBlobSuperNode): IBlobINode{

    let bn = blob_inode_alloc(type, sb, data)
    let de = blob_dirent_alloc(name, bn,sb)

    if(parent)
        blob_add_to_parent(parent, de, sb);

    return bn;
}
function mkdatablock(dataspace: string[], data: string): number{
    return dataspace.push(data) - 1
}

let sb = blob_alloc_superblock()

let root = makeINode([], "", undefined, BlobINodeType.DIRECTORY, sb)
let bin = makeINode([], "bin", root, BlobINodeType.DIRECTORY, sb)
process.stdout.write("repack bins... \n");
for (let binname of toolchainConfig.execs){
    console.log(binname);
    makeINode(blob_data_alloc(generatePEXF(binname, `dist/toolchain/js/${binname}.js`, getDependencies(binname)), sb),
              binname, bin, BlobINodeType.REGULAR, sb)
}
let lib = makeINode([], "lib", root, BlobINodeType.DIRECTORY, sb)
process.stdout.write("repack libs... \n");
for (let libname of toolchainConfig.libs){
    console.log(libname);
    makeINode(blob_data_alloc(generateDynaLib(libname, `dist/libs/js/${libname}.js`, getDependencies(libname)), sb),
              libname + ".dyna", lib, BlobINodeType.REGULAR, sb)
}

let dev = makeINode([], "dev", root, BlobINodeType.DIRECTORY, sb)
let proc = makeINode([], "proc", root, BlobINodeType.DIRECTORY, sb)
process.stdout.write("building initrd... ");


const buf = JSON.stringify(sb);
fs.writeFile('dist/initrd.img', buf, (err) => {
    if (err) throw err;
    console.log(`size ${buf.length} done`);
    console.log(`inodes:${sb.nodes.length} dirents:${sb.dirents.length} data:${sb.data.length}`);
});


