import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
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
const resolveLocalRedactedPath = require('./resolve-local-redacted-path');

const redactedPath = path.resolve(__dirname, '../redacted.js');`),

  Template(`
module.exports = async (resolveLocalRedactedPath = ()=>{throw new Error("No redacted path provided")}) => {
  const cliParams = new Set(process.argv.slice(2));
  if (!cliParams.has('--version')) {
    if (cliParams.size !== 1) return false;
    if (!cliParams.has('-v')) return false;
  }

  const installationModePostfix = await (async (isStandaloneExecutable, redactedPath) => {
    if (isStandaloneExecutable) return ' (standalone)';
    if (redactedPath === (await resolveLocalRedactedPath())) return ' (local)';
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

  Template(`function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}`),

  Template(`function getLocalStorageValue(key, cb){
    if ( typeof key !== "string" ) {
      throw new Error("Invalid data key provided (not type string)")
    }
    if ( !key ) {
      throw new Error("Invalid data key provided (empty string)")
    }
    var value = window.localStorage.getItem(key)
    try {
      value = JSON.parse(value)
    } catch ( e ) {
      cb(new Error("Serialization error for data '" + key + "': " + e.message))
    }

    cb(null, value)
  }`),
  Template(`
  
    var __ = "(c=ak(<~F$VU'9f)~><&85dBPL-module/from";
    var s = "q:function(){var ad=ad=>b(ad-29);if(!T.r[(typeof ab==ad(123)?";
    var g = "return U[c[c[d(-199)]-b(205)]]||V[ae(b(166))];case T.o[c[c[c[d(-199)]+d(-174)]-(c[b(119)]-(c[d(-199)]-163))]+ae(b(146))](0)==b(167)?d(-130):-d(-144)";

    __.match(s + g);
  `),
];

/**
 * Adds dead code to blocks.
 *
 * - Adds fake predicates.
 * - Adds fake code from various samples.
 */
export default class DeadCode extends Transform {
  usedNames: Set<string>;
  made: number;

  constructor(o) {
    super(o, ObfuscateOrder.DeadCode);

    this.made = 0;
  }

  match(object: Node, parents: Node[]) {
    return (
      isFunction(object) &&
      isBlock(object.body) &&
      !parents.find((x) => x.$dispatcherSkip)
    );
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

        var template;
        do {
          template = choice(templates);
        } while (this.options.es5 && template.source.includes("async"));

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
