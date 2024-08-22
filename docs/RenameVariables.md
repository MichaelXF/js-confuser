## `Rename Variables`

Determines if variables should be renamed. (`true/false`)

Option name: `controlFlowFlattening`

Option values: `true/false`

```js
// Input
var twoSum = function (nums, target) {
  var hash = {};
  var len = nums.length;
  for (var i = 0; i < len; i++) {
    if (nums[i] in hash) return [hash[nums[i]], i];
    hash[target - nums[i]] = i;
  }
  return [-1, -1];
};

var test = function () {
  var inputNums = [2, 7, 11, 15];
  var inputTarget = 9;
  var expectedResult = [0, 1];

  var actualResult = twoSum(inputNums, inputTarget);
  ok(actualResult[0] === expectedResult[0]);
  ok(actualResult[1] === expectedResult[1]);
};

test();

// Output
var _O2mOcF = function (kB4uXM, w_07HXS) {
  var ZLTJcx = {};
  var sXQOaUx = kB4uXM["length"];
  for (var JYYxEk = 0; JYYxEk < sXQOaUx; JYYxEk++) {
    if (kB4uXM[JYYxEk] in ZLTJcx) {
      return [ZLTJcx[kB4uXM[JYYxEk]], JYYxEk];
    }
    ZLTJcx[w_07HXS - kB4uXM[JYYxEk]] = JYYxEk;
  }
  return [-1, -1];
};
var qFaI6S = function () {
  var fZpeOw = [2, 7, 11, 15];
  var UJ62R2c = 9;
  var dG6R0cV = [0, 1];
  var WgYXwn = _O2mOcF(fZpeOw, UJ62R2c);
  void (ok(WgYXwn[0] === dG6R0cV[0]), ok(WgYXwn[1] === dG6R0cV[1]));
};
qFaI6S();
```

### Custom Implementation

A custom function can provided as the `renameVariables` option, determining if a variable should be renamed.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | `string` | The variable proposed to be renamed |
| `isGlobal` | `boolean` | Is the variable defined at the global level? |

```js
{
  target: "node",
  
  // Avoid renaming a certain variable
  renameVariables: name=>name != "jQuery",
}
```

### Access the renamed variable

The `__JS_CONFUSER_VAR__` function provides a method to access variable mappings. This is especially useful for `eval()` scenarios where you want preserve the mapping.


```js
// Input
var message = "Hello world!";
eval(`console.log(${ __JS_CONFUSER_VAR__(message)  })`);

console.log("message was renamed to", __JS_CONFUSER_VAR__(message));

// Output
var nSgZyJf = "Hello world!";
eval(`console.log(${"nSgZyJf"})`) // "Hello world!"
console["log"]("message was renamed to", "nSgZyJf") // message was renamed to nSgZyJf
```

Even if `Rename Variables` is disabled, the `__JS_CONFUSER_VAR__` will still be removed. (The original name will be returned as a string)

### Never rename a variable

The `__NO_JS_CONFUSER_RENAME__` prefix disables renaming a certain variable. This can be useful for debugging the obfuscator.

```js
// Input
var __NO_JS_CONFUSER_RENAME__message1 = "My first message"
var message2 = "My other message"

console.log(__NO_JS_CONFUSER_RENAME__message1)
console.log(message2)

// Output
var __NO_JS_CONFUSER_RENAME__message1 = "My first message";
var jRLf713 = "My other message";

console.log(__NO_JS_CONFUSER_RENAME__message1),
console.log(jRLf713)
```





