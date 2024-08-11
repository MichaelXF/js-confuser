## `Control Flow Flattening`

Control-flow Flattening hinders program comprehension by creating convoluted switch statements.

**⚠️ Significantly impacts performance, use sparingly!**

Option name: `controlFlowFlattening`

Option values: `true/false/0-1`

Use a number to control the percentage from 0 to 1.

## Example

```js
// Input
function countTo(num){
  for ( var i = 1; i <= num; i++ ) {
    console.log(i);
  }
}

var number = 10;
countTo(number); // 1,2,3,4,5,6,7,8,9,10

// Output
var n2DUka,
  O7yZ0oU,
  mJMdMhJ = -337,
  A1Nyvv = -94,
  xDwpOk6 = 495,
  uKcJl2 = {
    TGCpW6t: "log",
    qUrjFe: function () {
      return xDwpOk6 == (126 > mJMdMhJ ? -16 : 34);
    },
    YN20IBx: function () {
      return (A1Nyvv -= 53);
    },
    CTW4vwx: -73,
    PLzWYDx: function () {
      return (O7yZ0oU = [[385, -94, -282], [10]]);
    },
    bW2FK2: function () {
      return (mJMdMhJ *= 2), (mJMdMhJ += 366);
    },
    AfOoRT: function () {
      return xDwpOk6 == xDwpOk6 + 867;
    },
    KTNMdj: function () {
      if (uKcJl2.AfOoRT()) {
        typeof ((mJMdMhJ += 0), uKcJl2.Q0I6e4f(), (xDwpOk6 += 0));
        return "cobTe8G";
      }
      typeof (uKcJl2.htRXYx(),
      (mJMdMhJ += 59),
      (A1Nyvv -= 537),
      (xDwpOk6 += uKcJl2.mLuSzZ < mJMdMhJ ? 449 : -33));
      return "cobTe8G";
    },
  };
while (mJMdMhJ + A1Nyvv + xDwpOk6 != 83) {
  var yQNDJh = (mJMdMhJ + A1Nyvv + xDwpOk6) * 58 + 54;
  switch (yQNDJh) {
    case 750:
      if (A1Nyvv == 24) {
        uKcJl2.FxREGd6();
        break;
      }
    case 1214:
      if (uKcJl2.qUrjFe()) {
        typeof ((mJMdMhJ *= -8 > xDwpOk6 ? -109 : 2),
        (mJMdMhJ += 1168),
        (xDwpOk6 += xDwpOk6 - 1290));
        break;
      }
      function _VSsIw() {
        var [yQNDJh, _VSsIw] = O7yZ0oU,
          [L9B14E] = _VSsIw,
          uTyFFb = 322;
        while (uTyFFb != 23) {
          var cBx3ysg = uTyFFb * 48 - 77;
          switch (cBx3ysg) {
            case 15379:
              var IOoqIZ = 1;
              uTyFFb -= 306;
              break;
            case 691:
              uTyFFb += IOoqIZ <= L9B14E ? 976 : 7;
              break;
            case 47539:
              typeof (console[uKcJl2.TGCpW6t](IOoqIZ), (uTyFFb -= 795));
              break;
            case 9379:
              !(IOoqIZ++, (uTyFFb -= 181));
          }
        }
        return ([mJMdMhJ, A1Nyvv, xDwpOk6] = yQNDJh), (n2DUka = void 0);
      }
      (xDwpOk6 == -73 ? parseInt : _VSsIw)();
      break;
    case 576:
      typeof (mJMdMhJ == -4 ? clearImmediate : void 0,
      uKcJl2.bky8kL(),
      (xDwpOk6 -= 463));
      break;
    case 4172:
      var L9B14E = 10;
      void ((O7yZ0oU = [[385, -94, -282], [10]]),
      (mJMdMhJ -= 187),
      uKcJl2.YN20IBx(),
      (xDwpOk6 += 189));
      break;
    case 3766:
      !((uKcJl2.Fpp8x5 = -167),
      (uKcJl2.mLuSzZ = 144),
      (uKcJl2.FxREGd6 = function () {
        return (mJMdMhJ += uKcJl2.Fpp8x5), (xDwpOk6 += 164);
      }),
      (uKcJl2.bky8kL = function () {
        return (A1Nyvv += 537);
      }),
      (uKcJl2.Q0I6e4f = function () {
        return (A1Nyvv += 0);
      }),
      (uKcJl2.htRXYx = function () {
        return (xDwpOk6 = -82);
      }));
      var L9B14E = 10;
      void (uKcJl2.PLzWYDx(), uKcJl2.bW2FK2(), (xDwpOk6 += uKcJl2.CTW4vwx));
      break;
    default:
      if (uKcJl2.KTNMdj() == "cobTe8G") {
        break;
      }
  }
}
```

As seen in the example, your code will be wrapped in a large, complicated switch statement. The makes the behavior of your program very hard to understand and is resistent to deobfuscators. This comes with a large performance reduction.

## Flattening Control Structures

Control Flow Flattening is able to flatten the following statements:

1. `If Statement`
2. `For Statement`
3. `While Statement` / `Do While Statement`
4. `Switch Statement`

```js
// Input
if(true) {
  console.log("This code runs"); // "This code runs"
}

var numbers1To10 = [];
for(var i = 1; i <= 10; i++) {
  numbers1To10.push(i);
}

console.log(numbers1To10); // [1,2,3,4,5,6,7,8,9,10]

// Output
var b7C5lP = 1362,
  DOLvaG = -418,
  YJSKU81 = -373,
  _tLqjib = -373,
  WB0kIJ0 = {
    P: -15,
    d: "log",
    av: () => (b7C5lP += 34),
    f: 1,
    x: 91,
    ay: -76,
    am: () => (DOLvaG += 76),
    W: (DOLvaG = YJSKU81 == 28) => {
      if (DOLvaG) {
        return _tLqjib == 33;
      }
      return (b7C5lP -= 28);
    },
    ad: y9tPuB((YJSKU81 = DOLvaG == 1090) => {
      if (!YJSKU81) {
        return DOLvaG;
      }
      return (b7C5lP += _tLqjib + 233);
    }),
    w: 1659,
    v: y9tPuB(() => {
      return (b7C5lP -= 1604);
    }),
    V: y9tPuB(() => {
      if (WB0kIJ0.a) {
        !((b7C5lP += DOLvaG == 1090 ? 1709 : "N"),
        (DOLvaG -= 1491),
        (WB0kIJ0.c = !0));
        return "T";
      }
      !((YJSKU81 += WB0kIJ0.P),
      (_tLqjib += WB0kIJ0.d == "log" ? 10 : WB0kIJ0.S));
      return "T";
    }),
    u: () => (WB0kIJ0.s = hup9cE).push(YJSKU81 == WB0kIJ0.t || R6QFdZ),
    Z: -363,
    h: -1735,
    J: (b7C5lP = WB0kIJ0.d == "K") => {
      if (b7C5lP) {
        return _tLqjib == -25;
      }
      return (DOLvaG -= 187), (YJSKU81 -= 15), (_tLqjib += 10);
    },
    an: -101,
    l: 4,
    m: 85,
    g: 10,
    ag: y9tPuB((b7C5lP = WB0kIJ0.Z == "aj") => {
      if (b7C5lP) {
        return WB0kIJ0;
      }
      return WB0kIJ0.ad(), (DOLvaG += 76);
    }),
    aB: (b7C5lP = WB0kIJ0.l == -912) => {
      if (b7C5lP) {
        return WB0kIJ0.aE();
      }
      return (_tLqjib = 15);
    },
    az: -453,
    t: -39,
    F: -1709,
    aI: y9tPuB((WB0kIJ0) => {
      return WB0kIJ0.c ? 234 : -276;
    }),
    aJ: y9tPuB((YJSKU81) => {
      return YJSKU81 + 574;
    }),
    aK: y9tPuB((WB0kIJ0) => {
      return WB0kIJ0.b ? 217 : -467;
    }),
    aL: y9tPuB((WB0kIJ0) => {
      return WB0kIJ0.e ? -244 : 203;
    }),
    aM: y9tPuB((DOLvaG) => {
      return DOLvaG - 1079;
    }),
  };
while (b7C5lP + DOLvaG + YJSKU81 + _tLqjib != 37)
  switch (b7C5lP + DOLvaG + YJSKU81 + _tLqjib) {
    default:
      typeof ((WB0kIJ0.hasOwnProperty("d") ? console : _tLqjib)[WB0kIJ0.d](
        "This code runs"
      ),
      (b7C5lP += WB0kIJ0.F),
      (DOLvaG += typeof WB0kIJ0.d == "function" ? 45 : 1678),
      (WB0kIJ0.e = !1));
      break;
    case 571:
    case 113:
    case 158:
      if (typeof WB0kIJ0.h == "undefined" || !1) {
        WB0kIJ0.av();
        break;
      }
      void ((WB0kIJ0.f == 1 && hup9cE).push(WB0kIJ0.x == "ax" || R6QFdZ),
      (b7C5lP += -369 < YJSKU81 ? 117 : _tLqjib + 397));
      break;
    case WB0kIJ0.aJ(YJSKU81):
      void (WB0kIJ0.aB(),
      (b7C5lP += 1042),
      (DOLvaG -= 1584),
      (YJSKU81 += 112),
      (_tLqjib += 539),
      (WB0kIJ0.b = !0));
      break;
    case 123:
    case 756:
    case 714:
      if (_tLqjib == 31) {
        !((b7C5lP += WB0kIJ0.g == "i" ? WB0kIJ0.k : -1604),
        (DOLvaG += 1659),
        (YJSKU81 += WB0kIJ0.l),
        (_tLqjib += 10));
        break;
      }
      !(WB0kIJ0.u(),
      WB0kIJ0.v(),
      (DOLvaG += WB0kIJ0.w),
      (YJSKU81 += b7C5lP + 246),
      (_tLqjib += 10));
      break;
    case 735:
    case WB0kIJ0.aK(WB0kIJ0):
      if (WB0kIJ0.l == -373 || !1) {
        YJSKU81 -= 19;
        break;
      }
      !((WB0kIJ0.a = !0), (b7C5lP -= 1709), (DOLvaG += 1508));
      break;
    case 134:
      typeof (R6QFdZ++,
      (b7C5lP -= 568),
      (DOLvaG += WB0kIJ0.ay),
      (_tLqjib += 620));
      break;
    case 82:
    case 516:
      if (_tLqjib == WB0kIJ0.Z && !1) {
        b7C5lP += 28;
        break;
      }
      if (
        (_tLqjib == (typeof WB0kIJ0.h == "number" ? -363 : -50)
          ? WB0kIJ0
          : void 0
        ).a
      ) {
        WB0kIJ0.ag();
        break;
      }
      !((b7C5lP += b7C5lP + 872),
      WB0kIJ0.am(),
      (YJSKU81 *= -369 > YJSKU81 ? WB0kIJ0.an : 2),
      (YJSKU81 -= WB0kIJ0.an == "ar" ? "as" : -285),
      (_tLqjib -= 620));
      break;
    case 198:
      void ((YJSKU81 += WB0kIJ0.l == "y" ? WB0kIJ0.A : 19), (WB0kIJ0.b = !0));
      break;
    case 16:
      if (WB0kIJ0.V() == "T") {
        break;
      }
    case 192:
      typeof ((b7C5lP += 562), (_tLqjib *= 2), (_tLqjib -= 257));
      break;
    case WB0kIJ0.aL(WB0kIJ0):
    case 422:
    case 310:
      if (!1) {
      }
      WB0kIJ0.J();
      break;
    case 50:
    case 555:
    case 984:
      typeof ((YJSKU81 == WB0kIJ0.az ? console : YJSKU81).log(
        (WB0kIJ0.aA = hup9cE)
      ),
      (YJSKU81 -= 13));
      break;
    case WB0kIJ0.aM(DOLvaG):
      var hup9cE = [],
        R6QFdZ = (DOLvaG == -2 || WB0kIJ0).f;
      b7C5lP += 99;
      break;
    case 28:
      typeof ((WB0kIJ0.aF = "aG"), (b7C5lP += 130));
      break;
    case 110:
      typeof ((WB0kIJ0.a = R6QFdZ <= WB0kIJ0.g), WB0kIJ0.W());
  }
function y9tPuB(b7C5lP) {
  return function () {
    return b7C5lP(...arguments);
  };
}
```

As you can see, the If-statement and For-loop are nowhere to be found in the output code. These control structures were added to switch statement by converting them into their equivalent 'goto style of code.'

## Goto style of code

Control Flow Flattening converts your code into a 'goto style of code.'
Example:

```js
// Input
console.log("Start of code");

if(true){
  console.log("This code runs");
}

console.log("End of code");

// Output
chunk_0:
console.log("Start of code");
var TEST = true;
if( TEST ) goto chunk_1;
else goto chunk_2;

chunk_1:
console.log("This code runs");
goto chunk_2;

chunk_2:
console.log("End of code");
```

JavaScript does not support the `goto` keyword. This is where the while-loop and switch statement come in.

```js
var state = 0;
while (state != 3) {
  switch (state) {
    case 0: // 'chunk_0'
      console.log("Start of code");
      var TEST = true;
      if (TEST) {
        state = 1; // 'goto chunk_1'
        break;
      }
      state = 2; // 'goto chunk_2'
      break;
    case 1: // 'chunk_1'
      console.log("This code runs");
      state = 2; // 'goto chunk_2'
      break;
    case 2:
      console.log("End of code");
      state = 3; // 'end of program'
      break;
  }
}
```

This code replicates functionality of the `goto` statement in JavaScript by using a while-loop paired with a switch-statement.

The 'state' variable determines which chunk will execute. Each chunk is placed as a Switch-case with a number assigned to it.

This is just the simple version of things. JS-Confuser uses a variety of techniques to further obfuscate the switch statement:

```js
// Input
var numbers1To10 = [];
for (var i = 1; i <= 10; i++) {
  numbers1To10.push(i);
}

console.log(numbers1To10); // [1,2,3,4,5,6,7,8,9,10]

// Output
// (1) Multiple state variables (C2Ihj2, z0UNXR7, yAt1T_y, baOORjm)
var C2Ihj2 = 262,
  z0UNXR7 = 203,
  yAt1T_y = -557,
  baOORjm = 167;

// (2) Control object that holds data: (Wnhi6cp)
// - Strings used by the code
// - Numbers used by the code
// - Outlined expressions
var Wnhi6cp = {
  e: -39,
  l: () => (Wnhi6cp.a = (Wnhi6cp.c == "j" ? Proxy : XGGmew) <= Wnhi6cp.c),
  E: () => {
    return (yAt1T_y += 133);
  },
  q: () => {
    if (Wnhi6cp.a) {
      !((C2Ihj2 -= 39), (yAt1T_y += z0UNXR7 + 172));
      return "o";
    }
    !((C2Ihj2 -= 39), (yAt1T_y += Wnhi6cp.n), (baOORjm -= 64));
    return "o";
  },
  m: () => {
    return (baOORjm += 273);
  },
  d: "push",
  c: 10,
  P: () => (yAt1T_y -= 60),
  f: () => (z0UNXR7 -= 339),
  K: -426,
  t: () => (yAt1T_y += Wnhi6cp.s),
  n: 133,
  L: -454,
  h: -830,
  s: -839,
  r: 313,
  b: 1,
  J: () => {
    return (
      (C2Ihj2 += 39),
      (z0UNXR7 += -42 != yAt1T_y ? 313 : -66),
      (yAt1T_y += Wnhi6cp.n == 262 ? 67 : -133),
      (baOORjm -= 273)
    );
  },
  i: -1493,
  T: (yAt1T_y) => {
    return yAt1T_y + 373;
  },
  U: (z0UNXR7) => {
    return z0UNXR7 + 177;
  },
  V: (baOORjm) => {
    return baOORjm != -454 && baOORjm + 528;
  },
};
while (C2Ihj2 + z0UNXR7 + yAt1T_y + baOORjm != 63)
  switch (C2Ihj2 + z0UNXR7 + yAt1T_y + baOORjm) {
    // (3) Multiple test expressions (default, 394, 241)
    default:
    case 394:
    case 241:
      var PMHmf7g = [],
        XGGmew = (Wnhi6cp.g = Wnhi6cp).b;
      // (4) Relative state assignment (yAt1T_y += 839)
      yAt1T_y += 839;
      // (5) Mangled numbers (Wnhi6cp.h)
      baOORjm += Wnhi6cp.h;
      break;
    case Wnhi6cp.T(yAt1T_y):
      if (false) {
        // (6) Dead Code
        yAt1T_y += yAt1T_y + Wnhi6cp.K;
      }
    case 939:
    case 25:
    case 461:
    // (7) Mangled test expressions (C2Ihj2 - 149)
    case C2Ihj2 - 149:
      console.log(C2Ihj2 == -86 ? setTimeout : PMHmf7g);
      // (4, again) Relative state assignment (yAt1T_y += yAt1T_y + Wnhi6cp.K)
      yAt1T_y += yAt1T_y + Wnhi6cp.K;
      break;
    case Wnhi6cp.U(z0UNXR7):
      yAt1T_y -= 62;
      break;
    case 5:
    case 802:
    case 300:
      if (baOORjm == -118) {
        typeof ((C2Ihj2 += 39),
        (z0UNXR7 += Wnhi6cp.r),
        Wnhi6cp.t(),
        (baOORjm += Wnhi6cp.c == -390 ? 40 : 557));
        break;
      }
      // (8) Mangled Identifiers (baOORjm == 91 ? ReferenceError : PMHmf7g)
      void ((baOORjm == 91 ? ReferenceError : PMHmf7g)[
        (Wnhi6cp.hasOwnProperty("B") ? eval : Wnhi6cp).d
      ](yAt1T_y == 78 ? Function : XGGmew),
      Wnhi6cp.E());
      break;
    case 84:
      if (C2Ihj2 == 10) {
        typeof ((yAt1T_y -= 839), (baOORjm *= 2), (baOORjm -= Wnhi6cp.i));
        break;
      }
      typeof (Wnhi6cp.l(), (z0UNXR7 += C2Ihj2 - 575), Wnhi6cp.m());
      break;
    // (6, again) Dead code
    case Wnhi6cp.V(baOORjm):
      delete Wnhi6cp.S;
      // (9) Opaque predicates (typeof Wnhi6cp.s == 'function')
      if (typeof Wnhi6cp.s == "function" || !1) {
        yAt1T_y -= 133;
        break;
      }
      void (XGGmew++, Wnhi6cp.J());
      break;
    case 37:
    case 257:
    case 989:
    case 398:
      void ((yAt1T_y = -(Wnhi6cp.d == -75 ? "N" : 47)),
      (z0UNXR7 += 26),
      Wnhi6cp.P(),
      (baOORjm += 64));
      break;
    case 44:
      if (Wnhi6cp.q() == "o") {
        break;
      }
  }
```

As you can see the code is still very unreadable even with the comments explaining the techniques used.

The techniques used by Control Flow Flattening are always improving to stop deobfuscators from being able to work.

## Performance reduction

Control Flow Flattening reduces the performance of your program. You should adjust the option `controlFlowFlattening` to be a percentage that is appropriate for your app.

## Other notes

Control Flow Flattening only applies to:

- Blocks of 3 statements or more
- Cannot use `let`/`const` in these blocks of code