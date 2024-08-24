import { compileJsSync } from "../compiler";
import { predictableFunctionTag, reservedIdentifiers } from "../constants";
import Obfuscator from "../obfuscator";
import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
import { FunctionLengthTemplate } from "../templates/functionLength";
import { ObjectDefineProperty } from "../templates/globals";
import Template from "../templates/template";
import { walk } from "../traverse";
import {
  ArrayExpression,
  BlockStatement,
  CallExpression,
  ExpressionStatement,
  Identifier,
  Literal,
  LogicalExpression,
  MemberExpression,
  NewExpression,
  Node,
  ReturnStatement,
  ThisExpression,
  VariableDeclaration,
  VariableDeclarator,
} from "../util/gen";
import { getIdentifierInfo } from "../util/identifiers";
import {
  prepend,
  getDefiningContext,
  computeFunctionLength,
} from "../util/insert";
import Integrity from "./lock/integrity";
import Transform from "./transform";

/**
 * Converts function to `new Function("..code..")` syntax as an alternative to `eval`. Eval is disabled in many environments.
 *
 * `new Function("..code..")` runs in an isolated context, meaning all local variables are undefined and throw errors.
 *
 * Rigorous checks are in place to only include pure functions.
 *
 * `flatten` can attempt to make function reference-less. Recommended to have flatten enabled with RGF.
 */
export default class RGF extends Transform {
  // Array of all the `new Function` calls
  arrayExpressionElements: Node[];
  // The name of the array holding all the `new Function` expressions
  arrayExpressionName: string;

  functionLengthName: string;

  getFunctionLengthName(parents: Node[]) {
    if (!this.functionLengthName) {
      this.functionLengthName = this.getPlaceholder();
    }

    return this.functionLengthName;
  }

  constructor(o) {
    super(o, ObfuscateOrder.RGF);

    this.arrayExpressionName = this.getPlaceholder() + "_rgf";
    this.arrayExpressionElements = [];
  }

  apply(tree: Node): void {
    super.apply(tree);

    // Only add the array if there were converted functions
    if (this.arrayExpressionElements.length > 0) {
      var variableDeclaration = VariableDeclaration(
        VariableDeclarator(
          Identifier(this.arrayExpressionName),
          ArrayExpression(this.arrayExpressionElements)
        )
      );

      var nodes: Node[] = [variableDeclaration];

      if (this.options.lock?.tamperProtection) {
        // The name of the variable flag if eval is safe to use
        var tamperProtectionCheckName = this.getPlaceholder() + "_rgfEvalCheck";

        variableDeclaration.declarations[0].init = LogicalExpression(
          "&&",
          Identifier(tamperProtectionCheckName),
          { ...variableDeclaration.declarations[0].init }
        );

        nodes.unshift(
          ...new Template(`
            var ${tamperProtectionCheckName} = false;
            eval(${this.jsConfuserVar(tamperProtectionCheckName)} + "=true");
            if(!${tamperProtectionCheckName}) {
              {countermeasures}
            }
            `).compile({
            countermeasures: this.lockTransform.getCounterMeasuresCode(
              tree,
              []
            ),
          })
        );
      }

      prepend(tree, ...nodes);
    }

    // The function.length helper function must be placed last
    if (this.functionLengthName) {
      prepend(
        tree,
        FunctionLengthTemplate.single({
          name: this.functionLengthName,
          ObjectDefineProperty: this.createInitVariable(ObjectDefineProperty, [
            tree,
          ]),
        })
      );
    }
  }

  match(object, parents) {
    return (
      (object.type === "FunctionDeclaration" ||
        object.type === "FunctionExpression") && // Does not apply to Arrow functions
      !object.async && // Does not apply to async/generator functions
      !object.generator
    );
  }

  transform(object: Node, parents: Node[]) {
    // Discard getter/setter methods
    if (parents[0].type === "Property" && parents[0].value === object) {
      if (
        parents[0].method ||
        parents[0].kind === "get" ||
        parents[0].kind === "set"
      ) {
        return;
      }
    }

    // Discard class methods
    if (parents[0].type === "MethodDefinition" && parents[0].value === object) {
      return;
    }

    // Avoid applying to the countermeasures function
    if (typeof this.options.lock?.countermeasures === "string") {
      // function countermeasures(){...}
      if (
        object.type === "FunctionDeclaration" &&
        object.id.type === "Identifier" &&
        object.id.name === this.options.lock.countermeasures
      ) {
        return;
      }

      // var countermeasures = function(){...}
      if (
        parents[0].type === "VariableDeclarator" &&
        parents[0].init === object &&
        parents[0].id.type === "Identifier" &&
        parents[0].id.name === this.options.lock.countermeasures
      ) {
        return;
      }
    }

    // Check user option
    if (!ComputeProbabilityMap(this.options.rgf, (x) => x, object?.id?.name))
      return;

    // Discard functions that use 'eval' function
    if (object.$requiresEval) return;

    // Check for 'this', 'arguments' (not allowed!)
    var isIllegal = false;
    walk(object, parents, (o, p) => {
      if (
        o.type === "ThisExpression" ||
        o.type === "Super" ||
        (o.type === "Identifier" && o.name === "arguments")
      ) {
        isIllegal = true;
        return "EXIT";
      }
    });

    if (isIllegal) return;

    return () => {
      // Make sure function is 'reference-less'
      var definedMap = new Map<Node, Set<string>>();
      var isReferenceLess = true;
      var identifierPreventingTransformation: string;

      walk(object, parents, (o, p) => {
        if (
          o.type === "Identifier" &&
          o.name !== this.arrayExpressionName &&
          !reservedIdentifiers.has(o.name) &&
          !this.options.globalVariables.has(o.name)
        ) {
          var info = getIdentifierInfo(o, p);
          if (!info.spec.isReferenced) {
            return;
          }

          if (info.spec.isDefined) {
            // Add to defined map
            var definingContext = getDefiningContext(o, p);

            if (!definedMap.has(definingContext)) {
              definedMap.set(definingContext, new Set([o.name]));
            } else {
              definedMap.get(definingContext).add(o.name);
            }
          } else {
            // This approach is dirty and does not account for hoisted FunctionDeclarations
            var isDefinedAbove = false;
            for (var pNode of p) {
              if (definedMap.has(pNode)) {
                if (definedMap.get(pNode).has(o.name)) {
                  isDefinedAbove = true;
                  break;
                }
              }
            }

            if (!isDefinedAbove) {
              isReferenceLess = false;
              identifierPreventingTransformation = o.name;

              return "EXIT";
            }
          }
        }
      });

      // This function is not 'reference-less', cannot be RGF'd
      if (!isReferenceLess) {
        if (object.id) {
          this.log(
            `${object?.id?.name}() cannot be transformed because of ${identifierPreventingTransformation}`
          );
        }
        return;
      }

      // Since `new Function` is completely isolated, create an entire new obfuscator and run remaining transformations.
      // RGF runs early and needs completed code before converting to a string.
      // (^ the variables haven't been renamed yet)
      var obfuscator = new Obfuscator({
        ...this.options,
        stringEncoding: false,
        compact: true,
      });

      if (obfuscator.options.lock) {
        obfuscator.options.lock = { ...obfuscator.options.lock };
        delete obfuscator.options.lock.countermeasures;

        // Integrity will not recursively apply to RGF'd functions. This is intended.
        var lockTransform = obfuscator.transforms["Lock"];
        if (lockTransform) {
          lockTransform.before = lockTransform.before.filter(
            (beforeTransform) => !(beforeTransform instanceof Integrity)
          );
        }
      }

      var transforms = obfuscator.array.filter(
        (x) => x.priority > this.priority
      );

      var embeddedFunctionName = this.getPlaceholder();

      var embeddedFunction = {
        type: "FunctionDeclaration",
        id: Identifier(embeddedFunctionName),
        body: BlockStatement([...object.body.body]),
        params: object.params,
        async: false,
        generator: false,
      };

      // The new program will look like this
      // new Function(`
      //  var rgf_array = this[0]
      //  function greet(message){
      //      console.log(message)
      //  }
      //  return greet.apply(this[1], arguments)
      // `)
      //
      // And called like
      // f.apply([ rgf_array, this ], arguments)
      var tree = {
        type: "Program",
        body: [
          VariableDeclaration(
            VariableDeclarator(
              this.arrayExpressionName,
              MemberExpression(ThisExpression(), Literal(0))
            )
          ),
          embeddedFunction,
          ReturnStatement(
            CallExpression(
              MemberExpression(
                Identifier(embeddedFunctionName),
                Literal("apply"),
                true
              ),
              [
                MemberExpression(ThisExpression(), Literal(1)),
                Identifier("arguments"),
              ]
            )
          ),
        ],
      };

      transforms.forEach((transform) => {
        transform.apply(tree);
      });

      var toString = compileJsSync(tree, obfuscator.options);

      // new Function(code)
      var newFunctionExpression: Node = NewExpression(Identifier("Function"), [
        Literal(toString),
      ]);

      if (this.options.lock?.tamperProtection) {
        // If tamper protection is enabled, wrap the function in an eval
        var randomName = this.getGenerator("randomized").generate();
        newFunctionExpression = CallExpression(Identifier("eval"), [
          Literal(`function ${randomName}(){ ${toString} } ${randomName}`),
        ]);
      }

      // The index where this function is placed in the array
      var newFunctionExpressionIndex = this.arrayExpressionElements.length;

      // Add it to the array
      this.arrayExpressionElements.push(newFunctionExpression);

      // The member expression to retrieve this function
      var memberExpression: Node = MemberExpression(
        Identifier(this.arrayExpressionName),
        Literal(newFunctionExpressionIndex),
        true
      );

      var originalFunctionLength = computeFunctionLength(object.params);

      // Replace based on type

      // (1) Function Declaration:
      // - Replace body with call to new function
      if (object.type === "FunctionDeclaration") {
        object.body = BlockStatement([
          ReturnStatement(
            CallExpression(
              MemberExpression(memberExpression, Literal("apply"), true),
              [
                ArrayExpression([
                  Identifier(this.arrayExpressionName),
                  ThisExpression(),
                ]),
                Identifier("arguments"),
              ]
            )
          ),
        ]);

        // The parameters are no longer needed ('arguments' is used to capture them)
        object.params = [];

        // The function is no longer guaranteed to not have extraneous parameters passed in
        object[predictableFunctionTag] = false;

        if (
          this.options.preserveFunctionLength &&
          originalFunctionLength !== 0
        ) {
          var body = parents[0] as unknown as Node[];

          body.splice(
            body.indexOf(object),
            0,
            ExpressionStatement(
              CallExpression(Identifier(this.getFunctionLengthName(parents)), [
                Identifier(object.id.name),
                Literal(originalFunctionLength),
              ])
            )
          );
        }
        return;
      }

      // (2) Function Expression:
      // - Replace expression with member expression pointing to new function
      if (object.type === "FunctionExpression") {
        if (
          this.options.preserveFunctionLength &&
          originalFunctionLength !== 0
        ) {
          memberExpression = CallExpression(
            Identifier(this.getFunctionLengthName(parents)),
            [memberExpression, Literal(originalFunctionLength)]
          );
        }
        this.replace(object, memberExpression);
        return;
      }
    };
  }
}
