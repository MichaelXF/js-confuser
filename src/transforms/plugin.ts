import { PluginObj } from "@babel/core";
import * as babelTypes from "@babel/types";
import Obfuscator from "../obfuscator";
import { getRandomString } from "../utils/random-utils";
import { Order } from "../order";

export type PluginFunction = (pluginArg: PluginArg) => PluginObj["visitor"];

export type PluginArg = {
  Plugin: (order: Order) => PluginInstance;
};

export class PluginInstance {
  constructor(
    public pluginOptions: { name?: string; order?: number },
    public obfuscator: Obfuscator
  ) {}

  get name() {
    return this.pluginOptions.name || "unnamed";
  }

  get order() {
    return this.pluginOptions.order;
  }

  get options() {
    return this.obfuscator.options;
  }

  getPlaceholder(suffix = "") {
    return "__p_" + getRandomString(6) + (suffix ? "_" + suffix : "");
  }

  generateRandomIdentifier() {
    return "_" + getRandomString(6);
  }

  log(...messages: any[]) {
    if (this.options.verbose) {
      console.log(`[${this.name}]`, ...messages);
    }
  }

  warn(...messages: any[]) {
    if (this.options.verbose) {
      console.warn(`[${this.name}]`, ...messages);
    }
  }

  error(...messages: any[]) {
    throw new Error(`[${this.name}] ${messages.join(", ")}`);
  }
}
