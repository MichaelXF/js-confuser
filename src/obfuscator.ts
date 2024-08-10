import { ok } from "assert";
import { EventEmitter } from "events";
import { Node } from "./util/gen";
import traverse from "./traverse";
import { ObfuscateOptions } from "./options";
import { ProbabilityMap, isProbabilityMapProbable } from "./probability";

import Transform from "./transforms/transform";

import Preparation from "./transforms/preparation";
import ObjectExtraction from "./transforms/extraction/objectExtraction";
import Lock from "./transforms/lock/lock";
import Dispatcher from "./transforms/dispatcher";
import DeadCode from "./transforms/deadCode";
import OpaquePredicates from "./transforms/opaquePredicates";
import Calculator from "./transforms/calculator";
import ControlFlowFlattening from "./transforms/controlFlowFlattening/controlFlowFlattening";
import GlobalConcealing from "./transforms/identifier/globalConcealing";
import StringSplitting from "./transforms/string/stringSplitting";
import StringConcealing from "./transforms/string/stringConcealing";
import StringCompression from "./transforms/string/stringCompression";
import DuplicateLiteralsRemoval from "./transforms/extraction/duplicateLiteralsRemoval";
import Shuffle from "./transforms/shuffle";
import MovedDeclarations from "./transforms/identifier/movedDeclarations";
import RenameVariables from "./transforms/identifier/renameVariables";
import RenameLabels from "./transforms/renameLabels";
import Minify from "./transforms/minify";
import ES5 from "./transforms/es5/es5";
import RGF from "./transforms/rgf";
import Flatten from "./transforms/flatten";
import Stack from "./transforms/stack";
import AntiTooling from "./transforms/antiTooling";
import Finalizer from "./transforms/finalizer";

/**
 * The parent transformation holding the `state`.
 */
export default class Obfuscator extends EventEmitter {
  varCount: number;
  transforms: { [name: string]: Transform };
  array: Transform[];

  state: "transform" | "eval" = "transform";
  generated: Set<string>;

  totalPossibleTransforms: number;

  constructor(public options: ObfuscateOptions) {
    super();

    this.varCount = 0;
    this.transforms = Object.create(null);
    this.generated = new Set();
    this.totalPossibleTransforms = 0;

    const test = <T>(map: ProbabilityMap<T>, ...transformers: any[]) => {
      this.totalPossibleTransforms += transformers.length;

      if (isProbabilityMapProbable(map)) {
        // options.verbose && console.log("+ Added " + transformer.name);

        transformers.forEach((Transformer) => this.push(new Transformer(this)));
      } else {
        // options.verbose && console.log("- Skipped adding " + transformer.name);
      }
    };

    // Optimization: Only add needed transformers. If a probability always return false, no need in running that extra code.
    test(true, Preparation);
    test(true, RenameLabels);

    test(options.objectExtraction, ObjectExtraction);
    test(options.flatten, Flatten);
    test(options.rgf, RGF);
    test(options.dispatcher, Dispatcher);
    test(options.deadCode, DeadCode);
    test(options.calculator, Calculator);
    test(options.controlFlowFlattening, ControlFlowFlattening);
    test(options.globalConcealing, GlobalConcealing);
    test(options.opaquePredicates, OpaquePredicates);
    test(options.stringSplitting, StringSplitting);
    test(options.stringConcealing, StringConcealing);
    test(options.stringCompression, StringCompression);
    test(options.stack, Stack);
    test(options.duplicateLiteralsRemoval, DuplicateLiteralsRemoval);
    test(options.shuffle, Shuffle);
    test(options.movedDeclarations, MovedDeclarations);
    test(options.minify, Minify);
    test(options.renameVariables, RenameVariables);
    test(options.es5, ES5);

    test(true, AntiTooling);
    test(true, Finalizer); // String Encoding, Hexadecimal Numbers, BigInt support is included

    if (
      options.lock &&
      Object.keys(options.lock).filter((x) =>
        x == "domainLock"
          ? options.lock.domainLock && options.lock.domainLock.length
          : options.lock[x]
      ).length
    ) {
      test(true, Lock);
    }

    // Make array
    this.array = Object.values(this.transforms);

    // Sort transformations based on their priority
    this.array.sort((a, b) => a.priority - b.priority);
  }

  push(transform: Transform) {
    if (transform.className) {
      ok(
        !this.transforms[transform.className],
        "Already have " + transform.className
      );
    }
    this.transforms[transform.className] = transform;
  }

  resetState() {
    this.varCount = 0;
    this.generated = new Set();
    this.state = "transform";
  }

  async apply(tree: Node, debugMode = false) {
    ok(tree.type == "Program", "The root node must be type 'Program'");
    ok(Array.isArray(tree.body), "The root's body property must be an array");
    ok(Array.isArray(this.array));

    this.resetState();

    var completed = 0;
    for (var transform of this.array) {
      await transform.apply(tree);
      completed++;

      if (debugMode) {
        this.emit("debug", transform.className, tree, completed);
      }
    }

    if (this.options.verbose) {
      console.log("-> Check for Eval Callbacks");
    }

    this.state = "eval";

    // Find eval callbacks
    traverse(tree, (o, p) => {
      if (o.$eval) {
        return () => {
          o.$eval(o, p);
        };
      }
    });

    if (this.options.verbose) {
      console.log("<- Done");
    }
  }
}
