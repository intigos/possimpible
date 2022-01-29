setTimeout(async () => {
    let syscall = self.proc.sys;
    const te = new TextEncoder();
    await syscall.bind("#c", "/dev");
    await syscall.bind("#b", "/dev");
    await syscall.bind("#s", "/srv");
    await syscall.bind("#⌨️", "/dev");

    await syscall.bind("/dev/serial", "/dev/cons");
    await syscall.bind("/dev/serial", "/dev/scancode");

    await syscall.open("/dev/scancode", 0);
    await syscall.open("/dev/cons", 0);
    await syscall.open("/dev/cons", 0);

    syscall.write(0, te.encode("Booting System...\n\r"));

    await syscall.exec("/boot/memfs", ["#💾/initrd0", "/srv/initrd"]);

    setTimeout(async x => {
        const fd = await syscall.open("/srv/initrd", 0);
        await syscall.write(fd, te.encode("DO IT\n\r"));
    }, 100);

},0);
