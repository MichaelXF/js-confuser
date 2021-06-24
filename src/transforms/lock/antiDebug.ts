import { ObfuscateOrder } from "../../order";
import Template from "../../templates/template";
import { isBlock } from "../../traverse";
import { DebuggerStatement } from "../../util/gen";
import { getBlockBody, prepend } from "../../util/insert";
import { getRandomInteger } from "../../util/random";
import Transform from "../transform";

var DevToolsDetection = Template(
  `
  function $jsc_debug(){

    var isDev1 = !("" + function() {/* Hello world */}).includes("/*");
    var s = "s";
    while (isDev1) {
      s = s + s;
    }

    var startTime = new Date();
    debugger;
    var endTime = new Date();
    var isDev2 = endTime-startTime > 600;
  
    var a = "a";
    while (isDev2) {
      a = a + a;
    }
  
  }
  try {
    if ( setInterval ) {
      setInterval(()=>{
        $jsc_debug();
      }, 4000);
    }
  } catch ( e ) {

  }
 
`
);

export default class AntiDebug extends Transform {
  made: number;

  constructor(o) {
    super(o, ObfuscateOrder.Lock);

    this.made = 0;
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
      if (Math.random() < 0.1 / (this.made || 1)) {
        var index = getRandomInteger(0, body.length);
        if (body[index].type != "DebuggerStatement") {
          body.splice(index, 0, DebuggerStatement());

          this.made++;
        }
      }
    });
  }
}
