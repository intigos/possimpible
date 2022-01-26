import {FD_STDIN, FD_STDOUT, Status} from "../../../public/api";
import {entrypoint, print, readline, wait} from "libts";

async function main(argv: string[]): Promise<number>{
    await self.proc.sys.remove(argv[1]);

    return 0;
}

entrypoint(main);
