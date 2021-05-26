import { ok } from "assert";
import { EventEmitter } from "events";
import { Node } from "./util/gen";
import traverse from "./traverse";
import {
  ObfuscateOptions,
  ProbabilityMap,
  isProbabilityMapProbable,
} from "./index";

import Transform from "./transforms/transform";

import Preparation from "./transforms/preparation/preparation";
import ObjectExtraction from "./transforms/extraction/objectExtraction";
import Lock from "./transforms/lock/lock";
import Dispatcher from "./transforms/dispatcher";
import DeadCode from "./transforms/deadCode";
import OpaquePredicates from "./transforms/opaquePredicates";
import Calculator from "./transforms/calculator";
import ControlFlowFlattening from "./transforms/controlFlowFlattening";
import Eval from "./transforms/eval";
import GlobalConcealing from "./transforms/identifier/globalConcealing";
import StringConcealing from "./transforms/string/stringConcealing";
import StringSplitting from "./transforms/string/stringSplitting";
import DuplicateLiteralsRemoval from "./transforms/extraction/duplicateLiteralsRemoval";
import Shuffle from "./transforms/shuffle";
import MovedDeclarations from "./transforms/identifier/movedDeclarations";
import RenameVariables from "./transforms/identifier/renameVariables";
import RenameLabels from "./transforms/renameLabels";
import Minify from "./transforms/minify";
import ES5 from "./transforms/es5";
import StringEncoding from "./transforms/string/stringEncoding";
import RGF from "./transforms/rgf";
import Flatten from "./transforms/flatten";

/**
 * Describes the order of transformations.
 */
export enum ObfuscateOrder {
  Preparation = 0,

  ObjectExtraction = 1,

  Lock = 2, // Includes Integrity & Anti Debug

  Dispatcher = 3,

  OpaquePredicates = 4,
  DeadCode = 5,

  Calculator = 6,

  // Fixes all If Statements
  ControlFlowFlattening = 7,

  Flatten = 7,
  RGF = 8,

  // Optional
  Eval = 8,

  GlobalConcealing = 9,

  // Hides all strings
  StringConcealing = 10,

  StringSplitting = 20,

  DuplicateLiteralsRemoval = 23,

  Shuffle = 24,

  MovedDeclarations = 25,

  RenameVariables = 26,

  RenameLabels = 27,

  Minify = 30,

  ES5 = 31,

  StringEncoding = 32,
}

/**
 * The parent transformation holding the `state`.
 */
export default class Obfuscator extends EventEmitter {
  varCount: number;
  transforms: { [name: string]: Transform };
  array: Transform[];

  state: "transform" | "eval" = "transform";

  constructor(public options: ObfuscateOptions) {
    super();

    this.varCount = 0;
    this.transforms = Object.create(null);

    this.push(new Preparation(this));
    this.push(new RenameLabels(this));

    const test = <T>(map: ProbabilityMap<T>, ...transformers: any[]) => {
      if (isProbabilityMapProbable(map)) {
        // options.verbose && console.log("+ Added " + transformer.name);

        transformers.forEach((Transformer) => this.push(new Transformer(this)));
      } else {
        // options.verbose && console.log("- Skipped adding " + transformer.name);
      }
    };

    // Optimization: Only add needed transformers. If a probability always return false, no need in running that extra code.
    test(options.objectExtraction, ObjectExtraction);
    test(options.deadCode, DeadCode);

    test(options.dispatcher, Dispatcher);
    test(options.controlFlowFlattening, ControlFlowFlattening);
    test(options.globalConcealing, GlobalConcealing);
    test(options.stringConcealing, StringConcealing);
    test(options.stringEncoding, StringEncoding);
    test(options.stringSplitting, StringSplitting);
    test(options.renameVariables, RenameVariables);
    test(options.eval, Eval);
    test(options.opaquePredicates, OpaquePredicates);
    test(options.duplicateLiteralsRemoval, DuplicateLiteralsRemoval);
    test(options.minify, Minify);

    test(options.calculator, Calculator);
    test(options.movedDeclarations, MovedDeclarations);

    test(options.es5, ES5);
    test(options.shuffle, Shuffle);

    test(options.flatten, Flatten);
    test(options.rgf, RGF);

    if (
      options.lock &&
      Object.keys(options.lock).filter((x) =>
        x == "domainLock" ? options.lock.domainLock.length : options.lock[x]
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
      ok(!this.transforms[transform.className], "Already have");
    }
    this.transforms[transform.className] = transform;
  }

  async apply(tree: Node, debugMode = false) {
    ok(tree.type == "Program", "The root node must be type 'Program'");
    ok(Array.isArray(tree.body), "The root's body property must be an array");
    ok(Array.isArray(this.array));

    this.state = "transform";

    for (var transform of this.array) {
      await transform.apply(tree);

      if (debugMode) {
        this.emit("debug", transform.className, tree);
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
          o.$eval();
        };
      }
    });

    if (this.options.verbose) {
      console.log("<- Done");
    }
  }
}
