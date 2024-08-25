import * as t from "@babel/types";
import { NodePath, PluginObj } from "@babel/core";
import { PluginArg } from "./plugin";
import { Order } from "../order";

export default function ({ Plugin }: PluginArg): PluginObj {
  const me = Plugin(Order.RenameLabels);

  return {
    visitor: {
      Program(path) {
        const labelUsageMap = new Map<string, number>();

        // First pass: Collect all label usages
        path.traverse({
          LabeledStatement(labelPath) {
            const labelName = labelPath.node.label.name;
            labelUsageMap.set(labelName, 0);
          },
          BreakStatement(breakPath) {
            if (breakPath.node.label) {
              const labelName = breakPath.node.label.name;
              labelUsageMap.set(
                labelName,
                (labelUsageMap.get(labelName) || 0) + 1
              );
            }
          },
          ContinueStatement(continuePath) {
            if (continuePath.node.label) {
              const labelName = continuePath.node.label.name;
              labelUsageMap.set(
                labelName,
                (labelUsageMap.get(labelName) || 0) + 1
              );
            }
          },
        });

        // Generate short names for used labels
        const labelNameMap = new Map<string, string>();
        let labelCounter = 0;
        labelUsageMap.forEach((usageCount, labelName) => {
          if (usageCount > 0) {
            labelNameMap.set(labelName, `L${labelCounter++}`);
          }
        });

        // Second pass: Rename labels and remove unused ones
        path.traverse({
          LabeledStatement(labelPath) {
            const labelName = labelPath.node.label.name;
            if (labelUsageMap.get(labelName) === 0) {
              labelPath.remove();
            } else {
              const newLabelName = labelNameMap.get(labelName);
              if (newLabelName) {
                labelPath.node.label.name = newLabelName;
              }
            }
          },
          BreakStatement(breakPath) {
            if (breakPath.node.label) {
              const labelName = breakPath.node.label.name;
              const newLabelName = labelNameMap.get(labelName);
              if (newLabelName) {
                breakPath.node.label.name = newLabelName;
              }
            }
          },
          ContinueStatement(continuePath) {
            if (continuePath.node.label) {
              const labelName = continuePath.node.label.name;
              const newLabelName = labelNameMap.get(labelName);
              if (newLabelName) {
                continuePath.node.label.name = newLabelName;
              }
            }
          },
        });
      },
    },
  };
}
