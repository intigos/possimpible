import {Terminal} from "xterm";
import {FitAddon} from "xterm-addon-fit";
import * as XtermWebfont from 'xterm-webfont'

import {TTYDevice} from "./kernel/sys/devices";
import {Kernel} from "./kernel/kernel";
import "xterm/css/xterm.css";

// @ts-ignore
import initrd from "&/initrd.img";
import {VirtualMachine} from "./vm/vm";
import {discover, DSDisplay, DSKeyboard, DSNode, DSProperty, DSStorage, IDeviceTree} from "./vm/devicetree";

class TerminalDevice extends TTYDevice{
    private term: Terminal;
    private resolve: ((value: (string | PromiseLike<string>)) => void) | undefined;
    private buffer: string = "";

    constructor(el: HTMLElement) {
        super();
        this.term = new Terminal({
            fontFamily: "JetBrains Mono",
            fontSize:13,
            rendererType: "dom"
        });
        const fitAddon = new FitAddon();

        this.term.loadAddon(fitAddon);
        this.term.loadAddon(new XtermWebfont())

        this.term.onData((data) => {
            if(this.resolve && this.buffer.length == 0){
                this.resolve(data);
                this.resolve = undefined;
            }else{
                this.buffer += data
            }
        })
        fitAddon.fit();
        // @ts-ignore
        this.term.loadWebfontAndOpen(el);
    }

    async read(count: number): Promise<string> {
        return new Promise<string>(x =>{
            if(this.buffer.length){
                x(this.buffer);
                this.buffer = "";
            }else{
                this.resolve = x;

            }
        })
    }

    write(str: string) {
        this.term.write(str);
    }
}


const terminal = new TerminalDevice(document.getElementById("term")!);

class BlobStorage extends DSStorage{
    private image: any;

    constructor(image: any) {
        super();
        this.image = image;
    }

    attach(): IDeviceTree[] {
        return [
            DSProperty("read", (count: number) => terminal.read(count)),
            DSProperty("write", () => 1)
        ];
    }
}

class DebugScreen extends DSDisplay{
    constructor() {
        super();
    }

    attach(): IDeviceTree[] {
        return [
            DSProperty("write", (buf: string) => terminal.write(buf))
        ];
    }
}

class Keyboard extends DSKeyboard{
    constructor() {
        super();
    }

    attach(): IDeviceTree[] {
        return [
            DSProperty("read", (count: number) => terminal.read(count))
        ];
    }
}

window.onload = async () => setTimeout(async x => {
    const vm = new VirtualMachine(discover([
        DSNode("storage", [
            DSNode("initrd0", new BlobStorage(initrd).attach())
        ]),

        DSNode("display", [
            DSNode("serial", new DebugScreen().attach()),
            DSNode("console", [
                DSProperty("write", (buf: string) => console.log(buf))
            ])
        ]),

        DSNode("input", [
            DSNode("keyboard0", new Keyboard().attach())
        ]),
    ]));

    await vm.boot(new Kernel({
        console: "/dev/tty0",
        root: "/dev/initrd0",
        initrc: "/bin/init"
    }));
}, 100);
