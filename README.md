# JS Confuser

JS-Confuser is a JavaScript obfuscation tool to make your programs _impossible_ to read. [Try the web version](https://hungry-shannon-c1ce6b.netlify.app/).

## Key features

- Variable renaming
- Control Flow obfuscation
- String concealing
- Function obfuscation
- Locks (domainLock, date)
- [Detect changes to source code](https://github.com/MichaelXF/js-confuser/blob/master/Integrity.md)

## Presets

JS-Confuser comes with three presets built into the obfuscator.
| Preset | Transforms | Performance Reduction | Sample |
| --- | --- | --- | --- |
| High | 21/22 | 98% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/high.js) |
| Medium | 15/22 | 52% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/medium.js) |
| Low | 10/22 | 30% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/low.js) |

You can extend each preset or all go without them entirely.

## Installation

```bash
$ npm install js-confuser
```

## Usage

```js
var JsConfuser = require("js-confuser");

JsConfuser.obfuscate(`
  function fibonacci(num){   
    if (num == 1)
        return 0;
    if (num == 2)
        return 1;
    return fibonacci(num - 1) + fibonacci(num - 2);
  }

  for ( var i = 1; i < 25; i++ ) {
    console.log(i, fibonacci(i))
  }
`, {
  target: "node",
  preset: "high",
  stringEncoding: false, // <- Normally enabled
}).then((obfuscated) => {
  console.log(obfuscated);
});
/**
var GEBdbS,hZRFJf,a1cvUL,UqEA7S8,sjPW_n,vzZSeu,lzbyr9,mVOXvTD;GEBdbS=[977,15,12,17,18,9,892,459,20,689,2,5,1,33,4,8,13,14,16,10,3,11,485,6],hZRFJf=GEBdbS;for(var KRKwiW6=86;KRKwiW6;KRKwiW6--)hZRFJf.unshift(hZRFJf.pop());a1cvUL=mWmdzh('length1charCodeAt1slice1replaĕ1!ğğ1uģģ1<~A8bt#D.RU,~>Ħ~Eb/ci@ru9mĳĵļH7+DertŁħAU&0.ķ0;Tŋ~4ŕĴħ3rŖ4)eVMBK\\!Ŗ5u^0X8PBŖ9JnLkBJNNŖCi<qűL;6NG=$?ŖƅQ:C=aCƉAg,FD+=Ŗ6UQ!9Bi"ĳ').split('1');function rzblFte(hZRFJf){var a1cvUL,UqEA7S8,sjPW_n,vzZSeu,lzbyr9,mVOXvTD,KRKwiW6,rzblFte,LFYnS9,mjkOZ_,Ep8MJLB;a1cvUL=void 0,UqEA7S8=void 0,sjPW_n=void 0,vzZSeu=void 0,lzbyr9=void 0,mVOXvTD=String,KRKwiW6=cPTTaEf(0),rzblFte=255,LFYnS9=cPTTaEf(GEBdbS[2]),mjkOZ_=cPTTaEf(2),Ep8MJLB=cPTTaEf(3);for('<~'===hZRFJf[mjkOZ_](0,GEBdbS[0])&&'~>'===hZRFJf[mjkOZ_](-GEBdbS[0]),hZRFJf=hZRFJf[mjkOZ_](2,-GEBdbS[0])[Ep8MJLB](/s/g,'')[Ep8MJLB]('z',cPTTaEf(GEBdbS[4])),a1cvUL=cPTTaEf(GEBdbS[1])[mjkOZ_](hZRFJf[KRKwiW6]%GEBdbS[1]||GEBdbS[1]),hZRFJf+=a1cvUL,sjPW_n=[],vzZSeu=0,lzbyr9=hZRFJf[KRKwiW6];lzbyr9>vzZSeu;vzZSeu+=GEBdbS[1])UqEA7S8=52200625*(hZRFJf[LFYnS9](vzZSeu)-GEBdbS[3])+614125*(hZRFJf[LFYnS9](vzZSeu+GEBdbS[2])-GEBdbS[3])+7225*(hZRFJf[LFYnS9](vzZSeu+2)-GEBdbS[3])+85*(hZRFJf[LFYnS9](vzZSeu+GEBdbS[10])-33)+(hZRFJf[LFYnS9](vzZSeu+GEBdbS[4])-GEBdbS[3]),sjPW_n.push(rzblFte&UqEA7S8>>24,rzblFte&UqEA7S8>>GEBdbS[8],rzblFte&UqEA7S8>>GEBdbS[5],rzblFte&UqEA7S8);return function(hZRFJf,sjPW_n){for(var a1cvUL=sjPW_n;a1cvUL>0;a1cvUL--)hZRFJf.pop()}(sjPW_n,a1cvUL[KRKwiW6]),mVOXvTD.fromCharCode.apply(mVOXvTD,sjPW_n)}UqEA7S8=[cPTTaEf(GEBdbS[13]),cPTTaEf(7),cPTTaEf(GEBdbS[5]),cPTTaEf(GEBdbS[19]),cPTTaEf(GEBdbS[9]),cPTTaEf(GEBdbS[11]),cPTTaEf(GEBdbS[16]),cPTTaEf(GEBdbS[6]),cPTTaEf(GEBdbS[7]),cPTTaEf(GEBdbS[6]),cPTTaEf(GEBdbS[15]),cPTTaEf(13),cPTTaEf(GEBdbS[7]),cPTTaEf(GEBdbS[8]),cPTTaEf(GEBdbS[17]),cPTTaEf(GEBdbS[18]),cPTTaEf(GEBdbS[7]),cPTTaEf(19),cPTTaEf(GEBdbS[6]),cPTTaEf(GEBdbS[6]),cPTTaEf(GEBdbS[8])];function LFYnS9(GEBdbS){return rzblFte(UqEA7S8[GEBdbS])}function mjkOZ_(){try{return global}catch(GEBdbS){return this}}sjPW_n=mjkOZ_.call(this);function Ep8MJLB(hZRFJf){switch(hZRFJf){case-182:return sjPW_n[LFYnS9(0)];case 0:return sjPW_n[LFYnS9(1)];case-GEBdbS[20]:return sjPW_n[LFYnS9(GEBdbS[0])]}}vzZSeu=740;function Ob630G(hZRFJf,a1cvUL,UqEA7S8){switch(hZRFJf){case-GEBdbS[14]:return a1cvUL*UqEA7S8;case-GEBdbS[12]:return a1cvUL+UqEA7S8;case-431:return a1cvUL!==UqEA7S8;case-125:return a1cvUL-UqEA7S8;case GEBdbS[21]:return a1cvUL<UqEA7S8;case-GEBdbS[23]:return a1cvUL>UqEA7S8}}lzbyr9={vuE_wDD:[],UxpRrE1:function(){var hZRFJf;hZRFJf=false;if(hZRFJf){var a1cvUL=(hZRFJf,a1cvUL,UqEA7S8)=>{var sjPW_n;sjPW_n=GEBdbS[7];while(sjPW_n!=GEBdbS[9]){var vzZSeu,lzbyr9,mVOXvTD;vzZSeu=sjPW_n*-118+-160;switch(vzZSeu){case-1812:lzbyr9=new Date,sjPW_n+=16;break;case-2048:mVOXvTD=Ob630G(-485,LFYnS9(GEBdbS[10]),lzbyr9.toUTCString()),sjPW_n+=GEBdbS[11];break;case-3346:Ep8MJLB(-182).cookie=Ob630G(-GEBdbS[12],Ob630G(-485,Ob630G(-GEBdbS[12],Ob630G(-485,Ob630G(-GEBdbS[12],hZRFJf,LFYnS9(GEBdbS[4])),a1cvUL),LFYnS9(5)),mVOXvTD),LFYnS9(GEBdbS[13])),sjPW_n-=17;break;case-3700:lzbyr9.setTime(Ob630G(-485,lzbyr9.getTime(),Ob630G(-977,Ob630G(-GEBdbS[14],Ob630G(-GEBdbS[14],Ob630G(-GEBdbS[14],UqEA7S8,24),60),60),1e3))),sjPW_n-=GEBdbS[7]}}}}if(!lzbyr9.vuE_wDD[0]){lzbyr9.vuE_wDD.push(-96)}return lzbyr9.vuE_wDD.length},jg10J1a:12,JyMfDQo:[],UPI1n0:function(){if(!lzbyr9.JyMfDQo[0]){lzbyr9.JyMfDQo.push(92)}return lzbyr9.JyMfDQo.length}},mVOXvTD=[];function _Guc0N(...hZRFJf){var a1cvUL;a1cvUL=28;while(a1cvUL!=58){var UqEA7S8,sjPW_n,vzZSeu;UqEA7S8=a1cvUL*-186+242;switch(UqEA7S8){case-4966:sjPW_n=false,a1cvUL+=GEBdbS[5];break;case-6454:hZRFJf.length=GEBdbS[2],a1cvUL+=1;break;case-6640:[vzZSeu]=this,a1cvUL+=GEBdbS[15];break;case-9430:if(sjPW_n){var KRKwiW6=(hZRFJf,a1cvUL,UqEA7S8)=>{var sjPW_n;sjPW_n=29;while(sjPW_n!=3){var vzZSeu,KRKwiW6;vzZSeu=sjPW_n*67+-138;switch(vzZSeu){case 1671:if(UqEA7S8){var lzbyr9;lzbyr9=GEBdbS[13];while(lzbyr9!=5){var mVOXvTD;mVOXvTD=lzbyr9*109+-166;switch(mVOXvTD){case 488:KRKwiW6=UqEA7S8.getPropertyValue(a1cvUL)||UqEA7S8[a1cvUL],lzbyr9+=GEBdbS[16];break;case 1796:if(KRKwiW6===''&&!isAttached(hZRFJf)){KRKwiW6=Ep8MJLB(0).style(hZRFJf,a1cvUL)}lzbyr9-=GEBdbS[6]}}}sjPW_n-=7;break;case 1604:UqEA7S8=UqEA7S8||getStyles(hZRFJf),sjPW_n+=1;break;case 1202:return Ob630G(-431,KRKwiW6,void 0)?Ob630G(-GEBdbS[12],KRKwiW6,''):KRKwiW6;case 1805:KRKwiW6=void 0,sjPW_n-=GEBdbS[10]}}}}a1cvUL-=GEBdbS[18];break;case-6082:if(hZRFJf[0]==GEBdbS[2]&&lzbyr9.UxpRrE1()){return[0]}a1cvUL-=GEBdbS[22];break;case-2362:if(hZRFJf[0]==GEBdbS[0]){return[GEBdbS[2]]}return[Ob630G(-GEBdbS[12],(mVOXvTD=[Ob630G(-125,hZRFJf[0],1)],new YDq3Z1i(LFYnS9(7),void 0,LFYnS9(GEBdbS[5])).YQtflQU),(mVOXvTD=[Ob630G(-125,hZRFJf[0],2)],YDq3Z1i(LFYnS9(GEBdbS[19]))))];case-316:return[]}}}while(vzZSeu!=333){var ZJf0h_O,vYvKsW5;ZJf0h_O=vzZSeu*102+-216;switch(ZJf0h_O){case 42420:vzZSeu+=0;break;case 20694:vzZSeu+=0;break;case 36198:vYvKsW5++,vzZSeu+=463;break;case 80364:Ep8MJLB(-GEBdbS[20])[LFYnS9(10)](vYvKsW5,(mVOXvTD=[vYvKsW5],new YDq3Z1i(LFYnS9(GEBdbS[11]),void 0,LFYnS9(GEBdbS[16])).YQtflQU)),vzZSeu-=433;break;case 83424:vzZSeu-=Ob630G(GEBdbS[21],vYvKsW5,25)?30:487;break;case 75264:vYvKsW5=GEBdbS[2],vzZSeu+=80}}function YDq3Z1i(hZRFJf,a1cvUL,UqEA7S8){var sjPW_n;sjPW_n=38;while(sjPW_n!=GEBdbS[0]){var vzZSeu,KRKwiW6,rzblFte;vzZSeu=sjPW_n*44+32;switch(vzZSeu){case 1440:KRKwiW6=a1cvUL==LFYnS9(GEBdbS[6])&&lzbyr9.UPI1n0()?function(...a1cvUL){mVOXvTD=a1cvUL;return rzblFte[hZRFJf].call(this,LFYnS9(GEBdbS[7]))}:rzblFte[hZRFJf](LFYnS9(15)),sjPW_n-=31;break;case 76:return UqEA7S8==LFYnS9(GEBdbS[8])?{YQtflQU:KRKwiW6}:KRKwiW6;case 1616:KRKwiW6=void 0;if(a1cvUL==LFYnS9(GEBdbS[17])){mVOXvTD=[]}sjPW_n-=GEBdbS[4];break;case 1704:rzblFte={[LFYnS9(GEBdbS[18])]:function(hZRFJf,a1cvUL,UqEA7S8){var sjPW_n;sjPW_n=GEBdbS[22];while(sjPW_n!=GEBdbS[1]){var vzZSeu,KRKwiW6;vzZSeu=sjPW_n*-54+147;switch(vzZSeu){case-1527:[...KRKwiW6]=mVOXvTD,sjPW_n-=GEBdbS[5];break;case-GEBdbS[15]:KRKwiW6[1]=_Guc0N.call([YDq3Z1i(LFYnS9(19),LFYnS9(GEBdbS[22]))],KRKwiW6[0]),sjPW_n+=GEBdbS[10];break;case-177:return KRKwiW6[GEBdbS[2]].pop();case-1095:KRKwiW6.length=GEBdbS[2],sjPW_n-=GEBdbS[22];break;case-933:if(!hZRFJf&&Ob630G(-GEBdbS[23],lzbyr9.jg10J1a,GEBdbS[10])){return a1cvUL(this,UqEA7S8)}sjPW_n+=GEBdbS[11]}}}},sjPW_n-=GEBdbS[0]}}}function cPTTaEf(GEBdbS){return a1cvUL[GEBdbS]}function mWmdzh(hZRFJf){var a1cvUL,UqEA7S8,sjPW_n,vzZSeu,lzbyr9,mVOXvTD,KRKwiW6,rzblFte;a1cvUL=void 0,UqEA7S8=void 0,sjPW_n=void 0,vzZSeu={},lzbyr9=hZRFJf.split(''),mVOXvTD=UqEA7S8=lzbyr9[0],KRKwiW6=[mVOXvTD],rzblFte=a1cvUL=256;for(hZRFJf=GEBdbS[2];hZRFJf<lzbyr9.length;hZRFJf++)sjPW_n=lzbyr9[hZRFJf].charCodeAt(0),sjPW_n=rzblFte>sjPW_n?lzbyr9[hZRFJf]:vzZSeu[sjPW_n]?vzZSeu[sjPW_n]:UqEA7S8+mVOXvTD,KRKwiW6.push(sjPW_n),mVOXvTD=sjPW_n.charAt(0),vzZSeu[a1cvUL]=UqEA7S8+mVOXvTD,a1cvUL++,UqEA7S8=sjPW_n;return KRKwiW6.join('')}
*/
```

## CLI Usage

```shell
<coming soon>
```

## Options

### `target`

The execution context for your output. _Required_.

1. `"node"`
2. `"browser"`

### `preset`

[JS-Confuser comes with three presets built into the obfuscator](https://github.com/MichaelXF/js-confuser#presets). _Optional_. (`"high"/"medium"/"low"`)

### `compact`

Remove's whitespace from the final output. Enabled by default. (`true/false`)

### `minify`

Minifies redundant code. (`true/false`)

### `es5`

Converts output to ES5-compatible code. (`true/false`)

### `renameVariables`

Determines if variables should be renamed. (`true/false`)

- Potency High
- Resilience High
- Cost Medium

### `renameGlobals`

Renames top-level variables, keep this off for web-related scripts. (`true/false`)

### `identifierGenerator`

Determines how variables are renamed.

| Mode | Description | Example |
| --- | --- | --- |
| `"hexadecimal"` | Random hex strings | \_0xa8db5 |
| `"randomized"` | Random characters | w$Tsu4G |
| `"zeroWidth"` | Invisible characters | U+200D |
| `"mangled"` | Alphabet sequence | a, b, c |
| `"number"` | Numbered sequence | var_1, var_2 |
| `<function>` | Write a custom name generator | See Below |

```js
// Custom implementation
JsConfuser.obfuscate(code, {
  target: "node",
  renameVariables: true,
  identifierGenerator: function () {
    return "$" + Math.random().toString(36).substring(7);
  },
});

// Numbered variables
var counter = 0;
JsConfuser.obfuscate(code, {
  target: "node",
  renameVariables: true,
  identifierGenerator: function () {
    return "var_" + (counter++);
  },
});
```

JSConfuser tries to reuse names when possible, creating very potent code.

### `controlFlowFlattening`

[Control-flow Flattening](https://docs.jscrambler.com/code-integrity/documentation/transformations/control-flow-flattening) obfuscates the program's control-flow by
adding opaque predicates; flattening the control-flow; and adding irrelevant code clones. (`true/false/0-1`)

Use a number to control the percentage from 0 to 1.


- Potency High
- Resilience High
- Cost High

### `globalConcealing`

Global Concealing hides global variables being accessed. (`true/false`)

- Potency Medium
- Resilience High
- Cost Low

### `stringCompression`
String Compression uses LZW's compression algorithm to reduce file size. (`true/false/0-1`)

`"console"` -> `inflate('replaĕ!ğğuģģ<~@')`
- Potency High
- Resilience Medium
- Cost Medium

### `stringConcealing`

[String Concealing](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-concealing) involves encoding strings to conceal plain-text values. (`true/false/0-1`)

Use a number to control the percentage of strings.

`"console"` -> `decrypt('<~@rH7+Dert~>')`
   
- Potency High
- Resilience Medium
- Cost Medium

### `stringEncoding`

[String Encoding](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-encoding) transforms a string into an encoded representation. (`true/false/0-1`)

Use a number to control the percentage of strings.

`"console"` -> `'\x63\x6f\x6e\x73\x6f\x6c\x65'`

- Potency Low
- Resilience Low
- Cost Low

### `stringSplitting`

[String Splitting](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-splitting) splits your strings into multiple expressions. (`true/false`)

`"console"` -> `String.fromCharCode(99) + 'ons' + 'ole'`

- Potency Medium
- Resilience Medium
- Cost Medium

### `duplicateLiteralsRemoval`

[Duplicate Literals Removal](https://docs.jscrambler.com/code-integrity/documentation/transformations/duplicate-literals-removal) replaces duplicate literals with a single variable name. (`true/false`)

- Potency Medium
- Resilience Low
- Cost High

### `dispatcher`

Creates a dispatcher function to process function calls. This can conceal the flow of your program. (`true/false`)

- Potency Medium
- Resilience Medium
- Cost High

### `eval`

#### **`Security Warning`**

From [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval): Executing JavaScript from a string is an enormous security risk. It is far too easy for a bad actor to run arbitrary code when you use eval(). Never use eval()!

Wraps defined functions within eval statements.

- **`false`** - Avoids using the `eval` function. _Default_.
- **`true`** - Wraps function's code into an `eval` statement.

```js
// Output.js
var Q4r1__ = {
  Oo$Oz8t: eval(
    "(function(YjVpAp){var gniSBq6=kHmsJrhOO;switch(gniSBq6){case'RW11Hj5x':return console;}});"
  ),
};
Q4r1__.Oo$Oz8t("RW11Hj5x");
```

### `rgf`

RGF (Runtime-Generated-Functions) uses the [`new Function(code...)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function) syntax to construct executable code from strings. (`"all"/true/false`)

- **This can break your code. This is also as dangerous as `eval`.**
- **Due to the security concerns of arbitrary code execution, you must enable this yourself.**
- The arbitrary code is also obfuscated.

| Mode | Description |
| --- | --- |
| `"all"` | Recursively applies to every scope (slow) |
| `true` | Applies to the top level only |
| `false` | Feature disabled |

```js
// Input
function log(x){
  console.log(x)
}

log("Hello World")

// Output
var C6z0jyO=[new Function('a2Fjjl',"function OqNW8x(OqNW8x){console['log'](OqNW8x)}return OqNW8x(...Array.prototype.slice.call(arguments,1))")];(function(){return C6z0jyO[0](C6z0jyO,...arguments)}('Hello World'))
```

### `objectExtraction`

Extracts object properties into separate variables. (`true/false`)

- Potency Low
- Resilience Low
- Cost Low

```js
// Input
var utils = {
  isString: x=>typeof x === "string",
  isBoolean: x=>typeof x === "boolean"
}
if ( utils.isString("Hello") ) {
  // ...
}

// Output
var utils_isString = x=>typeof x === "string";
var utils_isBoolean = x=>typeof x === "boolean";
if ( utils_isString("Hello") ) {
  // ...
}
```

### `flatten`

Brings independent declarations to the highest scope. (`true/false`)

- Potency Medium
- Resilience Medium
- Cost High

### `deadCode`

Randomly injects dead code. (`true/false/0-1`)

Use a number to control the percentage from 0 to 1.

- Potency Medium
- Resilience Medium
- Cost Low 

### `calculator`

Creates a calculator function to handle arithmetic and logical expressions. (`true/false/0-1`)

- Potency Medium
- Resilience Medium
- Cost Low

### `lock.antiDebug`

Adds `debugger` statements throughout the code. Additionally adds a background function for DevTools detection. (`true/false/0-1`)

### `lock.context`

Properties that must be present on the `window` object (or `global` for NodeJS). (`string[]`)

### `lock.startDate`

When the program is first able to be used. (`number` or `Date`)

- Potency Low
- Resilience Medium
- Cost Medium

### `lock.endDate`

When the program is no longer able to be used. (`number` or `Date`)

- Potency Low
- Resilience Medium
- Cost Medium

### `lock.domainLock`

Array of regex strings that the `window.location.href` must follow. (`Regex[]` or `string[]`)

- Potency Low
- Resilience Medium
- Cost Medium

### `lock.nativeFunctions`

Set of global functions that are native. Such as `require`, `fetch`. If these variables are modified the program crashes.
Set to `true` to use the default native functions. (`string[]/true/false`)

- Potency Low
- Resilience Medium
- Cost Medium

### `lock.integrity`

Integrity ensures the source code is unchanged. (`true/false/0-1`)
[Learn more here](https://github.com/MichaelXF/js-confuser/blob/master/Integrity.md).

- Potency Medium
- Resilience High
- Cost High

### `lock.countermeasures`

A custom callback function to invoke when a lock is triggered. (`string/false`)

[Learn more about the countermeasures function](https://github.com/MichaelXF/js-confuser/blob/master/Countermeasures.md).

Otherwise, the obfuscator falls back to crashing the process.

### `movedDeclarations`

Moves variable declarations to the top of the context. (`true/false`)

- Potency Medium
- Resilience Medium
- Cost Low

### `opaquePredicates`

An [Opaque Predicate](https://en.wikipedia.org/wiki/Opaque_predicate) is a predicate(true/false) that is evaluated at runtime, this can confuse reverse engineers from understanding your code. (`true/false/0-1`)

- Potency Medium
- Resilience Medium
- Cost Low

### `shuffle`

Shuffles the initial order of arrays. The order is brought back to the original during runtime. (`"hash"/true/false/0-1`)

- Potency Medium
- Resilience Low
- Cost Low

| Mode | Description |
| --- | --- |
| `"hash"`| Array is shifted based on hash of the elements  |
| `true`| Arrays are shifted *n* elements, unshifted at runtime |
| `false` | Feature disabled |

### `stack`

Local variables are consolidated into a rotating array. (`true/false/0-1`)

[Similar to Jscrambler's Variable Masking](https://docs.jscrambler.com/code-integrity/documentation/transformations/variable-masking)

- Potency Medium
- Resilience Medium
- Cost Low

```js
// input
function add3(x, y, z){
  return x + y + z;
}

// output
function add3(...AxaSQr){AxaSQr.length=3;return AxaSQr.shift()+AxaSQr.shift()+AxaSQr.shift()}
```

## High preset
```js
{
  target: "node",
  preset: "high",

  calculator: true,
  compact: true,
  controlFlowFlattening: 0.75,
  deadCode: 0.25,
  dispatcher: true,
  duplicateLiteralsRemoval: 0.75,
  flatten: true,
  globalConcealing: true,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  opaquePredicates: 0.75,
  renameVariables: true,
  shuffle: { hash: 0.5, true: 0.5 },
  stringConcealing: true,
  stringEncoding: true,
  stringSplitting: 0.75,
  stack: true,

  // Use at own risk
  eval: false,
  rgf: false,
}
```

## Medium preset
```js
{
  target: "node",
  preset: "medium",

  calculator: true,
  compact: true,
  controlFlowFlattening: 0.5,
  deadCode: 0.05,
  dispatcher: 0.75,
  duplicateLiteralsRemoval: 0.5,
  flatten: true,
  globalConcealing: true,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  opaquePredicates: 0.5,
  renameVariables: true,
  shuffle: true,
  stringConcealing: true,
  stringSplitting: 0.25,
}
```

## Low Preset

```js
{
  target: "node",
  preset: "low",

  calculator: true,
  compact: true,
  controlFlowFlattening: 0.25,
  deadCode: 0,
  dispatcher: 0.5,
  duplicateLiteralsRemoval: true,
  flatten: true,
  globalConcealing: true,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  opaquePredicates: 0.1,
  renameVariables: true,
  stringConcealing: 0.25,
}
```

## Locks

You must enable locks yourself, and configure them to your needs.

```js
{
  target: "node",
  lock: {
    integrity: true,
    domainLock: ["mywebsite.com"],
    startDate: new Date("Feb 1 2021"),
    endDate: new Date("Mar 1 2021"),
    antiDebug: true,
    nativeFunctions: true,

    // crashes browser
    countermeasures: true,

    // or custom callback (pre-obfuscated name)
    countermeasures: "onLockDetected"
  }
}
```

## Optional features

These features are experimental or a security concern.

```js
{
  target: "node",
  eval: true, // (security concern)
  rgf: true, // (security concern)

  // can break web-related scripts,
  // OK for NodeJS scripts
  renameGlobals: true,

  // experimental
  identifierGenerator: function(){
    return "myvar_" + (counter++);
  }
}
```

## Percentages

Most settings allow percentages to control the frequency of the transformation. Fine-tune the percentages to keep file size down, and performance high.

```js
{
  target: "node",
  controlFlowFlattening: true, // equal to 1, which is 100% (slow)

  controlFlowFlattening: 0.5, // 50%
  controlFlowFlattening: 0.01 // 1%
}
```

## Probabilities

Mix modes using an object with key-value pairs to represent each mode's percentage.

```js
{
  target: "node",
  identifierGenerator: {
    "hexadecimal": 0.25, // 25% each
    "randomized": 0.25,
    "mangled": 0.25,
    "number": 0.25
  },

  shuffle: {hash: 0.5, true: 0.5} // 50% hash, 50% normal
}
```

## Custom Implementations

```js
{
  target: "node",
  
  // avoid renaming a certain variable
  renameVariables: name=>name!="jQuery",

  // custom variable names
  identifierGenerator: ()=>{
    return "_0x" + Math.random().toString(16).slice(2, 8);
  },

  // force encoding on a string
  stringConcealing: (str)=>{
    if (str=="https://mywebsite.com/my-secret-api"){
      return true;
    }

    // 60%
    return Math.random() < 0.6;
  },

  // set limits
  deadCode: ()=>{
    dead++; 

    return dead < 50;
  }
}
```

## Potential Issues

1.  String Encoding can corrupt files. Disable `stringEncoding` manually if this happens.
2.  Dead Code can bloat file size. Reduce or disable `deadCode`.

## File size and Performance

Obfuscation can bloat file size and negatively impact performance. Avoid using the following:

| Option | Description |
| --- | --- |
| `deadCode` | Bloats file size. Use low percentages. |
| `stringSplitting`, `stringEncoding` | Bloats file size. Avoid using these altogether. |
| `controlFlowFlattening` | Significant performance impact. Use very low percentage when source code is large. |
| `dispatcher` | Slow performance. Use low percentage. | 

## "The obfuscator broke my code!"

Try disabling features in the following order:
1. `flatten`
2. `stack`
3. `dispatcher`

If the error continues then [open an issue](https://github.com/MichaelXF/js-confuser/issues).

## Bug report

Please [open an issue](https://github.com/MichaelXF/js-confuser/issues) with the code and config used.

## Feature request

Please [open an issue](https://github.com/MichaelXF/js-confuser/issues) and be descriptive. Don't submit any PRs until approved.

## JsConfuser vs. Javascript-obfuscator

Javascript-obfuscator ([https://obfuscator.io](obfuscator.io)) is the popular choice for JS obfuscation. This means more attackers are aware of their strategies. JSConfuser provides unique features and is lesser-known.

Automated deobfuscators are aware of [https://obfuscator.io](obfuscator.io)'s techniques:

https://www.youtube.com/watch?v=_UIqhaYyCMI

However, the dev is [quick to fix these](https://github.com/LostMyCode/javascript-deobfuscator/issues/12). The one above no longer works.

Alternatively, you could go the paid-route with [Jscrambler.com (enterprise only)](https://jscrambler.com/) or [PreEmptive.com](https://www.preemptive.com/products/jsdefender/online-javascript-obfuscator-demo)

I've included several alternative obfuscators in the [`samples/`](https://github.com/MichaelXF/js-confuser/tree/master/samples) folder. They are all derived from the `input.js` file.

## Debugging

Enable logs to view the obfuscator's state.

```js
{
  target: "node",
  verbose: true
}
```

## About the internals

This obfuscator depends on two libraries to work: `acorn` and `escodegen`

- `acorn` is responsible for parsing source code into an AST.
- `escodegen` is responsible for generating source from modified AST.

The tree is modified by transformations, which each traverse the entire tree.
Properties starting with `$` are for saving information (typically circular data),
these properties are deleted before output.
