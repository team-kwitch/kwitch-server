const filter: string[] = [
  "씨발",
  "병신",
  "좇",
  "개새끼",
  "새끼",
  "ㅅㅂ",
  "ㅄ",
  "ㅂㅅ",
  "ㄳㄲ",
  "ㄱㅅㄲ",
  "시발",
  "fuck",
  "썅",
  "아가리",
  "애미",
  "니미",
  "한남",
  "bitch",
  "shit",
  "좇까",
  "존나",
  "염병",
  "간나",
  "지랄",
  "닥쳐",
];

function makeTable(P: string) {
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

function KMP(T: string, P: string) {
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

  return list;
}

function filterSentence(T: string) {
  for (let i = 0; i < filter.length; i++) {
    const list = KMP(T, filter[i]);

    for (let idx of list) {
      for (let i = idx; i < filter[i].length + idx; i++) {
        T = T.substring(0, i) + "*" + T.substring(i + 1);
      }
    }
  }

  return T;
}

function checkAbuse(string) {
  for (let i = 0; i < filter.length; i++) {
    const list = KMP(string, filter[i]);

    if (list.length > 0) return true;
  }

  return false;
}

export { filterSentence, checkAbuse };
