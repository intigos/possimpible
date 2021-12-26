const fs = require("fs");

// load toolchain files
process.stdout.write("building initrd... ");
let rawdata = fs.readFileSync('config/toolchain.json');
let toolchainConfig = JSON.parse(rawdata.toString());

let files = toolchainConfig.execs.map(x => {
    return {
        name: x,
        content: fs.readFileSync(`dist/toolchain/js/${x}.js`).toString()
    }
})

const result = {
    files: [
        {
            name:"bin",
            files: files
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
const buf = JSON.stringify(result);
fs.writeFile('dist/initrd.img', buf, (err) => {
    if (err) throw err;
    console.log(`size ${buf.length} done`);
});


