import {FD_STDIN, FD_STDOUT, Status} from "../../../public/api";

let syscall = self.proc.sys;
const te = new TextEncoder();
const td = new TextDecoder();

setTimeout(async () => {
    let fd = await self.proc.sys.open(self.proc.argv[1], 0);
    let char = td.decode(await self.proc.sys.read(fd, -1));
    self.proc.sys.write(FD_STDOUT, te.encode(char.replaceAll("\n", "\n\r")));
    await self.proc.sys.die(Status.OK)
}, 0)

