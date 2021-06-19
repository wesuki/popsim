export class MyMath {
  static sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  static sum(arr) {
    return arr.reduce((a, b) => a + b);
  }

  static mean(arr) {
    return MyMath.sum(arr) / arr.length;
  }
}

export function histgram(arr, start = null, end = null, step = 1) {
  if (!arr) return [];
  start = start ?? Math.min(...arr);
  end = end ?? Math.max(...arr) + step;
  const nbin = Math.ceil((end - start) / step);
  let ret = Array(nbin).fill(0);
  for (const x of arr) {
    const ibin = Math.floor((x - start) / step);
    ret[ibin]++;
  }
  return ret;
}

export function createTableHTML(pairs) {
  pairs = Array.from(pairs);
  let table = "";
  table += "<table>";
  table += "<tr>";
  for (let [title, value] of pairs) {
    table += `<td>${title}</td>`;
  }
  table += "</tr>";
  table += "<tr>";
  for (let [title, value] of pairs) {
    table += `<td>${value}</td>`;
  }
  table += "</tr>";
  table += "</table>";
  return table;
}
