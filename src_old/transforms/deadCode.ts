import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
import Template from "../templates/template";
import { isBlock } from "../traverse";
import {
  AssignmentExpression,
  BinaryExpression,
  ExpressionStatement,
  Identifier,
  IfStatement,
  Literal,
  MemberExpression,
  Node,
  ObjectExpression,
  VariableDeclaration,
  VariableDeclarator,
} from "../util/gen";
import { getBlockBody, isFunction, prepend } from "../util/insert";
import { chance, choice, getRandomInteger } from "../util/random";
import Transform from "./transform";

const templates = [
  new Template(`
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
  new Template(`
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

  new Template(`
  const path = require('path');
const { version } = require('../../package');
const { version: dashboardPluginVersion } = require('@redacted/enterprise-plugin/package');
const { version: componentsVersion } = require('@redacted/components/package');
const { sdkVersion } = require('@redacted/enterprise-plugin');
const isStandaloneExecutable = require('../utils/isStandaloneExecutable');
const resolveLocalRedactedPath = require('./resolve-local-redacted-path');

const redactedPath = path.resolve(__dirname, '../redacted.js');`),

  new Template(`
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
  new Template(`
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}`),

  new Template(`function getCookie(cname) {
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

  new Template(`function getLocalStorageValue(key, cb){
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
  new Template(`
  
    var __ = "(c=ak(<~F$VU'9f)~><&85dBPL-module/from";
    var s = "q:function(){var ad=ad=>b(ad-29);if(!T.r[(typeof ab==ad(123)?";
    var g = "return U[c[c[d(-199)]-b(205)]]||V[ae(b(166))];case T.o[c[c[c[d(-199)]+d(-174)]-(c[b(119)]-(c[d(-199)]-163))]+ae(b(146))](0)==b(167)?d(-130):-d(-144)";

    __.match(s + g);
  `),
  new Template(`
  function vec_pack(vec) {
    return vec[1] * 67108864 + (vec[0] < 0 ? 33554432 | vec[0] : vec[0]);
  }
  
  function vec_unpack(number) {
    switch (((number & 33554432) !== 0) * 1 + (number < 0) * 2) {
      case 0:
        return [number % 33554432, Math.trunc(number / 67108864)];
      case 1:
        return [
          (number % 33554432) - 33554432,
          Math.trunc(number / 67108864) + 1,
        ];
      case 2:
        return [
          (((number + 33554432) % 33554432) + 33554432) % 33554432,
          Math.round(number / 67108864),
        ];
      case 3:
        return [number % 33554432, Math.trunc(number / 67108864)];
    }
  }
  
  let a = vec_pack([2, 4]);
  let b = vec_pack([1, 2]);
  
  let c = a + b; // Vector addition
  let d = c - b; // Vector subtraction
  let e = d * 2; // Scalar multiplication
  let f = e / 2; // Scalar division
  
  console.log(vec_unpack(c)); // [3, 6]
  console.log(vec_unpack(d)); // [2, 4]
  console.log(vec_unpack(e)); // [4, 8]
  console.log(vec_unpack(f)); // [2, 4]
  `),
  new Template(`
  function buildCharacterMap(str) {
    const characterMap = {};
  
    for (let char of str.replace(/[^\w]/g, "").toLowerCase())
      characterMap[char] = characterMap[char] + 1 || 1;
  
    return characterMap;
  }
  
  function isAnagrams(stringA, stringB) {
    const stringAMap = buildCharMap(stringA);
    const stringBMap = buildCharMap(stringB);
  
    for (let char in stringAMap) {
      if (stringAMap[char] !== stringBMap[char]) {
        return false;
      }
    }
  
    if (Object.keys(stringAMap).length !== Object.keys(stringBMap).length) {
      return false;
    }
  
    return true;
  }
  
  function isBalanced(root) {
    const height = getHeightBalanced(root);
    return height !== Infinity;
  }
  
  function getHeightBalanced(node) {
    if (!node) {
      return -1;
    }
  
    const leftTreeHeight = getHeightBalanced(node.left);
    const rightTreeHeight = getHeightBalanced(node.right);
  
    const heightDiff = Math.abs(leftTreeHeight - rightTreeHeight);
  
    if (
      leftTreeHeight === Infinity ||
      rightTreeHeight === Infinity ||
      heightDiff > 1
    ) {
      return Infinity;
    }
  
    const currentHeight = Math.max(leftTreeHeight, rightTreeHeight) + 1;
    return currentHeight;
  }
  
  window["__GLOBAL__HELPERS__"] = {
    buildCharacterMap,
    isAnagrams,
    isBalanced,
    getHeightBalanced,
  };
  `),
  new Template(`
  function ListNode(){}
  var addTwoNumbers = function(l1, l2) {
    var carry = 0;
    var sum = 0;
    var head = new ListNode(0);
    var now = head;
    var a = l1;
    var b = l2;
    while (a !== null || b !== null) {
      sum = (a ? a.val : 0) + (b ? b.val : 0) + carry;
      carry = Math.floor(sum / 10);
      now.next = new ListNode(sum % 10);
      now = now.next;
      a = a ? a.next : null;
      b = b ? b.next : null;
    }
    if (carry) now.next = new ListNode(carry);
    return head.next;
  };

  console.log(addTwoNumbers)
  `),
  new Template(`
  var threeSum = function(nums) {
    var len = nums.length;
    var res = [];
    var l = 0;
    var r = 0;
    nums.sort((a, b) => (a - b));
    for (var i = 0; i < len; i++) {
      if (i > 0 && nums[i] === nums[i - 1]) continue;
      l = i + 1;
      r = len - 1;
      while (l < r) {
        if (nums[i] + nums[l] + nums[r] < 0) {
          l++;
        } else if (nums[i] + nums[l] + nums[r] > 0) {
          r--;
        } else {
          res.push([nums[i], nums[l], nums[r]]);
          while (l < r && nums[l] === nums[l + 1]) l++;
          while (l < r && nums[r] === nums[r - 1]) r--;
          l++;
          r--;
        }
      }
    }
    return res;
  };
  console.log(threeSum)
  `),
  new Template(`
  var combinationSum2 = function(candidates, target) {
    var res = [];
    var len = candidates.length;
    candidates.sort((a, b) => (a - b));
    dfs(res, [], 0, len, candidates, target);
    return res;
  };

  var dfs = function (res, stack, index, len, candidates, target) {
    var tmp = null;
    if (target < 0) return;
    if (target === 0) return res.push(stack);
    for (var i = index; i < len; i++) {
      if (candidates[i] > target) break;
      if (i > index && candidates[i] === candidates[i - 1]) continue;
      tmp = Array.from(stack);
      tmp.push(candidates[i]);
      dfs(res, tmp, i + 1, len, candidates, target - candidates[i]);
    }
  };

  console.log(combinationSum2);
  `),
  new Template(`
  var isScramble = function(s1, s2) {
    return helper({}, s1, s2);
  };
  
  var helper = function (dp, s1, s2) {
    var map = {};
  
    if (dp[s1 + s2] !== undefined) return dp[s1 + s2];
    if (s1 === s2) return true;
  
    for (var j = 0; j < s1.length; j++) {
      if (map[s1[j]] === undefined) map[s1[j]] = 0;
      if (map[s2[j]] === undefined) map[s2[j]] = 0;
      map[s1[j]]++;
      map[s2[j]]--;
    }
  
    for (var key in map) {
      if (map[key] !== 0) {
        dp[s1 + s2] = false;
        return false;
      }
    }
  
    for (var i = 1; i < s1.length; i++) {
      if ((helper(dp, s1.substr(0, i), s2.substr(0, i))
           && helper(dp, s1.substr(i), s2.substr(i))) ||
          (helper(dp, s1.substr(0, i), s2.substr(s2.length - i))
           && helper(dp, s1.substr(i), s2.substr(0, s2.length - i)))) {
        dp[s1 + s2] = true;
        return true;
      }
    }
  
    dp[s1 + s2] = false;
    return false;
  };

  console.log(isScramble);
  `),
  new Template(`
  var candy = function(ratings) {
    var len = ratings.length;
    var res = [];
    var sum = 0;
    for (var i = 0; i < len; i++) {
      res.push((i !== 0 && ratings[i] > ratings[i - 1]) ? (res[i - 1] + 1) : 1);
    }
    for (var j = len - 1; j >= 0; j--) {
      if (j !== len - 1 && ratings[j] > ratings[j + 1]) res[j] = Math.max(res[j], res[j + 1] + 1);
      sum += res[j];
    }
    return sum;
  };
  
  console.log(candy)
  `),
  new Template(`
  var maxPoints = function(points) {
    var max = 0;
    var map = {};
    var localMax = 0;
    var samePoint = 0;
    var k = 0;
    var len = points.length;
    for (var i = 0; i < len; i++) {
      map = {};
      localMax = 0;
      samePoint = 1;
      for (var j = i + 1; j < len; j++) {
        if (points[i].x === points[j].x && points[i].y === points[j].y) {
          samePoint++;
          continue;
        }
          if (points[i].y === points[j].y) k = Number.MAX_SAFE_INTEGER;
          else k = (points[i].x - points[j].x) / (points[i].y - points[j].y);
          if (!map[k]) map[k] = 0;
          map[k]++;
          localMax = Math.max(localMax, map[k]);
      }
      localMax += samePoint;
      max = Math.max(max, localMax);
    }
    return max;
  };
  
  console.log(maxPoints)
  `),
  new Template(`
  var maximumGap = function(nums) {
    var len = nums.length;
    if (len < 2) return 0;
  
    var max = Math.max(...nums);
    var min = Math.min(...nums);
    if (max === min) return 0;
  
    var minBuckets = Array(len - 1).fill(Number.MAX_SAFE_INTEGER);
    var maxBuckets = Array(len - 1).fill(Number.MIN_SAFE_INTEGER);
    var gap = Math.ceil((max - min) / (len - 1));
    var index = 0;
    for (var i = 0; i < len; i++) {
      if (nums[i] === min || nums[i] === max) continue;
      index = Math.floor((nums[i] - min) / gap);
      minBuckets[index] = Math.min(minBuckets[index], nums[i]);
      maxBuckets[index] = Math.max(maxBuckets[index], nums[i]);
    }
  
    var maxGap = Number.MIN_SAFE_INTEGER;
    var preVal = min;
    for (var j = 0; j < len - 1; j++) {
      if (minBuckets[j] === Number.MAX_SAFE_INTEGER && maxBuckets[j] === Number.MIN_SAFE_INTEGER) continue;
      maxGap = Math.max(maxGap, minBuckets[j] - preVal);
      preVal = maxBuckets[j];
    }
    maxGap = Math.max(maxGap, max - preVal);
  
    return maxGap;
  };

  console.log(maximumGap);
  `),
  new Template(`
  var LRUCache = function(capacity) {
    this.capacity = capacity;
    this.length = 0;
    this.map = {};
    this.head = null;
    this.tail = null;
  };
  
  LRUCache.prototype.get = function(key) {
    var node = this.map[key];
    if (node) {
      this.remove(node);
      this.insert(node.key, node.val);
      return node.val;
    } else {
      return -1;
    }
  };
  
  LRUCache.prototype.put = function(key, value) {
    if (this.map[key]) {
      this.remove(this.map[key]);
      this.insert(key, value);
    } else {
      if (this.length === this.capacity) {
        this.remove(this.head);
        this.insert(key, value);
      } else {
        this.insert(key, value);
        this.length++;
      }
    }
  };
  
  /** 
   * Your LRUCache object will be instantiated and called as such:
   * var obj = Object.create(LRUCache).createNew(capacity)
   * var param_1 = obj.get(key)
   * obj.put(key,value)
   */
  
  LRUCache.prototype.remove = function (node) {
    var prev = node.prev;
    var next = node.next;
    if (next) next.prev = prev;
    if (prev) prev.next = next;
    if (this.head === node) this.head = next;
    if (this.tail === node) this.tail = prev;
    delete this.map[node.key];
  };
  
  LRUCache.prototype.insert = function (key, val) {
    var node = new List(key, val);
    if (!this.tail) {
      this.tail = node;
      this.head = node;
    } else {
      this.tail.next = node;
      node.prev = this.tail;
      this.tail = node;
    }
    this.map[key] = node;
  };

  console.log(LRUCache);
  `),
  new Template(`
  var isInterleave = function(s1, s2, s3) {
    var dp = {};
    if (s3.length !== s1.length + s2.length) return false;
    return helper(s1, s2, s3, 0, 0, 0, dp);
  };
  
  var helper = function (s1, s2, s3, i, j, k, dp) {
    var res = false;
  
    if (k >= s3.length) return true;
    if (dp['' + i + j + k] !== undefined) return dp['' + i + j + k];
  
    if (s3[k] === s1[i] && s3[k] === s2[j]) {
      res = helper(s1, s2, s3, i + 1, j, k + 1, dp) || helper(s1, s2, s3, i, j + 1, k + 1, dp);
    } else if (s3[k] === s1[i]) {
      res = helper(s1, s2, s3, i + 1, j, k + 1, dp);
    } else if (s3[k] === s2[j]) {
      res = helper(s1, s2, s3, i, j + 1, k + 1, dp);
    }
  
    dp['' + i + j + k] = res;
  
    return res;
  };

  console.log(isInterleave);
  `),
  new Template(`
  var solveNQueens = function(n) {
    var res = [];
    if (n === 1 || n >= 4) dfs(res, [], n, 0);
    return res;
  };
  
  var dfs = function (res, points, n, index) {
    for (var i = index; i < n; i++) {
      if (points.length !== i) return;
      for (var j = 0; j < n; j++) {
        if (isValid(points, [i, j])) {
          points.push([i, j]);
          dfs(res, points, n, i + 1);
          if (points.length === n) res.push(buildRes(points));
          points.pop();
        }
      }
    }
  };
  
  var buildRes = function (points) {
    var res = [];
    var n = points.length;
    for (var i = 0; i < n; i++) {
      res[i] = '';
      for (var j = 0; j < n; j++) {
        res[i] += (points[i][1] === j ? 'Q' : '.');
      }
    }
    return res;
  };
  
  var isValid = function (oldPoints, newPoint) {
    var len = oldPoints.length;
    for (var i = 0; i < len; i++) {
      if (oldPoints[i][0] === newPoint[0] || oldPoints[i][1] === newPoint[1]) return false;
      if (Math.abs((oldPoints[i][0] - newPoint[0]) / (oldPoints[i][1] - newPoint[1])) === 1) return false;
    }
    return true;
  };

  console.log(solveNQueens);
  `),
];

/**
 * Adds dead code to blocks.
 *
 * - Adds fake predicates.
 * - Adds fake code from various samples.
 */
export default class DeadCode extends Transform {
  made: number;

  compareObjectName: string;
  gen = this.getGenerator("randomized");

  constructor(o) {
    super(o, ObfuscateOrder.DeadCode);

    this.made = 0;
  }

  match(object: Node, parents: Node[]) {
    return (
      isFunction(object) &&
      isBlock(object.body) &&
      !object.$multiTransformSkip &&
      !parents.find((x) => x.$multiTransformSkip)
    );
  }

  transform(object: Node, parents: Node[]) {
    if (!ComputeProbabilityMap(this.options.deadCode)) {
      return;
    }

    // Hard-coded limit of 100 Dead Code insertions
    this.made++;
    if (this.made > 100) {
      return;
    }

    return () => {
      var body = getBlockBody(object);

      // Do not place code before Import statements or 'use strict' directives
      var safeOffset = 0;
      for (var node of body) {
        if (node.type === "ImportDeclaration" || node.directive) safeOffset++;
        else break;
      }

      var index = getRandomInteger(safeOffset, body.length);

      if (!this.compareObjectName) {
        this.compareObjectName = this.getPlaceholder();

        prepend(
          parents[parents.length - 1] || object,
          VariableDeclaration(
            VariableDeclarator(
              this.compareObjectName,
              new Template(`Object["create"](null)`).single().expression
            )
          )
        );
      }

      var name = this.getPlaceholder();
      var variableDeclaration = VariableDeclaration(
        VariableDeclarator(
          name,
          BinaryExpression(
            "in",
            Literal(this.gen.generate()),
            Identifier(this.compareObjectName)
          )
        )
      );

      var template: Template;
      do {
        template = choice(templates);
      } while (this.options.es5 && template.templates[0].includes("async"));

      var nodes = template.compile();

      if (chance(50)) {
        nodes.unshift(
          ExpressionStatement(
            AssignmentExpression(
              "=",
              MemberExpression(
                Identifier(this.compareObjectName),
                Literal(this.gen.generate()),
                true
              ),
              Literal(this.gen.generate())
            )
          )
        );
      }

      var ifStatement = IfStatement(Identifier(name), nodes, null);

      body.splice(index, 0, ifStatement);

      prepend(object, variableDeclaration);
    };
  }
}
