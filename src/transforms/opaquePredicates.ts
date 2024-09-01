import { PluginObj } from "@babel/core";
import { PluginArg } from "./plugin";
import { Order } from "../order";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.OpaquePredicates);

  return {
    visitor: {},
  };
};
