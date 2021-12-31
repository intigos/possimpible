import {FD_STDIN, FD_STDOUT, OpenOptions} from "../../../public/api";

export function print(s: string){
    self.proc.sys.write(FD_STDOUT, s.replaceAll("\n","\n\r"));
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

export async function entrypoint(entrypoint: (argv: string[]) => Promise<number>){
    setTimeout(async () => {
        const exit = await entrypoint(self.proc.argv);
        self.proc.sys.die();
    }, 0)
}

export async function slurp(path: string): Promise<string>{
    let fd = await self.proc.sys.open(path, OpenOptions.READ);
    let content =  await self.proc.sys.read(fd, -1);
    await self.proc.sys.close(fd);
    return content
}
