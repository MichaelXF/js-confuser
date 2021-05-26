import { ComputeProbabilityMap } from "../index";
import { ObfuscateOrder } from "../obfuscator";
import Template from "../templates/template";
import { isBlock } from "../traverse";
import {
  Identifier,
  IfStatement,
  Literal,
  Node,
  VariableDeclaration,
  VariableDeclarator,
} from "../util/gen";
import { getBlockBody, isFunction, prepend } from "../util/insert";
import { choice, getRandomInteger } from "../util/random";
import Transform from "./transform";

const templates = [
  Template(`
  function curCSS( elem, name, computed ) {
    var ret;
  
    computed = computed || getStyles( elem );
  
    if ( computed ) {
      ret = computed.getPropertyValue( name ) || computed[ name ];
  
      if ( ret === "" && !isAttached( elem ) ) {
        ret = redacted.style( elem, name );
      }
    }
  
    return ret !== undefined ?
  
      // Support: IE <=9 - 11+
      // IE returns zIndex value as an integer.
      ret + "" :
      ret;
  }`),
  Template(`
  function Example() {
    var state = redacted.useState(false);
    return x(
      ErrorBoundary,
      null,
      x(
        DisplayName,
        null,
      )
    );
  }`),

  Template(`
  const path = require('path');
const { version } = require('../../package');
const { version: dashboardPluginVersion } = require('@redacted/enterprise-plugin/package');
const { version: componentsVersion } = require('@redacted/components/package');
const { sdkVersion } = require('@redacted/enterprise-plugin');
const isStandaloneExecutable = require('../utils/isStandaloneExecutable');
const resolveLocalredactedPath = require('./resolve-local-redacted-path');

const redactedPath = path.resolve(__dirname, '../redacted.js');`),

  Template(`
module.exports = async () => {
  const cliParams = new Set(process.argv.slice(2));
  if (!cliParams.has('--version')) {
    // Ideally we should output version info in whatever context "--version" or "-v" params
    // are used. Still "-v" is defined also as a "--verbose" alias in some commands.
    // Support for "--verbose" is expected to go away with
    // https://github.com/redacted/redacted/issues/1720
    // Until that's addressed we can recognize "-v" only as top-level param
    if (cliParams.size !== 1) return false;
    if (!cliParams.has('-v')) return false;
  }

  const installationModePostfix = await (async () => {
    if (isStandaloneExecutable) return ' (standalone)';
    if (redactedPath === (await resolveLocalredactedPath())) return ' (local)';
    return '';
  })();

  return true;
};`),
  Template(`
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}`),
];

/**
 * Adds dead code to blocks.
 *
 * - Adds fake variables.
 * - Adds fake predicates.
 * - Adds fake code from various samples.
 */
export default class DeadCode extends Transform {
  usedNames: Set<string>;
  made: number;

  constructor(o) {
    super(o, ObfuscateOrder.DeadCode);

    this.usedNames = new Set();
    this.made = 0;
  }

  match(object: Node, parents: Node[]) {
    return isFunction(object) && isBlock(object.body);
  }

  transform(object: Node, parents: Node[]) {
    if (ComputeProbabilityMap(this.options.deadCode)) {
      return () => {
        this.made++;
        if (this.made > 100) {
          return;
        }

        var name = this.getPlaceholder();
        var variableDeclaration = VariableDeclaration(
          VariableDeclarator(name, Literal(false))
        );

        var body = getBlockBody(object);
        var index = getRandomInteger(0, body.length);

        var template = choice(templates);

        var ifStatement = IfStatement(
          Identifier(name),
          template.compile(),
          null
        );

        body.splice(index, 0, ifStatement);
        prepend(object, variableDeclaration);
      };
    }
  }
}
