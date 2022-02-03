/**
 * `libts` is the standard library to write TypeScript in Possimpable
 *
 * It provides functions to simplify the usage of the system underlying system calls.
 *
 * @module libts
 */

import {FD_STDIN, FD_STDOUT, OpenMode, PError, Status} from "../../../public/api";


const te = new TextEncoder()
const td = new TextDecoder();

/**
 * Sends a string to {@link FD_STDIN}
 *
 * @param s  String to print
 */
export function print(s: string){
    self.proc.sys.write(FD_STDOUT, te.encode(s.replaceAll("\n","\n\r")));
}

/**
 * Waits for process with `pid` to finish
 *
 * @param pid  Process to wait
 */
export async function wait(pid: number) {
    let fd = await self.proc.sys.open("/proc/" + pid + "/run", 0);
    await self.proc.sys.read(fd, -1);
}

/**
 * Reads a line until `\n` is sent
 *
 * @return the string
 */
export async function readline() : Promise<string>{
    let char, buf = "";
    while(true){
        char = td.decode(await self.proc.sys.read(FD_STDIN, 1));
        if (char.charCodeAt(0) == 127) {
            self.proc.sys.write(FD_STDOUT, te.encode("\b \b"));
            buf = buf.slice(0, -1);

        } else {
            self.proc.sys.write(FD_STDOUT, te.encode(char));
        }

        if(char != "\r"){
            buf += char;
        }else {
            self.proc.sys.write(FD_STDOUT, te.encode("\n\r"));
            return buf;
        }
    }
}

/**
 * Ends the execution for this process
 *
 * @param code a {@link Status}
 */
export async function exit(code: Status){
    await self.proc.sys.die(code);
}

/**
 * Consumes the file into a string
 *
 * @param path path to file
 * @return file contents
 */
export async function slurp(path: string): Promise<string>{
    let fd = await self.proc.sys.open(path, OpenMode.READ);
    let content =  await self.proc.sys.read(fd, -1);
    await self.proc.sys.close(fd);
    return td.decode(content);
}
