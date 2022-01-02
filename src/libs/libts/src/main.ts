import {FD_STDIN, FD_STDOUT, OpenOptions} from "../../../public/api";
import {PError, Status} from "../../../public/status";

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

export async function exit(code: Status){
    await self.proc.sys.die(code);
}

export async function entrypoint(entrypoint: (argv: string[]) => Promise<number>){
    setTimeout(async () => {
        try{
            const exit = await entrypoint(self.proc.argv);
        }catch (e) {
            if (e instanceof PError){
                self.proc.sys.die(e.code);
            }else{
                self.proc.sys.die(-1);
            }
        }finally {
            self.proc.sys.die(0);
        }
    }, 0)
}

export async function slurp(path: string): Promise<string>{
    let fd = await self.proc.sys.open(path, OpenOptions.READ);
    let content =  await self.proc.sys.read(fd, -1);
    await self.proc.sys.close(fd);
    return content
}
