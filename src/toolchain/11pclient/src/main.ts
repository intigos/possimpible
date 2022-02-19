import {OMode, Perm, PError, Status} from "../../../public/api";

export async function dial(addr: string): Promise<number> {
    const [protocol, rest] = addr.split("://");
    switch (protocol){
        case "ws":
            const clonefd = await self.proc.sys.open("/net/ws/clone", OMode.READ);
            const path = new TextDecoder().decode(await self.proc.sys.read(clonefd, -1));
            await self.proc.sys.close(clonefd);

            const ctrlfd = await self.proc.sys.open("/net/ws/" + path + "/ctrl", OMode.WRITE);
            await self.proc.sys.write(ctrlfd, new TextEncoder().encode("mode binary"));
            await self.proc.sys.write(ctrlfd, new TextEncoder().encode("connect " + rest));
            await self.proc.sys.close(ctrlfd);

            return await self.proc.sys.open("/net/ws/" + path + "/data", OMode.RDWR);
    }
    throw new PError(Status.EPROTO);
}

async function main(args: string[]): Promise<number> {
    let syscall = self.proc.sys;
    const path = self.proc.argv;
    const url = path[1];
    const name = path[2];
    const fd = await dial(url);

    const srvfd = await self.proc.sys.create(name, OMode.WRITE, Perm.WRITE | Perm.READ | Perm.EXCL);

    await syscall.write(srvfd, new TextEncoder().encode("" + fd));
    return 0;
}

self.proc.entrypoint(main);
