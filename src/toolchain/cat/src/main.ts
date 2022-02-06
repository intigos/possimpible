import {FD_STDOUT, OMode, Status} from "../../../public/api";

let syscall = self.proc.sys;
const te = new TextEncoder();
const td = new TextDecoder();

async function main(argv: string[]): Promise<number> {
    let fd = await self.proc.sys.open(self.proc.argv[1], OMode.READ);
    let char = td.decode(await self.proc.sys.read(fd, -1));
    self.proc.sys.write(0, te.encode(char.replaceAll("\n", "\n\r")));
    return 0;
}

self.proc.entrypoint(main)

