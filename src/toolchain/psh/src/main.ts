import {FD_STDIN, FD_STDOUT, PError, Status} from "../../../public/api";
import stringToArgv from "string-to-argv";
import {wait, exit as die, print} from "libts";

let syscall = self.proc.sys;

const te = new TextEncoder();
const td = new TextDecoder()
setTimeout(async () => {
    let cwd = await syscall.getcwd();
    const exit = false;
    let buf = "";
    print("psh \n\r\n\r")
    print(cwd + " $ ")
    while (!exit) {
        let char = td.decode(await self.proc.sys.read(FD_STDIN, 1));
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
                let dirents = td.decode(await self.proc.sys.read(fd, -1))
                for (let x of dirents.split("\n")) {
                    print(x + "\n\r")
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
                try{
                    let pid = await syscall.exec(cmd, argv.slice(1));
                    await wait(pid)
                }catch (e) {
                    let msg;
                    const code =(e as PError).code;
                    switch(code){
                        case Status.ENOENT:
                            msg = cmd + ": command not found"
                            break
                        default:
                            msg = cmd + ": unkown error " + code;
                    }
                    print("psh: " + msg + "\n");
                }
            }
            buf = "";
            cwd = await syscall.getcwd();
            print(cwd + " $ ")
        }
    }
}, 0)

