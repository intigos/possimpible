//import {IDynaLib, IPEXF} from "../src/shared/pexf";

const fs = require("fs");

// load toolchain files

let rawdata = fs.readFileSync('config/toolchain.json');
let toolchainConfig = JSON.parse(rawdata.toString());
process.stdout.write("repack PEXFs... \n");
function getDependencies(art){
    if (fs.existsSync(`src/toolchain/${art}/deps.json`)) {
        let json = JSON.parse(fs.readFileSync(`src/toolchain/${art}/deps.json`).toString())
        return json.libraries;
    }else{
        return []
    }

}
function generatePEXF(bin: string){
    process.stdout.write("  " + bin + "\n");
    let content = fs.readFileSync(`dist/toolchain/js/${bin}.js`).toString()
    let pexfstruct = {
        name: bin,
        dependencies: getDependencies(bin),
        code: content
    }

    return "PEXF:" + JSON.stringify(pexfstruct);
}
let execs = toolchainConfig.execs.map(x => {
    return {
        name: x,
        content: generatePEXF(x)
    }
})
process.stdout.write("repack dynalib... \n");
function generateDynaLib(library:string){
    process.stdout.write("  " + library + "\n");
    let content = fs.readFileSync(`dist/toolchain/js/${library}.js`).toString()
    let pexfstruct = {
        name: library,
        dependencies: getDependencies(library),
        code: content
    }

    return "dynalib:" + JSON.stringify(pexfstruct);
}
let libs = toolchainConfig.libs.map(x => {
    return {
        name: x + ".dyna",
        content: generateDynaLib(x)
    }
})
const result = {
    files: [
        {
            name:"bin",
            files: execs
        },
        {
            name:"lib",
            files: libs
        },
        {
            name:"dev",
            files:[]
        },
        {
            name:"proc",
            files:[]
        }
    ]
}
process.stdout.write("building initrd... ");
const buf = JSON.stringify(result);
fs.writeFile('dist/initrd.img', buf, (err) => {
    if (err) throw err;
    console.log(`size ${buf.length} done`);
});


