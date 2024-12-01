---
name: Bug report
about: The obfuscator broke my code!
title: ''
labels: bug
assignees: ''

---

**Describe the bug:**

The program enters an infinite loop and does not produce the expected output.

**Config and Small code sample**

Config:

```js
{
  target: "node",
  preset: "high"
}
```

Code:

```js
console.log("My Small Code Sample");
```

**Expected behavior**

Example: The program should output "My Small Code Sample"

**Actual behavior**

Example: The program stalls indefinitely and never outputs the expected message.

**Additional context**

Example: It appears that the issue is caused by Control Flow Flattening. Disabling this feature resolves the problem.


