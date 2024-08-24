import Template from "./template";

export const IndexOfTemplate = new Template(`
function indexOf(str, substr) {
  const len = str.length;
  const sublen = substr.length;
  let count = 0;

  if (sublen > len) {
    return -1;
  }

  for (let i = 0; i <= len - sublen; i++) {
    for (let j = 0; j < sublen; j++) {
      if (str[i + j] === substr[j]) {
        count++;
        if (count === sublen) {
          return i;
        }
      } else {
        count = 0;
        break;
      }
    }
  }

  return -1;
}
`);
