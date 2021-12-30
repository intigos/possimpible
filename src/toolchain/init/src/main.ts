import {FD_STDOUT} from "../../../public/api";
import {print} from "libts";

setTimeout(async () => {
    let syscall = self.proc.sys;

    print("\n\rPossimpible v0.1");
    while(true){
        const pid = await syscall.exec("/bin/login", [""]);

        let fd = await syscall.open("/proc/" + pid + "/run", 0);
        await syscall.read(fd, -1);
    }
},0);
