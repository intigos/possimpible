import {MountType, OpenMode} from "../../../public/api";

async function main (args: string[]){
    let syscall = self.proc.sys;
    const te = new TextEncoder();

    const options = new Map<string, string>();
    args.slice(1).forEach(x =>{
        const [key, value] = x.split("=");
        options.set(key, value);
    })

    await syscall.bind("#c", "/dev");
    await syscall.bind("#b", "/dev");
    await syscall.bind("#s", "/srv");
    await syscall.bind("#e", "/env");
    await syscall.bind("#⌨️", "/dev");

    await syscall.bind("/dev/serial", "/dev/cons");
    await syscall.bind("/dev/serial", "/dev/scancode");

    await syscall.open("/dev/scancode", 0);
    await syscall.open("/dev/cons", 0);
    await syscall.open("/dev/cons", 0);


    syscall.write(0, te.encode("Booting System...\n\rCommand line: "));
    for(const x of options.keys()){
        syscall.write(0, te.encode(x + "=" + options.get(x) + " "));
    }
    syscall.write(0, te.encode("\n\r\n\r"));


    await syscall.write(0, te.encode("mounting root\n\r"));
    await syscall.fork("/boot/memfs", ["#💾/initrd0", "/srv/initrd"], 0);

    setTimeout(async x => {
        const fd = await syscall.open("/srv/initrd", OpenMode.RDWR)
        await syscall.mount(fd, null, "/root", MountType.REPL);
        await syscall.bind("/root/bin", "/bin");
        await syscall.bind("/root/lib", "/lib");
        await syscall.exec("/bin/login", []);
    }, 1000);
}

self.proc.entrypoint(main);