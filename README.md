# possimpible

I was stuck at parents for xmas and I picked Tannenbaum “distributed systems” and “Modern operating systems”, which gave
me an idea of running a "kernel" on a browser. It was more of an academic exercise than anything else, 
but my intention was to have a the following:

* Being able to unload and reload javascript. The initial idea was to write the website inside the website, but at the core level it requires having something akin to process isolation for javascript. It also requires the dom to be isolated.

* Implementing 9p2000, and share resources across browsers. I’ve been reading about the ideas of plan 9 and i would like to implement something that allows me to connect point to point to other browsers and mount their FS into mine so we can share resources.

One of the cool results that I got was that since the dom is not directly changed (each process/worker has its own partial dom and every time that it changes it a delta is sent back to the main thread for sync) it allows javascript to be running somewhere else (another browser, back end server) and sync’ed back (much like vadaain, but more agnostic).
Most of the code was inspired by the linux kernel (which gave me a reason to go learn its internals) and is kinda nasty at some points but is written in typescript as some of you have already mentioned. Someone might find it interesting even if just for the educational purpose of


## Project setup
```
yarn install
```

### Compiles and hot-reloads for development just the kernel
```
yarn serve
```

### Compiles toolchain, shared libraries and the kernel
```
yarn build
```

