import {generatePEXF} from "./pld";

const fs = require("fs");

for (let binname of ["11pclient", "boot", "memfs"]){
    fs.writeFileSync("dist/bin/" + binname + ".img", generatePEXF(binname, `dist/bin/js/${binname}.js`, []));
}
