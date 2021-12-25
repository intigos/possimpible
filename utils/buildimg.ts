const fs = require("fs");

// load toolchain files
console.log("building initrd");
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
        }
    ]
}

fs.writeFile('dist/initrd.img', JSON.stringify(result), (err) => {
    if (err) throw err;
    console.log('done');
});


