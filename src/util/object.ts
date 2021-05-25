


export function createObject(keys: string[], values: any[]): {[key: string]: any} {
  if ( keys.length != values.length ) {
    throw new Error("length mismatch");
  }

  var newObject = {};

  keys.forEach((x,i)=>{
    newObject[x] = values[i];
  });

  return newObject;
};
