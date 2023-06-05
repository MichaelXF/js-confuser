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
  ReturnStatement,
  MemberExpression,
  SwitchStatement,
  SwitchCase,
  LogicalExpression,
  VariableDeclarator,
  FunctionExpression,
  ExpressionStatement,
  AssignmentExpression,
  VariableDeclaration,
  BreakStatement,
} from "../../util/gen";
import { append, prepend } from "../../util/insert";
import { chance, getRandomInteger } from "../../util/random";
import { reservedIdentifiers } from "../../constants";
import { ComputeProbabilityMap } from "../../probability";
import GlobalAnalysis from "./globalAnalysis";

/**
 * Global Concealing hides global variables being accessed.
 *
 * - Any variable that is not defined is considered "global"
 */
export default class GlobalConcealing extends Transform {
  globalAnalysis: GlobalAnalysis;

  constructor(o) {
    super(o, ObfuscateOrder.GlobalConcealing);

    this.globalAnalysis = new GlobalAnalysis(o);
    this.before.push(this.globalAnalysis);
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

      delete globals["require"];

      reservedIdentifiers.forEach((x) => {
        delete globals[x];
      });

      Object.keys(globals).forEach((x) => {
        if (this.globalAnalysis.globals[x].length < 1) {
          delete globals[x];
        } else if (
          !ComputeProbabilityMap(this.options.globalConcealing, (x) => x, x)
        ) {
          delete globals[x];
        }
      });

      if (Object.keys(globals).length > 0) {
        var used = new Set();

        // Make getter function

        // holds "window" or "global"
        var globalVar = this.getPlaceholder();

        // holds outermost "this"
        var thisVar = this.getPlaceholder();

        // "window" or "global" in node
        var global =
          this.options.globalVariables.values().next().value || "window";
        var alternateGlobal = global === "window" ? "global" : "window";

        var getGlobalVariableFnName = this.getPlaceholder();
        var getThisVariableFnName = this.getPlaceholder();

        // Returns global variable or fall backs to `this`
        var getGlobalVariableFn = Template(`
        var ${getGlobalVariableFnName} = function(){
          try {
            return ${global} || ${alternateGlobal} || (new Function("return this"))();
          } catch (e){
            return ${getThisVariableFnName}["call"](this);
          }
        }`).single();

        var getThisVariableFn = Template(`
        var ${getThisVariableFnName} = function(){
          try {
            return this;
          } catch (e){
            return null;
          }
        }`).single();

        // 2. Replace old accessors
        var globalFn = this.getPlaceholder();

        var newNames: { [globalVarName: string]: number } = Object.create(null);

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
        this.options.globalVariables.forEach((name) => {
          if (!newNames[name]) {
            var state;
            do {
              state = getRandomInteger(
                0,
                1000 + used.size + this.options.globalVariables.size * 100
              );
            } while (used.has(state));
            used.add(state);

            newNames[name] = state;
          }
        });

        var indexParamName = this.getPlaceholder();
        var returnName = this.getPlaceholder();

        var functionDeclaration = FunctionDeclaration(
          globalFn,
          [Identifier(indexParamName)],
          [
            VariableDeclaration(VariableDeclarator(returnName)),
            SwitchStatement(
              Identifier(indexParamName),
              Object.keys(newNames).map((name) => {
                var code = newNames[name];
                var body: Node[] = [
                  ReturnStatement(
                    LogicalExpression(
                      "||",
                      MemberExpression(
                        Identifier(globalVar),
                        Literal(name),
                        true
                      ),
                      MemberExpression(Identifier(thisVar), Literal(name), true)
                    )
                  ),
                ];
                if (chance(50)) {
                  body = [
                    ExpressionStatement(
                      AssignmentExpression(
                        "=",
                        Identifier(returnName),
                        LogicalExpression(
                          "||",
                          Literal(name),
                          MemberExpression(
                            Identifier(thisVar),
                            Literal(name),
                            true
                          )
                        )
                      )
                    ),
                    BreakStatement(),
                  ];
                }

                return SwitchCase(Literal(code), body);
              })
            ),
            ReturnStatement(
              LogicalExpression(
                "||",
                MemberExpression(
                  Identifier(globalVar),
                  Identifier(returnName),
                  true
                ),
                MemberExpression(
                  Identifier(thisVar),
                  Identifier(returnName),
                  true
                )
              )
            ),
          ]
        );

        var tempVar = this.getPlaceholder();

        var variableDeclaration = Template(`
        var ${globalVar}, ${thisVar};
        `).single();

        variableDeclaration.declarations.push(
          VariableDeclarator(
            tempVar,
            CallExpression(
              MemberExpression(
                FunctionExpression(
                  [],
                  [
                    getGlobalVariableFn,
                    getThisVariableFn,

                    Template(
                      `return ${thisVar} = ${getThisVariableFnName}["call"](this, ${globalFn}), ${globalVar} = ${getGlobalVariableFnName}["call"](this)`
                    ).single(),
                  ]
                ),
                Literal("call"),
                true
              ),
              []
            )
          )
        );

        prepend(object, variableDeclaration);
        append(object, functionDeclaration);
      }
    };
  }
}
