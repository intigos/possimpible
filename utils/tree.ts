
import {BlobDirEnt_ptr, BlobINodeType, IBlobINode} from "../src/kernel/fs/blobfs/structs";
import fs from "fs";

console.log("dumping " + process.argv[2])
let sb = JSON.parse(fs.readFileSync(process.argv[2]).toString())
console.log("/");
function dumpnode(x: IBlobINode, depth){
    if(x.type == BlobINodeType.DIRECTORY){
        process.stdout.write(" /\n");
        dumpdir(x, depth + 1);
    }else if(x.type == BlobINodeType.REGULAR){
        process.stdout.write(" size:" + sb.data[x.map as number].length + " dataptr:" + x.map + "\n")
    }else{
        process.stdout.write(" (L) size:" + sb.data[x.map as number].length + " dataptr:" + x.map + "\n")
    }
}
function dumpdir(x: IBlobINode, depth: number){
    for(let i of x.map as BlobDirEnt_ptr[]){
        process.stdout.write("  ".repeat(depth))
        process.stdout.write("- " + sb.dirents[i].name + " inodeptr:" + i)
        dumpnode(sb.nodes[sb.dirents[i].node], depth);
    }
}
dumpdir(sb.nodes[0], 1)
