import {FD_STDIN, FD_STDOUT} from "../../../public/api";
import {print, readline, wait} from "libts";

setTimeout(async () => {
    let syscall = self.proc.sys;
    const exit = false;
    print("\n\r\n\rlogin: ");
    while (!exit) {
        let buf = await readline()

        self.proc.sys.write(FD_STDOUT, new TextEncoder().encode("\n\r"));
        if (buf == "barney") {
            const pid = await syscall.exec("/bin/psh", [""]);

            await wait(pid);
        }

        await self.proc.sys.die(-1);
    }
}, 0);
