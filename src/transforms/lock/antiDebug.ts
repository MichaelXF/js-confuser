import { ObfuscateOrder } from "../../obfuscator";
import Template from "../../templates/template";
import { isBlock } from "../../traverse";
import { DebuggerStatement } from "../../util/gen";
import { getBlockBody, prepend } from "../../util/insert";
import { getRandomInteger } from "../../util/random";
import Transform from "../transform";

var DevToolsDetection = Template(
  `
  function $jsc_debug(){
    var startTime = new Date();
    debugger;
    var endTime = new Date();
    var isDev = endTime-startTime > 400;
  
    while (isDev) {
      debugger;
      (function () {}). constructor ("debugger") ()
    }
  
  }
  if ( this.setInterval ) {
    this.setInterval(()=>{
      $jsc_debug();
    }, 10000);
  }
`
);

export default class AntiDebug extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.Lock);
  }

  apply(tree) {
    super.apply(tree);

    tree.body.unshift(...DevToolsDetection.compile());
  }

  match(object, parents) {
    return isBlock(object);
  }

  transform(object, parents) {
    var body = getBlockBody(object.body);

    [...body].forEach((stmt) => {
      if (Math.random() > 0.5) {
        var index = getRandomInteger(0, body.length);
        if (body[index].type != "DebuggerStatement") {
          body.splice(index, 0, DebuggerStatement());
        }
      }
    });
  }
}
