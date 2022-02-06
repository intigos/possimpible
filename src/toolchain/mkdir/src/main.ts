import {OMode, Perm} from "../../../public/api";

async function main(argv: string[]): Promise<number>{
    await self.proc.sys.create(argv[1], OMode.RDWR, Perm.DIR);

    return 0;
}

self.proc.entrypoint(main);
