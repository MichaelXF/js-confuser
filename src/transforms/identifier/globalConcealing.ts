import Template from "../../templates/template";
import Transform from "../transform";
import { ObfuscateOrder } from "../../order";
import {
  Node,
  Location,
  CallExpression,
  Identifier,
  Literal,
  FunctionDeclaration,
  VariableDeclaration,
  ObjectExpression,
  Property,
  ReturnStatement,
  MemberExpression,
  SwitchStatement,
  SwitchCase,
} from "../../util/gen";
import { prepend } from "../../util/insert";
import { getIdentifierInfo } from "../../util/identifiers";
import { getRandomInteger } from "../../util/random";
import { reservedIdentifiers, reservedKeywords } from "../../constants";

class GlobalAnalysis extends Transform {
  notGlobals: Set<string>;
  globals: { [name: string]: Location[] };

  constructor(o) {
    super(o);

    this.globals = Object.create(null);
    this.notGlobals = new Set();
  }

  match(object: Node, parents: Node[]) {
    return object.type == "Identifier";
  }

  transform(object: Node, parents: Node[]) {
    if (reservedKeywords.has(object.name)) {
      return;
    }

    var info = getIdentifierInfo(object, parents);
    if (!info.spec.isReferenced) {
      return;
    }

    // Add to globals
    if (!this.notGlobals.has(object.name)) {
      if (!this.globals[object.name]) {
        this.globals[object.name] = [];
      }

      this.globals[object.name].push([object, parents]);
    }

    if (info.spec.isDefined || info.spec.isModified) {
      delete this.globals[object.name];

      this.notGlobals.add(object.name);
    }
  }
}

/**
 * Global Concealing hides global variables being accessed.
 *
 * - Any variable that is not defined is considered "global"
 */
export default class GlobalConcealing extends Transform {
  globalAnalysis: GlobalAnalysis;
  globalVar: string;

  constructor(o) {
    super(o, ObfuscateOrder.GlobalConcealing);

    this.globalAnalysis = new GlobalAnalysis(o);
    this.before.push(this.globalAnalysis);

    this.globalVar = null;
  }

  match(object: Node, parents: Node[]) {
    return object.type == "Program";
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      var globals: { [name: string]: Location[] } = this.globalAnalysis.globals;
      this.globalAnalysis.notGlobals.forEach((del) => {
        delete globals[del];
      });

      reservedIdentifiers.forEach((x) => {
        delete globals[x];
      });

      Object.keys(globals).forEach((x) => {
        if (this.globalAnalysis.globals[x].length < 1) {
          delete globals[x];
        }
      });

      // this.log(Object.keys(globals).join(', '))

      if (Object.keys(globals).length > 0) {
        var used = new Set();

        // 1. Make getter function

        this.globalVar = this.getPlaceholder();
        // "window" or "global" in node
        var global =
          this.options.globalVariables.values().next().value || "window";
        var callee = this.getPlaceholder();

        // Returns global variable or fall backs to `this`
        var functionDeclaration = Template(`
        function ${callee}(){
          try {
            return ${global};
          } catch (e){
            return this;
          }
        }`).single();

        // 2. Replace old accessors

        var variableDeclaration = Template(`
        var ${this.globalVar} = ${callee}.call(this);
        `).single();

        var globalFn = this.getPlaceholder();

        var newNames = Object.create(null);

        Object.keys(globals).forEach((name) => {
          var locations: Location[] = globals[name];
          var state;
          do {
            state = getRandomInteger(-1000, 1000 + used.size);
          } while (used.has(state));
          used.add(state);

          newNames[name] = state;

          locations.forEach(([node, parents]) => {
            this.replace(
              node,
              CallExpression(Identifier(globalFn), [Literal(state)])
            );
          });
        });

        // Adds all global variables to the switch statement
        // this.options.globalVariables.forEach((name) => {
        //   if (!newNames[name]) {
        //     var state;
        //     do {
        //       state = getRandomInteger(
        //         -1000,
        //         1000 + used.size + this.options.globalVariables.size
        //       );
        //     } while (used.has(state));
        //     used.add(state);

        //     newNames[name] = state;
        //   }
        // });

        prepend(
          object,
          FunctionDeclaration(
            globalFn,
            [Identifier("index")],
            [
              SwitchStatement(
                Identifier("index"),
                Object.keys(newNames).map((name) => {
                  var code = newNames[name];

                  return SwitchCase(Literal(code), [
                    ReturnStatement(
                      MemberExpression(
                        Identifier(this.globalVar),
                        Literal(name),
                        true
                      )
                    ),
                  ]);
                })
              ),
            ]
          )
        );

        prepend(object, variableDeclaration);
        prepend(object, functionDeclaration);
      }
    };
  }
}
