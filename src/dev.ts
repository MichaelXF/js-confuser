import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = `
function run(){
  function fibonacci(num){   
    var a = 0, b = 1, c = num;
    while (num-- > 1) {
      c = a + b;
      a = b;
      b = c;
    }
    return c;
  }
  function log(i){   
    console.log(i, fibonacci(i))
  }
  function runLoop(){
    for ( var i = 1; i <= 1000; i++ ) {
      log(i)
    }
  }
  runLoop()
}
run();`;

var start = Date.now();
eval(code);

var codeTime = Date.now() - start;

var fetch = (() => {}).bind(this);
(global as any).userAuthenticated = true;

var window = { location: { href: "https://mywebsite.com" } };
var location = window.location;

JsConfuser.debugTransformations(code, {
  target: "node",
  rgf: "all",
  preset: "high",
  eval: true,
  lock: {
    integrity: true,
    nativeFunctions: ["fetch"],
    context: ["userAuthenticated"],
    endDate: Date.now() + 1000 * 60 * 60 * 24,
    startDate: Date.now() - 1000 * 60 * 60 * 24,
    domainLock: ["mywebsite.com"],
  },
}).then((frames) => {
  var output;
  var slowest = -1;

  frames.forEach((frame, i) => {
    console.log(frame.name + ":", frame.ms + "ms");

    output = frame.code;

    if (slowest == -1 || frames[slowest].ms < frame.ms) {
      slowest = i;
    }
  });

  function ms(ms) {
    if (ms > 10_000) {
      return Math.floor(ms / 100) / 10 + " seconds";
    }

    return Math.floor(ms) + "ms";
  }

  var start = Date.now();
  console.log(output);
  eval(output);

  var obfuscatedTime = Date.now() - start;

  var slower = obfuscatedTime / codeTime;
  var space = output.length / code.length;

  console.log(`
  Code Size: ${code.length}
  Code Time: ${ms(codeTime)}

  Obfuscated Code Size: ${output.length}
  Obfuscated Code Time: ${ms(obfuscatedTime)}

  The obfuscated code runs ${
    Math.floor(slower * 10) / 10
  }x slower and takes up ${Math.floor(space * 10) / 10}x more space.

  Compile Time: ${ms(frames.reduce((a, b) => a + b.ms, 0))}
  Slowest Transformation: ${frames[slowest].name} (${ms(frames[slowest].ms)})
  Average Transformation: ${ms(
    frames.reduce((a, b) => a + b.ms, 0) / frames.length
  )}
  `);

  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });
});
