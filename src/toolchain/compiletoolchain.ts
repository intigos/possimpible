import {exec} from "child_process";

exec("npx asc src/toolchain/boot/src/main.ts --outFile dist/bin/boot.wasm", (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
});
