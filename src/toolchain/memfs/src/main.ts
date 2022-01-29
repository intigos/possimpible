import {CreateMode} from "../../../public/api";

setTimeout(async () => {
    let syscall = self.proc.sys;
    const path = self.proc.argv;
    const img = path[1];
    const name = path[2];
    const srvfd = await syscall.create(name, CreateMode.WRITE);

    const pipefd = await syscall.pipe();

    syscall.write(srvfd, new TextEncoder().encode("" + pipefd[0]));
    do{
        const r = await syscall.read(pipefd[1], -1);
        syscall.write(1, r);
        syscall.write(pipefd[1], r);
    }while (true)
},0);
