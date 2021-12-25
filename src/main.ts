import {Terminal} from "xterm";
import {FitAddon} from "xterm-addon-fit";

import {TTYDevice} from "./kernel/sys/devices";
import {Kernel} from "./kernel/kernel";
import "xterm/css/xterm.css"

// @ts-ignore
import initrd from "&/initrd.img";

class TerminalDevice extends TTYDevice{
    private term: Terminal;
    private buffer: string = "";

    constructor(el: HTMLElement) {
        super();
        this.term = new Terminal();
        const fitAddon = new FitAddon();

        this.term.loadAddon(fitAddon);

        this.term.onData((data) => {
            this.buffer += data
        })
        fitAddon.fit();
        this.term.open(el);
    }

    read(count:number): string {
        const data = this.buffer;
        this.buffer = "";
        return data;
    }

    write(str: string) {
        this.term.write(str);
    }
}

const kernel = new Kernel({
    tty: new TerminalDevice(document.getElementById("term")!),
    initrd: initrd,
    initrc: "/bin/psh"
});

setTimeout(async () => await kernel.boot(), 0)
