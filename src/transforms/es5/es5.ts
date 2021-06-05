import Transform from "../transform";
import {
  Node,
  Literal,
  Identifier,
  MemberExpression,
  BlockStatement,
  ReturnStatement,
  CallExpression,
  ObjectExpression,
  ArrayExpression,
  ThisExpression,
  Property,
} from "../../util/gen";
import { clone, getBlockBody, prepend } from "../../util/insert";
import { isBlock, getBlock, walk } from "../../traverse";
import Template from "../../templates/template";
import { ObfuscateOrder } from "../../order";
import { ok } from "assert";
import { reservedKeywords } from "../../constants";
import AntiDestructuring from "./antiDestructuring";
import AntiTemplate from "./antiTemplate";

/**
 * `Const` and `Let` are not allowed in ES5.
 */
class AntiConstLet extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return object.type == "VariableDeclaration" && object.kind != "var";
  }

  transform(object) {
    object.kind = "var";
  }
}

/**
 * Converts arrow functions
 */
export class AntiArrowFunction extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return object.type == "ArrowFunctionExpression";
  }

  transform(object, parents) {
    return () => {
      var usesThis = false;

      if (object.body.type != "BlockStatement" && object.expression) {
        object.body = BlockStatement([ReturnStatement(clone(object.body))]);
        object.expression = false;
      }

      walk(object.body, [object, ...parents], (o, p) => {
        if (p.filter((x) => isBlock(x))[0] == object.body) {
          if (
            o.type == "ThisExpression" ||
            (o.type == "Identifier" && o.name == "this")
          ) {
            usesThis = true;
          }
        }
      });

      ok(object.body.type == "BlockStatement", "Should be a BlockStatement");
      ok(Array.isArray(object.body.body), "Body should be an array");
      ok(
        !object.body.body.find((x) => Array.isArray(x)),
        "All elements should be statements"
      );

      object.type = "FunctionExpression";
      object.expression = false;

      if (usesThis) {
        this.objectAssign(
          object,
          CallExpression(
            MemberExpression(clone(object), Identifier("bind"), false),
            [ThisExpression()]
          )
        );
      }
    };
  }
}

var HelperFunctions = Template(
  `
  function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
  
  function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
  
  function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
  `
);

class AntiES6Object extends Transform {
  makerFn: string;
  helper: boolean;

  constructor(o) {
    super(o);

    this.makerFn = null;
    this.helper = false;
  }

  match(object: Node, parents: Node[]) {
    return object.type == "ObjectExpression";
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      var block = getBlock(object, parents);
      var needsChanging = false;

      object.properties.forEach((property) => {
        if (property.type == "SpreadElement") {
          return;
        }

        // AntiShorthand
        object.shorthand = false;

        if (!property.key) {
          this.error(new Error("Property missing key"));
        }

        if (!["Literal", "Identifier"].includes(property.key.type)) {
          property.computed = true;
        }

        if (property.computed && property.key.type == "Literal") {
          property.computed = false;
        }

        if (property.kind != "init" || property.method || property.computed) {
          needsChanging = true;
        }
      });

      if (needsChanging) {
        if (!this.makerFn) {
          this.makerFn = this.getPlaceholder();

          prepend(
            parents[parents.length - 1] || block,
            Template(`
            function {name}(base, computedProps, getters, setters){

              for ( var i = 0; i < computedProps.length; i++ ) {
                base[computedProps[i][0]] = computedProps[i][1];
              }

              var keys=Object.create(null);
              Object.keys(getters).forEach(key=>(keys[key] = 1))
              Object.keys(setters).forEach(key=>(keys[key] = 1))

              Object.keys(keys).forEach(key=>{
                Object.defineProperty(base, key, {
                  set: setters[key],
                  get: getters[key],
                  configurable: true
                });
              })
              return base; 
            }
          `).single({ name: this.makerFn })
          );
        }

        // {a: 1} Es5 compliant properties
        var baseProps = [];
        // {[a]: 1} -> Computed props to array [a, 1]
        var computedProps = [];
        // {get a(){}} -> Property descriptors
        var getters = ObjectExpression([]);
        var setters = ObjectExpression([]);

        object.properties.forEach((prop) => {
          var key = prop.key;
          if (!key) {
            return;
          }

          if (key.type == "Identifier" && !prop.computed) {
            key = Literal(key.name);
          }

          if (prop.computed) {
            var array = [prop.key, prop.value];

            computedProps.push(ArrayExpression(array));
          } else if (prop.kind == "get" || prop.kind == "set") {
            if (prop.kind == "get") {
              getters.properties.push(Property(key, prop.value));
            } else {
              setters.properties.push(Property(key, prop.value));
            }
          } else {
            prop.method = false;

            baseProps.push(prop);
          }
        });

        if (
          setters.properties.length ||
          getters.properties.length ||
          computedProps.length
        ) {
          this.objectAssign(
            object,
            CallExpression(Identifier(this.makerFn), [
              ObjectExpression(baseProps),
              ArrayExpression(computedProps),
              getters,
              setters,
            ])
          );
        }
      }
    };
  }
}

class FixedExpressions extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return true;
  }

  transform(object, parents) {
    return () => {
      if (
        object.type == "ForStatement" &&
        object.init.type == "ExpressionStatement"
      ) {
        object.init = object.init.expression;
      }

      if (object.type == "MemberExpression") {
        if (!object.computed && object.property.type == "Identifier") {
          if (reservedKeywords.has(object.property.name)) {
            object.property = Literal(object.property.name);
            object.computed = true;
          }
        }
      }

      if (object.type == "Property") {
        if (!object.computed && object.key.type == "Identifier") {
          if (reservedKeywords.has(object.key.name)) {
            object.key = Literal(object.key.name);
          }
        }
      }
    };
  }
}

export default class ES5 extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.ES5);

    this.before.push(new AntiTemplate(o));
    this.before.push(new AntiES6Object(o));
    this.before.push(new AntiArrowFunction(o));
    this.before.push(new AntiDestructuring(o));
    this.before.push(new AntiConstLet(o));

    this.concurrent.push(new FixedExpressions(o));
  }

  match(object: Node, parents: Node[]) {
    return object.type == "Program";
  }

  transform(object: Node, parents: Node[]) {
    var block = getBlock(object, parents);

    getBlockBody(block).splice(
      0,
      0,
      ...Template(`
    !Array.prototype.forEach ? Array.prototype.forEach = function (callback, thisArg) {
      thisArg = thisArg;
      for (var i = 0; i < this.length; i++) {
          callback.call(thisArg, this[i], i, this);
      }
    } : 0;
  
    !Array.prototype.map ? Array.prototype.map = function (callback, thisArg) {
      thisArg = thisArg;
      var array=[];
      for (var i = 0; i < this.length; i++) {
        array.push( callback.call(thisArg, this[i], i, this) );
      }
      return array;
    } : 0;

    !Array.prototype.reduce ? Array.prototype.reduce = function(fn, initial) {
      var values = this;
      if ( typeof initial === "undefined" ) {
        initial = 0;
      }

      values.forEach(function(item, index){
        initial = fn(initial, item, index, this);
      });

      return initial;
    } : 0;
  `).compile()
    );
  }
}
