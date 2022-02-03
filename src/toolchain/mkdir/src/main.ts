import {CreateMode} from "../../../public/api";

async function main(argv: string[]): Promise<number>{
    await self.proc.sys.create(argv[1], CreateMode.DIR);

    return 0;
}

self.proc.entrypoint(main);
