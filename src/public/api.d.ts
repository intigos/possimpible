export declare const FD_STDIN = 0;
export declare const FD_STDOUT = 1;
export declare const FD_STDERR = 2;
export declare enum OpenOptions {
}
export declare type FileDescriptor = number;
export interface IDirectoryEntry {
    name: string;
}
export interface ISystemCalls {
    read: (fd: FileDescriptor, count: number) => Promise<string>;
    write: (fd: FileDescriptor, buf: string) => void;
    open: (path: string, flags: OpenOptions) => Promise<FileDescriptor>;
    getdents: (fd: FileDescriptor, count: number) => Promise<IDirectoryEntry[]>;
    getcwd: () => Promise<string>;
    close: (fd: FileDescriptor) => void;
    exec: (path: string, argv: string[]) => Promise<number>;
}
//# sourceMappingURL=api.d.ts.map