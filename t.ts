function genperm(val:number): string{
    let result = "";
    let i = val;
    for(let k = 0; k < 9 ; k++){
        let l;
        switch (k % 3){
            case 0: l = "x"; break
            case 1: l = "w"; break
            case 2: l = "r"; break
        }
        result = ((i & 0x1) ? l : "-") + result;
        i = i >> 1;
    }
    return result;
}

console.log(genperm(0o644));