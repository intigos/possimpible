interface IPIDNamespace {

}

interface IMountNamespace {
}

interface IUTSNamespace {

}

interface INamespace{
    pid: IPIDNamespace;
    mnt: IMountNamespace;
    uts: IUTSNamespace;
}
