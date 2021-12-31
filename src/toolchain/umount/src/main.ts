import {FD_STDOUT} from "../../../public/api";
import {entrypoint, print, slurp} from "libts";

async function main(argv: string[]): Promise<number>{
    await self.proc.sys.unmount(argv[1]);

    return 0;
}

entrypoint(main);
