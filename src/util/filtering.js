function makeTable(P){
    let pi = new Array(P.length).fill(0);

    let j = 0;
    for (let i = 1; i < P.length; i++) {
        while (j > 0 && P.charAt(j) !== P.charAt(i)) {
            j = pi[j - 1];
        }
        if (P.charAt(i) === P.charAt(j)) {
            pi[i] = ++j;
        }
    }

    return pi;
}

function KMP(T){
    const filter = ["씨발", "병신", "좇", "개새끼", "새끼"];

    for(let k = 0; k<filter.length; k++){
        const P = filter[k];
        let list = [];

        const pi = makeTable(P);

        let j = 0;
        for (let i = 0; i < T.length; i++) {
            while (j > 0 && P.charAt(j) !== T.charAt(i)) {
                j = pi[j - 1];
            }
            if (P.charAt(j) === T.charAt(i)) {
                if (j === P.length - 1) {
                    list.push(i - P.length + 1);
                    j = pi[j];
                } else {
                    j++;
                }
            }
        }

        for (let idx of list) {
            for (let i = idx; i < P.length + idx; i++) {
                T = T.substring(0, i) + '*' + T.substring(i + 1);
            }
        }
        
    }

    return T;
}

module.exports = {KMP};