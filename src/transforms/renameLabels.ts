import * as t from "@babel/types";
import { NodePath } from "@babel/traverse";
import { PluginArg, PluginObject } from "./plugin";
import { Order } from "../order";
import { NameGen } from "../utils/NameGen";
import { ok } from "assert";

const LABEL = Symbol("label");

interface LabelInterface {
  label?: string;
  renamed?: string;
  removed: boolean;
  required: boolean;
  paths: NodePath<t.BreakStatement | t.ContinueStatement>[];
}

interface NodeLabel {
  [LABEL]?: LabelInterface;
}

export default function ({ Plugin }: PluginArg): PluginObject {
  const me = Plugin(Order.RenameLabels, {
    changeData: {
      labelsRenamed: 0,
      labelsRemoved: 0,
    },
  });

  return {
    visitor: {
      Program(path) {
        const allLabelInterfaces: LabelInterface[] = [];

        // First pass: Collect all label usages
        path.traverse({
          LabeledStatement(labelPath) {
            const labelInterface = {
              label: labelPath.node.label.name,
              removed: false,
              required: false,
              paths: [],
            };
            allLabelInterfaces.push(labelInterface);
            (labelPath.node as NodeLabel)[LABEL] = labelInterface;
          },
          "BreakStatement|ContinueStatement"(_path) {
            const path = _path as NodePath<
              t.BreakStatement | t.ContinueStatement
            >;

            if (path.node.label) {
              const labelName = path.node.label.name;
              let targets: NodePath<
                t.For | t.While | t.BlockStatement | t.SwitchStatement
              >[] = [];

              let onlySearchLoops = path.isContinueStatement();

              let currentPath: NodePath = path;
              while (currentPath) {
                if (
                  currentPath.isFor() ||
                  currentPath.isWhile() ||
                  currentPath.isSwitchStatement()
                ) {
                  targets.push(currentPath);
                }

                if (
                  currentPath.isBlockStatement() &&
                  currentPath.parentPath.isLabeledStatement()
                ) {
                  targets.push(currentPath);
                }

                currentPath = currentPath.parentPath;
              }

              const target = targets.find(
                (label) =>
                  label.parentPath &&
                  label.parentPath.isLabeledStatement() &&
                  label.parentPath.node.label.name === labelName
              );

              if (onlySearchLoops) {
                // Remove BlockStatements and SwitchStatements from the list of targets
                // a continue statement only target loops
                // This helps remove unnecessary labels when a continue is nested with a block statement
                // ex: for-loop with if-statement continue
                targets = targets.filter(
                  (target) =>
                    !target.isBlockStatement() && !target.isSwitchStatement()
                );
              }

              ok(target);

              const isRequired =
                target.isBlockStatement() || targets[0] !== target;

              const labelInterface = (target.parentPath.node as NodeLabel)[
                LABEL
              ];

              if (isRequired) {
                labelInterface.required = true;
              } else {
                // Label is not required here, remove it for this particular break/continue statement
                path.node.label = null;
              }

              if (!labelInterface.paths) {
                labelInterface.paths = [];
              }
              labelInterface.paths.push(path);
            }
          },
        });

        const nameGen = new NameGen(me.options.identifierGenerator);

        for (var labelInterface of allLabelInterfaces) {
          const isRequired = labelInterface.required;
          if (isRequired) {
            var newName = labelInterface.label;
            if (
              me.computeProbabilityMap(
                me.options.renameLabels,
                labelInterface.label
              )
            ) {
              newName = nameGen.generate();
            }
            labelInterface.renamed = newName;
            me.changeData.labelsRenamed++;
          } else {
            labelInterface.removed = true;
            me.changeData.labelsRemoved++;
          }
        }

        // Second pass: Rename labels and remove unused ones
        path.traverse({
          LabeledStatement(labelPath) {
            const labelInterface = (labelPath.node as NodeLabel)[LABEL];
            if (labelInterface) {
              // Remove label but replace it with its body
              if (labelInterface.removed) {
                labelPath.replaceWith(labelPath.node.body);
              }

              // Else keep the label but rename it
              if (typeof labelInterface.renamed === "string") {
                labelPath.node.label.name = labelInterface.renamed;
              }

              // Update all break/continue statements
              for (var breakPath of labelInterface.paths) {
                // Remove label from break/continue statement
                if (labelInterface.removed) {
                  breakPath.node.label = null;
                } else {
                  // Update label name
                  breakPath.node.label = t.identifier(labelInterface.renamed);
                }
              }
            }
          },
        });
      },
    },
  };
}
