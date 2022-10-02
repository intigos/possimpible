import argp from "argparse";
import fs from "fs";

export function generatePEXF(name: string, bin:string, deps:string[]): Uint8Array{
    let content = fs.readFileSync(bin);
    return content
}


export function generateDynaLib(name: string, library:string, deps: string[]){
    let content = fs.readFileSync(library).toString()
    let pexfstruct = {
        name: name,
        dependencies: deps,
        code: content
    }

    return "dynalib:" + JSON.stringify(pexfstruct);
}

const parser = new argp.ArgumentParser({
    description: 'Linker',
    add_help: true,
});

parser.add_argument('-l', '--library', { help: 'Creates a dynamic library' });
parser.add_argument('-n', '--name', { help: 'Object name', required: true });
parser.add_argument('-d', '--dependency', { nargs:"+", help: 'Object Dependencies' });
parser.add_argument('-o', '--output', { required: true, help: 'Output' });
parser.add_argument('files', { help: 'File' });

if (require.main === module) {
    const args = parser.parse_args();

    let output;
    if(args.library){
        output = generateDynaLib(args.name, args.library, args.dependency)
        fs.writeFileSync(args.output, output);
    }else{
        output = generatePEXF(args.name, args.library, args.dependency)
        fs.writeFileSync(args.output, output);
    }
}

