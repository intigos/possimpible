export const FD_STDIN = 0;
export const FD_STDOUT = 1;
export const FD_STDERR = 2;

export enum OpenOptions{

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
    close: (fd: FileDescriptor) => void
}
