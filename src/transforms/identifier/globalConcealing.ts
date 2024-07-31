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
import { predictableFunctionTag, reservedIdentifiers } from "../../constants";
import { ComputeProbabilityMap } from "../../probability";
import GlobalAnalysis from "./globalAnalysis";
import { GetGlobalTemplate } from "../../templates/bufferToString";

/**
 * Global Concealing hides global variables being accessed.
 *
 * - Any variable that is not defined is considered "global"
 */
export default class GlobalConcealing extends Transform {
  globalAnalysis: GlobalAnalysis;
  ignoreGlobals = new Set(["require", "__dirname", "eval"]);

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

      for (var varName of this.ignoreGlobals) {
        delete globals[varName];
      }

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
        var usedStates = new Set<number>();

        // Make getter function

        // holds "window" or "global"
        var globalVar = this.getPlaceholder();

        var getGlobalVariableFnName =
          this.getPlaceholder() + predictableFunctionTag;

        // Returns global variable or fall backs to `this`
        var getGlobalVariableFn = GetGlobalTemplate.compile({
          getGlobalFnName: getGlobalVariableFnName,
        });

        // 2. Replace old accessors
        var globalFn = this.getPlaceholder() + predictableFunctionTag;

        var newNames: { [globalVarName: string]: number } = Object.create(null);

        Object.keys(globals).forEach((name) => {
          var locations: Location[] = globals[name];
          var state: number;
          do {
            state = getRandomInteger(-1000, 1000 + usedStates.size);
          } while (usedStates.has(state));
          usedStates.add(state);

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
                1000 + usedStates.size + this.options.globalVariables.size * 100
              );
            } while (usedStates.has(state));
            usedStates.add(state);

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
                    MemberExpression(Identifier(globalVar), Literal(name), true)
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
                            Identifier(globalVar),
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
              MemberExpression(
                Identifier(globalVar),
                Identifier(returnName),
                true
              )
            ),
          ]
        );

        var tempVar = this.getPlaceholder();

        var variableDeclaration = Template(`
        var ${globalVar};
        `).single();

        variableDeclaration.declarations.push(
          VariableDeclarator(
            tempVar,
            CallExpression(
              MemberExpression(
                FunctionExpression(
                  [],
                  [
                    ...getGlobalVariableFn,
                    Template(
                      `return ${globalVar} = ${getGlobalVariableFnName}["call"](this)`
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
