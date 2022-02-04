import {FD_STDOUT} from "../../../public/api";
import {print} from "libts";

export enum Colors {
    HEADER =  '\u001b[95m',
    BLUE =  '\u001b[94m',
    CYAN =  '\u001b[96m',
    GREEN =  '\u001b[92m',
    YELLOW =  '\u001b[93m',
    RED =  '\u001b[91m',
    ENDC =  '\u001b[0m',
    BOLD =  '\u001b[1m',
    UNDERLINE =  '\u001b[4m',
}

setTimeout(async () => {
    let syscall = self.proc.sys;

    print(`\n\r${Colors.RED}Possimpible${Colors.ENDC} v0.2`);

    while(true){
        const pid = await syscall.exec("/bin/login", [""]);

        let fd = await syscall.open("/proc/" + pid + "/run", 0);
        await syscall.read(fd, -1);
    }
},0);
