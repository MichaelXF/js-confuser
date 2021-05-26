import Transform from "../transform";
import { walk } from "../../traverse";
import {
  Node,
  Location,
  Identifier,
  VariableDeclaration,
  VariableDeclarator,
} from "../../util/gen";
import { ComputeProbabilityMap } from "../../index";
import {
  deleteDeclaration,
  getContext,
  isContext,
  prepend,
} from "../../util/insert";
import { ObfuscateOrder } from "../../obfuscator";
import { getIdentifierInfo } from "../../util/identifiers";
import { isValidIdentifier } from "../../util/compare";

/**
 * Extracts keys out of an object if possible.
 * ```js
 * // Input
 * var utils = {
 *   isString: x=>typeof x === "string",
 *   isBoolean: x=>typeof x === "boolean"
 * }
 * if ( utils.isString("Hello") ) {
 *   ...
 * }
 *
 * // Output
 * var utils_isString = x=>typeof x === "string";
 * var utils_isBoolean = x=>typeof x === "boolean"
 *
 * if ( utils_isString("Hello") ) {
 *   ...
 * }
 * ```
 */
export default class ObjectExtraction extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.ObjectExtraction);
  }

  match(object: Node, parents: Node[]) {
    return isContext(object);
  }

  transform(context: Node, contextParents: Node[]) {
    // ObjectExpression Extractor

    return () => {
      // First pass through to find the maps
      var objectDefs: { [name: string]: Location } = {};

      walk(context, contextParents, (object: Node, parents: Node[]) => {
        if (getContext(object, parents) != context) {
          return;
        }
        if (object.type == "ObjectExpression") {
          // this.log(object, parents);
          if (
            parents[0].type == "VariableDeclarator" &&
            parents[0].init == object &&
            parents[0].id.type == "Identifier"
          ) {
            var name = parents[0].id.name;
            if (name) {
              // check for computed properties

              object.properties.forEach((prop) => {
                if (prop.computed && prop.key.type == "Literal") {
                  prop.computed = false;
                }
              });

              var computed = object.properties.find((x) => x.computed);
              if (computed) {
                this.log(
                  name + " has computed property: " + computed.key.name ||
                    computed.key.value
                );
              } else {
                var illegalName = object.properties
                  .map((x) => x.key.name || x.key.value)
                  .find((x) => !isValidIdentifier(x));

                if (illegalName) {
                  this.log(
                    name + " has an illegal property '" + illegalName + "'"
                  );
                } else {
                  objectDefs[name] = [object, parents];
                }
              }
            }
          }
        }
      });

      // this.log("object defs", objectDefs);
      // huge map of changes
      var objectDefChanges: {
        [name: string]: { key: string; object: Node; parents: Node[] }[];
      } = {};

      if (Object.keys(objectDefs).length) {
        // A second pass through is only required when extracting object keys

        // Second pass through the exclude the dynamic map (counting keys, re-assigning)
        walk(context, contextParents, (object: any, parents: Node[]) => {
          if (getContext(object, parents) != context) {
            return;
          }
          if (
            object.type == "Identifier" &&
            parents[0].type != "VariableDeclarator"
          ) {
            var info = getIdentifierInfo(object, parents);
            if (!info.spec.isReferenced) {
              return;
            }
            if (objectDefs[object.name]) {
              var def = objectDefs[object.name];
              var isMemberExpression =
                parents[0].type == "MemberExpression" &&
                parents[0].object == object;

              var isIllegal = false;
              if (
                parents.some((x) => x.type == "AssignmentExpression") &&
                !isMemberExpression
              ) {
                this.log(object.name, "you can't re-assign the object");

                isIllegal = true;
              } else if (isMemberExpression) {
                var key = parents[0].property.value || parents[0].property.name;
                if (
                  !["Literal", "Identifier"].includes(parents[0].property.type)
                ) {
                  // only allow literal and identifier accessors
                  // Literal: obj["key"]
                  // Identifier: obj.key
                  this.log(
                    object.name,
                    "Only allowed literal and identifier accessors"
                  );
                  isIllegal = true;
                } else if (
                  parents[0].property.type == "Identifier" &&
                  parents[0].computed
                ) {
                  // no: object[key], only: object.key
                  this.log(object.name, "no: object[key], only: object.key");

                  isIllegal = true;
                } else if (
                  !def[0].properties.some(
                    (x) => (x.key.value || x.key.name) == key
                  )
                ) {
                  // check if initialized property
                  // not in initialized object.
                  this.log(
                    object.name,
                    "not in initialized object.",
                    def[0].properties,
                    key
                  );
                  isIllegal = true;
                } else {
                  // allowed.
                  // start the array if first time
                  if (!objectDefChanges[object.name]) {
                    objectDefChanges[object.name] = [];
                  }
                  if (
                    !objectDefChanges[object.name].some(
                      (x) => x.object == object
                    )
                  ) {
                    // add to array
                    objectDefChanges[object.name].push({
                      key: key,
                      object: object,
                      parents: parents,
                    });
                  }
                }
              } else {
                this.log(
                  object.name,
                  "you must access a property on the when referring to the identifier (accessors must be hard-coded literals)"
                );

                isIllegal = true;
              }

              if (isIllegal) {
                // this is illegal, delete it from being moved and delete accessor changes from happening
                this.log(object.name + " is illegal");
                delete objectDefs[object.name];
                delete objectDefChanges[object.name];
              }
            }
          }
        });

        var newVariableDeclarations: {
          name: string;
          map: string;
          object: Node;
          parents: Node[];
        }[] = [];
        Object.keys(objectDefs).forEach((name) => {
          if (
            !ComputeProbabilityMap(
              this.options.objectExtraction,
              (x) => x,
              name
            )
          ) {
            //continue;
            return;
          }

          var [object, parents] = objectDefs[name];

          var properties = object.properties;
          // change the prop names while extracting
          var newPropNames: { [key: string]: string } = {};
          properties.forEach((property: Node) => {
            var keyName = property.key.name || property.key.value;

            var nn = name + "_" + keyName;
            newPropNames[keyName] = nn;

            newVariableDeclarations.push({
              name: nn,
              object: this.addComment(property.value, `${name}.${keyName}`),
              parents: parents,
              map: name,
            });
          });

          // delete the original object declaration
          // deleteDirect(object, parents[0]);
          deleteDeclaration(object, parents);

          // The array can be uninitialized (no accessors, this object has no purpose)
          objectDefChanges[name] &&
            objectDefChanges[name].forEach((change) => {
              if (!change.key) {
                throw new Error("key undefined");
              }
              if (newPropNames[change.key]) {
                var memberExpression = change.parents[0];
                if (memberExpression.type == "MemberExpression") {
                  this.replace(
                    memberExpression,
                    this.addComment(
                      Identifier(newPropNames[change.key]),
                      `Original Accessor: ${name}.${change.key}`
                    )
                  );
                } else {
                  // Provide error with more information:
                  console.log(memberExpression);
                  this.error(
                    new Error(
                      `should be MemberExpression, found type=${memberExpression.type}`
                    )
                  );
                }
              } else {
                console.log(objectDefChanges[name], newPropNames);
                this.error(
                  new Error(
                    `"${change.key}" not found in [${Object.keys(
                      newPropNames
                    ).join(", ")}] while flattening ${name}.`
                  )
                );
              }
            });

          this.log(
            `Extracted ${
              Object.keys(newPropNames).length
            } properties from ${name}, affecting ${
              Object.keys(objectDefChanges[name] || {}).length
            } line(s) of code.`
          );
        });
        // put the new ones in
        newVariableDeclarations.forEach((x) => {
          var declaration: Node = VariableDeclaration(
            VariableDeclarator(x.name, x.object)
          );
          if (x.object.type == "FunctionExpression") {
            // Use FunctionDeclaration for functions
            declaration = {
              ...x.object,
              type: "FunctionDeclaration",
              id: Identifier(x.name),
            };
          }

          prepend(context, declaration);
        });
      }
    };
  }
}
