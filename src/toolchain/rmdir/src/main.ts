
async function main(argv: string[]): Promise<number>{
    await self.proc.sys.remove(argv[1]);

    return 0;
}

self.proc.entrypoint(main);
