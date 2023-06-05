import { reservedKeywords } from "../../constants";
import { Location, Node } from "../../util/gen";
import { getIdentifierInfo } from "../../util/identifiers";
import Transform from "../transform";

/**
 * Global Analysis is responsible for finding all the global variables used in the code.
 *
 * A 'global variable' is one that is:
 * - Referenced
 * - Never defined or overridden
 */
export default class GlobalAnalysis extends Transform {
  notGlobals: Set<string>;
  globals: { [name: string]: Location[] };

  constructor(o) {
    super(o);

    this.globals = Object.create(null);
    this.notGlobals = new Set();
  }

  match(object: Node, parents: Node[]) {
    return object.type == "Identifier" && !reservedKeywords.has(object.name);
  }

  transform(object: Node, parents: Node[]) {
    // no touching `import()` or `import x from ...`
    var importIndex = parents.findIndex(
      (x) => x.type == "ImportExpression" || x.type == "ImportDeclaration"
    );
    if (importIndex !== -1) {
      if (
        parents[importIndex].source === (parents[importIndex - 1] || object)
      ) {
        return;
      }
    }

    var info = getIdentifierInfo(object, parents);
    if (!info.spec.isReferenced) {
      return;
    }

    // Cannot be defined or overridden
    if (info.spec.isDefined || info.spec.isModified) {
      delete this.globals[object.name];

      this.notGlobals.add(object.name);
      return;
    }

    // Add to globals
    if (!this.notGlobals.has(object.name)) {
      if (!this.globals[object.name]) {
        this.globals[object.name] = [];
      }

      this.globals[object.name].push([object, parents]);
    }

    var assignmentIndex = parents.findIndex(
      (x) => x.type == "AssignmentExpression"
    );
    var updateIndex = parents.findIndex((x) => x.type == "UpdateExpression");

    if (
      (assignmentIndex != -1 &&
        parents[assignmentIndex].left ===
          (parents[assignmentIndex - 1] || object)) ||
      updateIndex != -1
    ) {
      var memberIndex = parents.findIndex((x) => x.type == "MemberExpression");
      if (
        memberIndex == -1 ||
        memberIndex > (assignmentIndex == -1 ? assignmentIndex : updateIndex)
      ) {
        delete this.globals[object.name];

        this.notGlobals.add(object.name);
      }
    }
  }
}
