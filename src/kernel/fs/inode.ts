import {IDEntry} from "./dcache";
import {IVFSMount} from "./mount";
import {IFile, IFileOperations, ISuperBlock, MkNodeMode} from "./vfs";

export interface IINodeOperations {
    //  create: called by the open(2) and creat(2) system calls. Only
    // 	required if you want to support regular files. The dentry you
    // 	get should not have an inode (i.e. it should be a negative
    // 	dentry). Here you will probably call d_instantiate() with the
    // 	dentry and the newly created inode
    create?: (dir: IINode, dentry: IDEntry, create: boolean) => void;

    //  lookup: called when the VFS needs to look up an inode in a parent
    // 	directory. The name to look for is found in the dentry. This
    // 	method must call d_add() to insert the found inode into the
    // 	dentry. The "i_count" field in the inode structure should be
    // 	incremented. If the named inode does not exist a NULL inode
    // 	should be inserted into the dentry (this is called a negative
    // 	dentry). Returning an error code from this routine must only
    // 	be done on a real error, otherwise creating inodes with system
    // 	calls like create(2), mknod(2), mkdir(2) and so on will fail.
    // 	If you wish to overload the dentry methods then you should
    // 	initialise the "d_dop" field in the dentry; this is a pointer
    // 	to a struct "dentry_operations".
    // 	This method is called with the directory inode semaphore held
    lookup: (dir: IINode, dentry: IDEntry) => IDEntry | null

    //  link: called by the link(2) system call. Only required if you want
    // 	to support hard links. You will probably need to call
    // 	d_instantiate() just as you would in the create() method
    link?: (olddentry: IDEntry, dir: IINode, dentry: IDEntry) => void;

    //  unlink: called by the unlink(2) system call. Only required if you
    // 	want to support deleting inodes
    unlink?: (inode: IINode, dentry: IDEntry) => void;

    //  symlink: called by the symlink(2) system call. Only required if you
    // 	want to support symlinks. You will probably need to call
    // 	d_instantiate() just as you would in the create() method
    symlink?: (inode: IINode, dentry: IDEntry, name: string) => void;

    //  mkdir: called by the mkdir(2) system call. Only required if you want
    // 	to support creating subdirectories. You will probably need to
    // 	call d_instantiate() just as you would in the create() method
    mkdir?: (dir: IINode, dentry: IDEntry) => void;

    //  rmdir: called by the rmdir(2) system call. Only required if you want
    // 	to support deleting subdirectories
    rmdir?: (dir: IINode, dentry: IDEntry) => void;

    //  mknod: called by the mknod(2) system call to create a device (char,
    // 	block) inode or a named pipe (FIFO) or socket. Only required
    // 	if you want to support creating these types of inodes. You
    // 	will probably need to call d_instantiate() just as you would
    // 	in the create() method
    mknod?: (inode: IINode, dentry: IDEntry, mode: MkNodeMode) => void;

    //  rename: called by the rename(2) system call to rename the object to
    // 	have the parent and name given by the second inode and dentry.
    //
    // 	The filesystem must return -EINVAL for any unsupported or
    // 	unknown	flags.  Currently the following flags are implemented:
    // 	(1) RENAME_NOREPLACE: this flag indicates that if the target
    // 	of the rename exists the rename should fail with -EEXIST
    // 	instead of replacing the target.  The VFS already checks for
    // 	existence, so for local filesystems the RENAME_NOREPLACE
    // 	implementation is equivalent to plain rename.
    // 	(2) RENAME_EXCHANGE: exchange source and target.  Both must
    // 	exist; this is checked by the VFS.  Unlike plain rename,
    // 	source and target may be of different type.
    rename?: (oldinode: IINode, olddentry: IDEntry, inode: IINode, dentry: IDEntry) => void;

    //  This function is called by the VFS to translate a symbolic
    //  link to the inode to which it points. The link pointed at by
    //  dentry is translated and the result is stored in the nameidata
    //  structure pointed at by nd.
    followLink?: (dentry: IDEntry, nd: any) => void;

    //  permission: called by the VFS to check for access rights on a POSIX-like
    //   	filesystem.
    //
    // 	May be called in rcu-walk mode (mask & MAY_NOT_BLOCK). If in rcu-walk
    //         mode, the filesystem must check the permission without blocking or
    // 	storing to the inode.
    //
    // 	If a situation is encountered that rcu-walk cannot handle, return
    // 	-ECHILD and it will be called again in ref-walk mode.
    permission?: (dentry: IDEntry, permissions: number) => void;

    //  setattr: called by the VFS to set attributes for a file. This method
    //  is called by chmod(2) and related system calls.
    setattr?: (dentry: IDEntry, attr: any) => void;

    //  getattr: called by the VFS to get attributes of a file. This method
    //  is called by stat(2) and related system calls.
    getattr: (vfsmount: IVFSMount, dentry: IDEntry) => Promise<string>
}

export interface IINode {
    mode: any;
    user: any;
    map: any;
    isLink: boolean;
    lock?: IFile,
    superblock: ISuperBlock;
    operations: IINodeOperations;
    fileOperations: IFileOperations
}

export function inode_new(sb: ISuperBlock){
    const inode =  sb.superblockOperations.alloc_inode(sb);
    inode.superblock = sb;
    return inode;
}

export function inode_set_ptr<T>(inode: IINode, ptr: T){
    inode.map = ptr;
}

export function inode_get_ptr<T>(inode: IINode): T{
    return inode.map;
}
