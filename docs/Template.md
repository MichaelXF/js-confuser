## `Template`

The Template API provides an easy way to parse code snippets into AST subtrees.
These AST subtrees can added to the obfuscated code, tailored with custom variable names and logic.


### 1. Basic string interpolation

Interpolated strings can use the `{name}` syntax to be replaced. This allows you to create custom-named functions exemplified in the following example:

```js
import JsConfuser from "js-confuser"

var Base64Template = new JsConfuser.Template(`
function {name}(str){
  return btoa(str)
}
`);

var functionDeclaration = Base64Template.single({ 
  name: "atob" 
});

console.log(functionDeclaration);
// Node {
//  type: 'FunctionDeclaration',
//  start: 3,
//  end: 47,
//  id: Node { type: 'Identifier', start: 12, end: 16, name: 'atob' },
//  expression: false,
//  generator: false,
//  async: false,
//  params: [ Node { type: 'Identifier', start: 17, end: 20, name: 'str' } ],
//  body: Node { type: 'BlockStatement', start: 21, end: 47, body: [ [Node] ] }
// }
```

This simply preprocesses the `{name}` to `"atob"` before parsing. This behavior can let additional code to be inserted and does not properly escape strings. To avoid these pitfalls, use AST subtree insertion.

### 2. AST subtree insertion

```js
var Base64Template = new JsConfuser.Template(`
function {name}(str){
  {getWindow}
  return {getWindowName}btoa(str)
}`)

var functionDeclaration = Base64Template.single({
  name: "atob",
  getWindowName: "newWindow",
  getWindow: () => {
    var code = "var newWindow = {}";
    return acorn.parse(code).body[0];
  }
});
```

Here, the `getWindow` variable is passed as function that returns an AST subtree. This must be a `Node` object, `Node[]` array, or another Template.
Optionally, the function can be replaced with the return value if it's already computed.

When utilizing AST-interpolated variables, an additional traversal will need to be ran to replace the plain Identifier nodes.

Regular string interpolation does not require an additional traversal.

### 3. Template subtree insertion

```js
var NewWindowTemplate = new JsConfuser.Template(`
  var {NewWindowName} = {};
`);

var Base64Template = new JsConfuser.Template(`
function {name}(str){
  {NewWindowTemplate}
  return {NewWindowName}.btoa(str)
}`)

var functionDeclaration = Base64Template.single({
  name: "atob",
  NewWindowName: "newWindow",
  NewWindowTemplate: NewWindowTemplate
});
```

The variables are passed into the child templates. This allows you to not have to repeat the `NewWindowName` variable.

### `new Template(template)`

Creates a new Template instance. You can pass multiple templates and a random one will be chosen each interpolation.

| Parameter | Type | Description |
| --- | --- | --- |
| `template` | `string` | The source code for the Template |

### `template.compile(variables)`

Compiles the template and returns a Node array (`Node[]`)

Returns the equivalent of a [ESTree `Program.body`](https://github.com/estree/estree/blob/master/es5.md#programs)

| Parameter | Type | Description |
| --- | --- | --- |
| `variables` | `object` | An object of variables |

### `template.single(variables)`

Compiles the template and returns the first Node. (`Node`)

An error will thrown if multiple nodes were parsed. Use this function for singular expressions/declarations.


Returns the equivalent of a [ESTree `Program.body[0]`](https://github.com/estree/estree/blob/master/es5.md#programs)

| Parameter | Type | Description |
| --- | --- | --- |
| `variables` | `object` | An object of variables |