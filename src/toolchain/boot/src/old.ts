import {MountType, OpenMode} from "../../../public/api";
import {Colors, yellow} from "../../../sys/colors";

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

    await syscall.bind(options.get("serial")!, "/dev/cons");
    await syscall.bind(options.get("serial")!, "/dev/scancode");

    await syscall.open("/dev/scancode", 0);
    await syscall.open("/dev/cons", 0);
    await syscall.open("/dev/cons", 0);


    syscall.write(0, te.encode(`Booting System...\n\r${yellow("Command line")}: `));
    for(const x of options.keys()){
        syscall.write(0, te.encode(x + "=" + options.get(x) + " "));
    }
    syscall.write(0, te.encode("\n\r\n\r"));


    await syscall.write(0, te.encode("Starting " + options.get("filesrv") + " of " + options.get("initrd") + "\n\r"));
    await syscall.fork("/boot/" + options.get("filesrv"), [options.get("initrd")!, "/srv/initrd"], 0);

    setTimeout(async x => {
        await syscall.write(0, te.encode("Mounting initrd into /root\n\r"));
        const fd = await syscall.open("/srv/initrd", OpenMode.RDWR)
        await syscall.mount(fd, null, "/root", MountType.REPL);
        await syscall.bind("/root/bin", "/bin");
        await syscall.bind("/root/lib", "/lib");
        await syscall.exec(options.get("initrc")!, []);
    }, 1000);
}

self.proc.entrypoint(main);
