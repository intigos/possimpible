import {FD_STDIN, FD_STDOUT} from "../../../public/api";

export function print(s: string){
    self.proc.sys.write(FD_STDOUT, s);
}

export async function wait(pid: number) {
    let fd = await self.proc.sys.open("/proc/" + pid + "/run", 0);
    await self.proc.sys.read(fd, -1);
}

export async function readline() : Promise<string>{
    let char, buf = "";
    while(true){
        char = await self.proc.sys.read(FD_STDIN, 1);
        if (char.charCodeAt(0) == 127) {
            self.proc.sys.write(FD_STDOUT, "\b \b");
            buf = buf.slice(0, -1);

        } else {
            self.proc.sys.write(FD_STDOUT, char);
        }

        if(char != "\r"){
            buf += char;
        }else {
            self.proc.sys.write(FD_STDOUT, "\n\r");
            return buf;
        }
    }
}

export async function exit(code: number){
    await self.proc.sys.die();
}
