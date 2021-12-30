import {FD_STDIN, FD_STDOUT} from "../../../public/api";
import stringToArgv from "string-to-argv";
import {wait, exit as die, print} from "libts";

let syscall = self.proc.sys;

setTimeout(async () => {
    let cwd = await syscall.getcwd();
    const exit = false;
    let buf = "";
    print("psh \n\r\n\r")
    print(cwd + " $ ")
    while (!exit) {
        let char = await self.proc.sys.read(FD_STDIN, 1);
        if(char.charCodeAt(0) == 127){
            print("\b \b")
            buf = buf.slice(0, -1);
            continue;
        }else{
            print(char);
        }

        if(char != "\r"){
            buf += char;
        }else{
            print("\n\r")
            const argv = stringToArgv(buf);
            let cmd = argv[0];
            if(cmd == "ls") {
                let path = cwd;
                if (argv.length > 1) {
                    path = argv[1];
                }
                let fd = await self.proc.sys.open(path, 0);
                let dirents = await self.proc.sys.getdents(fd, -1)
                for (let x of dirents) {
                    print(x.name + "\n\r")
                }
            }else if(cmd == "exit"){
                await die(1);
            }else if(cmd == "cd"){
                let path = argv[1];
                await self.proc.sys.chcwd(path);
            }else if(buf.trim() != ""){
                if(!cmd.startsWith("/")){
                    cmd = "/bin/" + cmd;
                }
                let pid = await syscall.exec(cmd, argv.slice(1));
                await wait(pid)
            }
            buf = "";
            cwd = await syscall.getcwd();
            print(cwd + " $ ")
        }
    }
}, 0)

