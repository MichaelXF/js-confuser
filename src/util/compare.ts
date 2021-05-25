import { walk } from "../traverse";
import { Node } from "./gen";
import { getBlockBody, isFunction } from "./insert";

export function isEquivalent(first: Node, second: Node){

  var extra = {
    "start": 1,
    "end": 1,
    "loc": 1
  };

  function removeExtra(obj) {
    if ( typeof obj === "object") {
      for (var property in obj) {
        if (obj && obj.hasOwnProperty(property)) {
          if (typeof obj[property] == "object") {
            removeExtra(obj[property]);
          } else {
            if ( extra[property] ) {
              delete obj[property];
            }
          }
        }
      }
    }
    

    return obj;
  }
  return JSON.stringify(removeExtra(first)) == JSON.stringify(removeExtra(second));
};

export function isValidIdentifier(name: string): boolean {
  if ( typeof name !== "string") {
    return false;
  }
  if ( name.includes(".") || name.includes(" ") ) {
    return false;
  }

  var x = name.match(/^[A-z$_][A-z0-9$_]*/);
  return x && x[0] == name;
}

export function isDeclaration(object: any): boolean {
  if ( !object ) {
    throw new Error("object is undefined")
  }
  return ["FunctionDeclaration", "VariableDeclaration"].includes(object.type);
}


export function isInsideType(type: string, object: Node, parents: Node[]): boolean {
  return [object, ...parents].some(x=>x.type==type);
};

export function isStrictMode(object: Node, parents: Node[]): boolean {
  var functions = parents.filter(x=>isFunction(x));

  for ( var fn of functions ) {
    var first = getBlockBody(fn.body)[0];
    if ( first && first.type == "ExpressionStatement" && first.expression.type == "Literal" && first.expression.value == "strict mode" ) {
      return true;
    }
  }

  return false;
}

export function isInside(finding: any, object: any, parents: any): boolean {
  var found = false;
  walk(object, parents, (object2, parents2)=>{
    if ( object2 == finding ) {
      found = true;
    }
  });

  return found;
};

export function isIndependent(object: Node, parents: Node[]){

  if (object.type == "Literal") {
    return true;
  }

  var parent = parents[0];

  if ( object.type == "Identifier") {
    var set = new Set(["null", "undefined"]);
    if ( set.has(object.name) ) {
      return true;
    }
    if (parent.type == "Property") {
      if ( !parent.computed && parent.key == object ) {
        return true;
      }
    }

    return false;
  }

  if ( object.type == "ArrayExpression" || object.type == "ObjectExpression" || object.type == "Property") {
    var allowIt = true;
    walk(object, parents, ($object, $parents)=>{
      if ( object != $object ) {
        if ( !Array.isArray($object) && !isIndependent($object, $parents) ) {
          allowIt = false;
        }
      }
    });

    return allowIt;
  }

  return false;
};

export function getFactors(num: number): number[] {
  return Array.from(Array(num + 1), (_, i) => i).filter(i => num % i === 0)
}
