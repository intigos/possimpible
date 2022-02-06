import {MType, OMode} from "../../../public/api";
import {yellow} from "../../../sys/colors";
import sys from "../../../sys/dev/sys";

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
    await syscall.bind("#🐛️", "/dev");

    await syscall.bind("#w", "/net/ws", MType.CREATE);

    await syscall.bind(options.get("serial")!, "/dev/cons");
    await syscall.bind(options.get("serial")!, "/dev/scancode");

    await syscall.open("/dev/scancode", 0);
    await syscall.open("/dev/cons", 0);
    await syscall.open("/dev/cons", 0);


    syscall.write(0, te.encode(`Booting System...\n\r${yellow("Command line")}: `));
    for(const x of options.keys()){
        syscall.write(0, te.encode(x + "=" + options.get(x) + " "));
    }
    syscall.write(0, te.encode("\n\r"));


    await syscall.write(0, te.encode("Starting " + options.get("filesrv") + " of " + options.get("initrd") + "\n\r"));
    await syscall.fork("/boot/" + options.get("filesrv"), [options.get("initrd")!, "/srv/initrd"], 0);

    await syscall.sleep(1000);

    await syscall.write(0, te.encode("Mounting /srv/initrd into /mnt/initrd\n\r"));
    const fd = await syscall.open("/srv/initrd", OMode.RDWR)
    await syscall.mount(fd, null, "/mnt/initrd", MType.CREATE);
    await syscall.bind("/mnt/initrd/bin", "/bin", MType.CREATE);
    await syscall.bind("/mnt/initrd/lib", "/lib", MType.CREATE);
    let pid = await syscall.exec(options.get("initrc")!, []);
    await syscall.wait(pid);
}

self.proc.entrypoint(main);
