export const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
