import {FD_STDIN, FD_STDOUT} from "../../../public/api";
import stringToArgv from "string-to-argv";

let syscall = self.proc.sys;
console.log("in");
setTimeout(async () => {
    let cwd = await syscall.getcwd();
    const exit = false;
    let buf = "";
    syscall.write(FD_STDOUT, "psh \n\r\n\r");
    syscall.write(FD_STDOUT, cwd + " $ ");
    while (!exit) {
        let char = await self.proc.sys.read(FD_STDIN, 1);
        if(char.charCodeAt(0) == 127){
            self.proc.sys.write(FD_STDOUT, "\b \b");
            buf = buf.slice(0, -1);
            continue;
        }else{
            self.proc.sys.write(FD_STDOUT, char);
        }

        if(char != "\r"){
            buf += char;
        }else{
            self.proc.sys.write(FD_STDOUT, "\n\r");
            const argv = stringToArgv(buf);
            let cmd = argv[0];
            if(cmd == "ls"){
                let path = cwd;
                if(argv.length > 1){
                    path = argv[1];
                }
                let fd = await self.proc.sys.open(path, 0);
                let dirents = await self.proc.sys.getdents(fd, -1)
                for(let x of dirents){
                    syscall.write(FD_STDOUT, x.name + "\n\r");
                }
            }else if(cmd == "cd"){
                let path = argv[1];
                await self.proc.sys.chcwd(path);
            }else if(buf.trim() != ""){
                if(!cmd.startsWith("/")){
                    cmd = "/bin/" + cmd;
                }
                let pid = await syscall.exec(cmd, argv.slice(1));
                let fd = await self.proc.sys.open("/proc/" + pid + "/run", 0);
                await self.proc.sys.read(fd, -1);
            }
            buf = "";
            cwd = await syscall.getcwd();
            syscall.write(FD_STDOUT, cwd + " $ ");
        }
    }
}, 0)

