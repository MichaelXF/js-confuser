import { ObfuscateOrder } from "../order";
import { walk } from "../traverse";
import { isLoop } from "../util/compare";
import { Identifier } from "../util/gen";
import { clone } from "../util/insert";
import Transform from "./transform";

/**
 * Renames the labels to shorter names.
 */
export default class RenameLabels extends Transform {
  gen: ReturnType<Transform["getGenerator"]>;

  constructor(o) {
    super(o, ObfuscateOrder.RenameLabels);

    this.gen = this.getGenerator("randomized");
  }

  match(object, parents) {
    return object.type == "LabeledStatement";
  }

  transform(object, parents) {
    return () => {
      var newName = null;
      var isRemovable = object.body.type !== "BlockStatement";
      var labelNeverUsed = true;

      walk(object, parents, (o, p) => {
        if (o.type == "BreakStatement" || o.type == "ContinueStatement") {
          function isContinuableStatement(x, stmtParents) {
            return isLoop(x) && x.type !== "SwitchStatement";
          }
          function isBreakableStatement(x, stmtParents) {
            return (
              isLoop(x) ||
              (x.type == "BlockStatement" &&
                o.label &&
                stmtParents[0] &&
                stmtParents[0].type == "LabeledStatement")
            );
          }

          var fn =
            o.type == "ContinueStatement"
              ? isContinuableStatement
              : isBreakableStatement;

          var labelStatement = p.find((node, i) => {
            return fn(node, p.slice(i + 1));
          });

          if (o.label && o.label.name == object.label.name) {
            if (object.body == labelStatement && isRemovable) {
              // In same loop

              o.label = null;
            } else {
              if (!newName) {
                newName = this.gen.generate();
              }
              o.label = Identifier(newName);
              labelNeverUsed = false;
            }
          }
        }
      });

      if (newName) {
        object.label = Identifier(newName);
      } else if (isRemovable || labelNeverUsed) {
        this.replace(object, clone(object.body));
      }
    };
  }
}
