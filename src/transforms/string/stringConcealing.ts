import * as t from "@babel/types";
import { NodePath, PluginObj } from "@babel/core";
import Template from "../../templates/template";
import { PluginArg } from "../plugin";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin("stringConcealing");
  var decoderName = "decoder";

  return {
    visitor: {
      Program: {
        exit(programPath: NodePath<t.Program>) {
          // Create the decoder function
          const decoderFunction = new Template(`
            function {decoderName}(encoded) {
              return Buffer.from(encoded, "base64").toString("utf-8");
          }
            `).single({
            decoderName,
          });

          // Insert the decoder function at the top of the program body
          var path = programPath.unshiftContainer("body", decoderFunction)[0];

          // Skip transformation for the inserted decoder function
          path.skip();
        },
      },

      StringLiteral: {
        exit(path: NodePath<t.StringLiteral>) {
          const originalValue = path.node.value;
          const encodedValue = Buffer.from(originalValue, "utf-8").toString(
            "base64"
          );

          // Replace the string literal with a call to the decoder function
          path.replaceWith(
            t.callExpression(t.identifier(decoderName), [
              t.stringLiteral(encodedValue),
            ])
          );

          // Skip the transformation for the newly created node
          path.skip();
        },
      },
    },
  };
};
