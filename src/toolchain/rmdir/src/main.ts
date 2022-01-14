import {FD_STDIN, FD_STDOUT, OpenOptions} from "../../../public/api";
import {entrypoint, print, readline, wait} from "libts";
import {Status} from "../../../public/status";

async function main(argv: string[]): Promise<number>{
    await self.proc.sys.rmdir(argv[1]);

    return 0;
}

entrypoint(main);
