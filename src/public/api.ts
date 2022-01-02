export const FD_STDIN = 0;
export const FD_STDOUT = 1;
export const FD_STDERR = 2;

export enum OpenOptions{
    READ,
    WRITE,
    APPEND
}

export type FileDescriptor = number

export interface IDirectoryEntry{
    name: string
}

export interface ISystemCalls{
    read: (fd: FileDescriptor, count: number) => Promise<string>,
    write: (fd: FileDescriptor, buf: string) => void,
    open: (path: string, flags: OpenOptions) => Promise<FileDescriptor>,
    getdents: (fd: FileDescriptor, count: number) => Promise<IDirectoryEntry[]>,
    getcwd: () => Promise<string>,
    close: (fd: FileDescriptor) => void,
    exec: (path: string, argv: string[]) => Promise<number>
    chcwd: (path: string) => void;
    die: (status: number) => Promise<void>
    mount: (fstype: string, device: string, options: string, mountpoint: string) => Promise<void>
    unmount: (path: string) => Promise<void>
    mkdir: (path: string) => Promise<void>
    rmdir: (path: string) => Promise<void>
}
