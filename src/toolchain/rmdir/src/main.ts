import {FD_STDIN, FD_STDOUT, OpenOptions} from "../../../public/api";
import {print, readline, wait} from "libts";
import {Status} from "../../../public/status";

setTimeout(async () => {
    let syscall = self.proc.sys;
    const exit = false;
    print("\n\r\n\rlogin: ");
    while (!exit) {
        let buf = await readline()

        self.proc.sys.write(FD_STDOUT, "\n\r");
        if (buf == "barney") {
            const pid = await syscall.exec("/bin/psh", [""]);

            await wait(pid);
        }

        await self.proc.sys.die(Status.OK);
    }
}, 0);
