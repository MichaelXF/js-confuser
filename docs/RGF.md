## `RGF`

RGF (Runtime-Generated-Functions) uses the [`new Function(code...)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function) syntax to construct executable code from strings. (`true/false/0-1`)

- **This can break your code.**
- **Due to the security concerns of arbitrary code execution, you must enable this yourself.**
- The arbitrary code is also obfuscated.

Option name: `rgf`

Option values: `true/false/0-1`

Note: RGF will only apply to functions that do not rely on any outside-scoped variables. Enable `flatten` along with `rgf` to apply to these functions.

Note: Does not apply to arrow, async, or generator functions.

Use a number to control the percentage of functions changed.

```js
// Input
function printToConsole(message){
  console.log(message);
}

printToConsole("Hello World"); // "Hello World"

// Output
var Ricvq8s = [new Function('function HIGRHaD(ANVivo_){console[\'log\'](ANVivo_)}return HIGRHaD[\'apply\'](this,arguments)')];
function uhj6obs() {
    return Ricvq8s[0]['apply'](this, arguments);
}
uhj6obs('Hello World'); // "Hello World"
```

## With `Flatten`

Enable `flatten` with `rgf` to apply to functions that rely on outside-scoped variables.

Flatten is able to isolate functions from their scope so then RGF can then apply on them.

```js
{
  target: "node",
  rgf: true,
  flatten: true
}
```

```js
// Input
var outsideVariable = 0;
function incrementOutsideVariable(){
  outsideVariable++;
}

incrementOutsideVariable(); // outsideVariable = 1
incrementOutsideVariable(); // outsideVariable = 2
incrementOutsideVariable(); // outsideVariable = 3

console.log(outsideVariable); // 3

// Output
var J3NLZFR = [
  new Function(
    "function Q7Rh6l([],reFzsi){reFzsi['XaBIEIZ']++}return Q7Rh6l['apply'](this,arguments)"
  ),
];
function pCG9mH() {
  return J3NLZFR[0]["apply"](this, arguments);
}
var outsideVariable = 0;
function incrementOutsideVariable(...muLxIC) {
  var udg38ch = {
    set ["XaBIEIZ"](H5p1op) {
      outsideVariable = H5p1op;
    },
    get ["XaBIEIZ"]() {
      return outsideVariable;
    },
  };
  return pCG9mH(muLxIC, udg38ch);
}
!(incrementOutsideVariable(),
incrementOutsideVariable(),
incrementOutsideVariable(),
console["log"](outsideVariable)); // 3
```

## With `String Concealing`

Enable `stringConcealing` to encrypt the `new Function(code)` code string.

```js
// Input
function add(x, y){
  return x + y;
}

console.log(add(5, 10)); // 15

// Output
var MAKh7o = [],
  BCG3CXC = 0,
  W33d4e = (function () {
    var To7ztdg = [
      "n%v2do>o/Ro<B",
      "ad/z~7_MP#]yCZ(ZlG2Hr@3B3UuHQbXj~7$GZ7w@h#g<J9G",
      ']+=c$.zNPP+/G9BY1G$x3_M+]8EU"[XpkwUdV^QC!Pk.XbK',
      "Hd8=l@<:%59/L]J",
      "u)jdloP1|6k.*Z}iV5UHt#[z<IW31wwn{nnEkj5vyJ",
      "@4P0goQYcRNlUD",
      '"!>fj>~p!It3M^hX',
      ".t)F;!&u)J?+gEFe4zAz;3A",
      ":!><}7qC*2i.2xI",
      "&2rd(iQYsRJ2ID",
      'H)?/f2lvs4KinCkR]Db.znuuY%"uk,Uorf`yo2:M97n',
      'KEFK73EeT2m/77Hg,i&Fu#qePMp{Lv(mUzf0v+Jj6U<xhQQn%XM,d^jN%yh*ZFAe>]w;Uvz`Y3G.Z*ClC:?<HwU6g&?E(u+NFEgbL^YI]GJ3nv$Y:"29ZXRipw(wD7=!xS!lPaRi{Z{^EqU2#@lZ3dJuX2@y4@AV{PWlCMszhDm#]eh5G)*[|ja2D:rZ%#L0BJ(u+N"i`Km]2MyTQUO[8Lx7<fY<L|%Te.{+;T@z/z!=86D8fO+*FYg%(:Ef5?L7Y{LntO|LE:?,V[GUY?sQWq>iPeI!Y{DJU3$@Qcf<Kz`m/#F(g!jmFTG&ywX,Zj0T1c>[vP0/oxJk>oCPL?G*aWmUk,(y0CG62t6[)gaz^I3]Z[$yVRra,S7!Hc!i6CAP4m&BRn_URI{c]GlN07361pmfja!i6CAPo{CN/US8U==[${lT,r|]7j}UD=U*7*K0T^4b$q"z^I3]Z[$yp!kbWi|?p>P:_Y2$E`~.8jcB9c!=!Yy#c%x@Moi5e39=TXi#c.~MLOD]Wf=[RvK0U6myWoa=zg>[;NmTd/<P1o:JzI{*bv.!T^a9_o_zU=W}[;FWGvCFph(UE=U*7*|N47Tm_o@|[;c,`pE$nwaxTOU?p>W}FjMR6t{]8d5)VKU,0{8!@+q[wh[i/2s)+{ZR50ixOg#4]I^[5ds!Wz|a?N~<[go@J`+9M6>x=Tgzzgh`(`+9p!kbWijr71d,!YI9)dN.`onDF3w)Eqj9Z<,alLX}ecF.ieL%`r|]Km=GzI>3m6<!!/,]XXPSufp@A:nKGvCFpht2V3O:/p/3LsyxQn[DE=M*qerR4msj]o0aU=$bz*[&2/ZQ;mI=[go@J`+9!+ZQ!q@|[;V<#NLR#V;a8jg5y;:t*NN!v3Jx+rgzzgh`FjMR6tOyCknDF3w)PZ1$2/a9{j9o(IP:T[K0T^pQUo44!H{*+G+K70WFph>DF3w)9v6IE?zj0p$z>vM{bTs7a6q[whQ5zg7=O$^G[+O9$XrM^Ia>H[r%Apry0ht2V3O:/pH981.^rmWX01nv{Y<!ApL+YiXBCdmvb*7Lj{Y8?UdP(gt@mC}!f%ixHl3oG,b>"M#1b6_.YiXB)H%n!6#1l!#bof)%vE5pUIKU&::ZmlaXYeg9<{a!A.,]CmtoIJq/A:nK$#TO<a>cy;F<"@QS]4"50Vs<t<r@6iMR6t(7?nZJ):Er{!`6r*Kl_ci?:=):%p$Mr^zj8pt,[;RkS:f8$V0PuoSrlf*1&M(2%8=lAl5Xk3@!rpEJ8_`N7R_Z;K6_A@%#?rT+nlR}A>[h@eG$909MBke!>fF(tTrIM{$YASl<+H%n!6#1d{Z*nlR}A>[h%R814_O+9rOr"z&im$|6r*Kl_cyfba~aGSC(o!e9jLDSzw?:g{"%.(]68R[+M,U!7viTu*o8NOndi;{^LB&z:::uQVQz^Kb9<{a!A.,]4jAj_y]m<!iQP<tNOVy!n>b>"M#13m)7?nZJ):jeI:(GD.*9KmePgZC.Z`+92/ZQ;mI=qwp@1;>4WzpENnxo)=u%.!yPn?fbiR5]xw?:g{"%.(o@sOn?dEh|Yo1$Xw_jOg`O}JevRp30CpS*ASU?.bbj(ve8$V0PuoSrlf*1&M(2%83,DT@ZaFNmKq1$Xw_jOg`O}JevRp30CpS*ASoPE=f,eIFHX?"*ml)|kyBkh`:!tRqZpTF]AbC}+:>4dRmZNgot<=p/A:IH"g?mmS9<*H%n!6#1cpryVO~%(=<kd#wPn?fbiR5]kyM{bTs7a6+BdqAo>f{&xzW0B,qxbp6o>v><JHmNo7,]dlxaU=u%Yo[zC{uFrOwRe3_*R11T4t>Cfkqr)aecU684N3zOcrDSyDm`2e1T0t{]8d5)VKU,0{8!@+&5wVu7$Jc,@0m$RzW*lNX}^d9_FZ:!7&98Uol<zg>[;NmT@$U^lLX}^d9_FZ:!7&98Uo*Zw;n+JT1T20"5ROZPtK]&UevS)/&NQoGE9K$!@Mi2DQGNBs?i7g,WGkJH:@S9PnLB@;9uekB#@+&5wVu7$Jc,@0m$RzW*lNX}ecF.ieL%T^a9_o_z$J]&fN4UB2|aOgcR0=|<A:J0yOQ7akNaw;![dTpUb64^=NwX{Z][j;@2@5*9KmeP>3f,!eLU4tOyCknDF3w)PZ1$2/CFgfoGS.C1E:FWK;3m_ogr$J^v0:d7!#xE{dEdUK1]^*mUrOCFubl<zg>[;NmT%dPa[oY8M=#[[5IUAUBc9jg8G3/WLHU$aK0^Mg)tQh_*:6J0~5IE=oqaNKf)[p7%60>x2ol<sf!=!Yy#c%Qj,f[t+xmc>Y_54EtQcrarU=[[eG#Iei4bzVWDf/AwZjwMFNCl;aVo}GR5!S<7lf<Dmf/DP<2+~jQSW6nmLm1o.J,?jTs%2<WF%qguexAkZdx2G?*NgMqOgD{c:!*Hh&ckQVG`yFQ$:@*Qv^&9rsGU%.e>bTrUu+Rwxn"fUd2b)!G0&/rO8XH@p>wb.!p!c%HylL~%/gt;_:HUx/$^)lUoBg6=+Yi#yxl.1oZBsHI!LBv&Z{Y8?UXPVK`/{Y,$zL#C:UXPVK&y}S74>P#C:UXPVKi]lvPSdR07]Pt<t<r@k);R7t{]$S#wyg_h#`(2jVHaXV~%/gt;9#)9=:&OSomfM,|*T[aU7tQQ:aE5`0MrKIdS5/M,~kqM^I[3XvGUx/$^)l.<[;mlhHK%Q6=NBkpt)FNyl5R8M{{6aR[I/2@[H[7%x^M.SO>la;x4z#2K`599sm8UGH|0fBuLYK/YheoPE=f,TZgV80l.SO>la;x4z#40=(@vGZ%/20So2)t#)/RQkZ{]/gR!YCn6/_6CuhRG,/Nf~`CJTKGluVv74J!.Z*VN~>lNcR=_`Eqs|RW3l/zjWjQ=(gJ?4{AS*dQDFSC:#0[>pThS[5]xxnMXiwll/z+0!&KFSUR`}byn~t*9ID[k_PR)LaD__0G$:4`[FSmU5z=m.!4%gixE<al]raE}j1AS+:/Efk6i5z:f%z8&%L6lScE&GE2]xvJH[5]xxnMXnh~<dpMO[P8vkZt2e/`08i;1<:G6Xoi5e39=eGw8b.sD(Zv7gGKkC6j8C{*8<mg5,<8=1R)$|#ix/f1/#<|<Z;tVm@^O^pAjl,6ui:g8c!#PBSfrrdIro6LOU<9xiZ4ti=/<(`g83/XvNbl<Z2lcHN]2+g7OcrdP(gt@mCc&i*sQ@aSrQe/k5X16Ub^CObwl$eOrrBh&;x4bRO=Xbgv)|5;0jb`@[nOauhV<8e$yC2CNgdW%}JEd2$&5:(#^km:+<d;^A+l9cm$PBSfrrddc}orI~=EQwP=Xbgv)|5@Vlb^CObwl$ev@&Y7Ue%9MgdW%}Jvs#v2$Bv]ZPgt%VE"ma$f&i*sQ@a3]6.k9iYAJ0Sva(k.lGfB{z*@V{a^CObwljF)yTB($2#va(k.lGfB{z*.!E.f^@bHak,k9iYAJ0Sva(k.lGfB{R;5OM?O]Rb;n$x!6EYGQ`4O9Xi"/%e{c)C',
      "Hu@Jk`A",
      "jrIJ",
    ];
    return BCG3CXC ? To7ztdg["pop"]() : BCG3CXC++, To7ztdg;
  })();
function __getGlobal() {
  try {
    return global || window || new Function("return this")();
  } catch (e) {
    try {
      return this;
    } catch (e) {
      return {};
    }
  }
}
var __globalObject = __getGlobal() || {};
var __TextDecoder = __globalObject["TextDecoder"];
var __Uint8Array = __globalObject["Uint8Array"];
var __Buffer = __globalObject["Buffer"];
var __String = __globalObject["String"] || String;
var __Array = __globalObject["Array"] || Array;
var utf8ArrayToStr = (function () {
  var m3i1iAe = new __Array(128);
  var Av6R1dU = __String["fromCodePoint"] || __String["fromCharCode"];
  var pnnRdk2 = [];
  return function (UZmorc) {
    var loIFGNM, EI2F65J;
    var M61Ma9 = UZmorc["length"];
    pnnRdk2["length"] = 0;
    for (var l1wlvIJ = 0; l1wlvIJ < M61Ma9; ) {
      EI2F65J = UZmorc[l1wlvIJ++];
      if (EI2F65J <= 127) {
        loIFGNM = EI2F65J;
      } else if (EI2F65J <= 223) {
        loIFGNM = ((EI2F65J & 31) << 6) | (UZmorc[l1wlvIJ++] & 63);
      } else if (EI2F65J <= 239) {
        loIFGNM =
          ((EI2F65J & 15) << 12) |
          ((UZmorc[l1wlvIJ++] & 63) << 6) |
          (UZmorc[l1wlvIJ++] & 63);
      } else if (__String["fromCodePoint"]) {
        loIFGNM =
          ((EI2F65J & 7) << 18) |
          ((UZmorc[l1wlvIJ++] & 63) << 12) |
          ((UZmorc[l1wlvIJ++] & 63) << 6) |
          (UZmorc[l1wlvIJ++] & 63);
      } else {
        void ((loIFGNM = 63), (l1wlvIJ += 3));
      }
      pnnRdk2["push"](
        m3i1iAe[loIFGNM] || (m3i1iAe[loIFGNM] = Av6R1dU(loIFGNM))
      );
    }
    return pnnRdk2["join"]("");
  };
})();
function SXKazu(EV_5uc) {
  if (typeof __TextDecoder !== "undefined" && __TextDecoder) {
    return new __TextDecoder()["decode"](new __Uint8Array(EV_5uc));
  } else if (typeof __Buffer !== "undefined" && __Buffer) {
    return __Buffer["from"](EV_5uc)["toString"]("utf-8");
  } else {
    return utf8ArrayToStr(EV_5uc);
  }
}
var LnelT9p = Zi62vq(13);
var xYMaKHC = [Zi62vq(11), Zi62vq(12)];
var zSp778 = [new Function(xYMaKHC[0])];
function add() {
  return zSp778[0][xYMaKHC[1]](this, arguments);
}
console[LnelT9p](add(5, 10));
function uY029_N(jyTIo9y) {
  const GlmoHl =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';
  const S4FYoA = "" + (jyTIo9y || "");
  const A4W4cw9 = S4FYoA.length;
  const H7l7ou = [];
  let P14qjv = 0;
  let OB9Yj5 = 0;
  let MoCbcq = -1;
  for (let DXitsC8 = 0; DXitsC8 < A4W4cw9; DXitsC8++) {
    const _jKDDfi = GlmoHl.indexOf(S4FYoA[DXitsC8]);
    if (_jKDDfi === -1) continue;
    if (MoCbcq < 0) {
      MoCbcq = _jKDDfi;
    } else {
      void ((MoCbcq += _jKDDfi * 91),
      (P14qjv |= MoCbcq << OB9Yj5),
      (OB9Yj5 += (MoCbcq & 8191) > 88 ? 13 : 14));
      do {
        !(H7l7ou.push(P14qjv & 255), (P14qjv >>= 8), (OB9Yj5 -= 8));
      } while (OB9Yj5 > 7);
      MoCbcq = -1;
    }
  }
  if (MoCbcq > -1) {
    H7l7ou.push((P14qjv | (MoCbcq << OB9Yj5)) & 255);
  }
  return SXKazu(H7l7ou);
}
function Zi62vq(so0hRj, Y1DV40, w23Pg_, ToR3sw = uY029_N, Hw481Y = MAKh7o) {
  if (w23Pg_) {
    return (Y1DV40[MAKh7o[w23Pg_]] = Zi62vq(so0hRj, Y1DV40));
  } else if (Y1DV40) {
    [Hw481Y, Y1DV40] = [ToR3sw(Hw481Y), so0hRj || w23Pg_];
  }
  return Y1DV40
    ? so0hRj[Hw481Y[Y1DV40]]
    : MAKh7o[so0hRj] ||
        ((w23Pg_ = (Hw481Y[so0hRj], ToR3sw)),
        (MAKh7o[so0hRj] = w23Pg_(W33d4e[so0hRj])));
}
```

Now the arbitrary code is encrypted within the program, making it even harder to reverse engineer.

## Arbitrary code

The arbitrary code is also obfuscated. Example:

```js
{
  target: "node",
  rgf: true,
  controlFlowFlattening: true
}
```

```js
// Input
function add(x, y) {
  var xNum = parseFloat(x);
  var yNum = parseFloat(y);
  return xNum + yNum;
}

var xParam = 5;
var yParam = 10;
console.log(add(xParam, yParam)); // 15

// Output
var add = function () {
  return s0U62J[0]["apply"](this, arguments);
};
var uaWD9E = 330;
var fKasNp = -204;
var sSUaUk = {
  Y: 20,
  g: -72,
  v: -204,
  J: -26,
  M: () => {
    return (uaWD9E += -50);
  },
  X: function () {
    return (fKasNp += -1);
  },
  e: 31,
  R: function () {
    return sSUaUk["Q"]();
  },
  c: 5,
  Q: function () {
    return (uaWD9E *= sSUaUk["f"]), (uaWD9E -= sSUaUk["P"]);
  },
  f: 2,
  h: 85,
  C: function (vVVcsVb = sSUaUk["f"] == -204) {
    if (vVVcsVb) {
      return uaWD9E == -20;
    }
    return (uaWD9E *= 2), (uaWD9E -= sSUaUk["hasOwnProperty"]("f") ? 453 : -77);
  },
  Z: -1,
  p: function (C3f6how = uaWD9E == -91) {
    if (C3f6how) {
      return sSUaUk;
    }
    return (fKasNp *= fKasNp + 285), (fKasNp -= -362);
  },
  o: function () {
    return (fKasNp == (uaWD9E == 291 ? 69 : -12) || console)["log"](
      add(sSUaUk["g"] == 84 ? queueMicrotask : xParam, (sSUaUk["n"] = yParam))
    );
  },
  P: 465,
  ["aa"]: function (hXpBbL) {
    return hXpBbL - -330;
  },
  ["ab"]: function (qxp3ZC, KWKb8s) {
    return qxp3ZC["d"]
      ? -685
      : KWKb8s != 312 &&
          KWKb8s != 349 &&
          KWKb8s != 233 &&
          KWKb8s != 304 &&
          KWKb8s != 330 &&
          KWKb8s != 343 &&
          KWKb8s != 291 &&
          KWKb8s - 204;
  },
  ["ac"]: function (MZMnuRS) {
    return MZMnuRS != -204 && MZMnuRS - -291;
  },
  ["ad"]: function (vL6KPqt) {
    return vL6KPqt - -343;
  },
  ["ae"]: function (Bhu44kU) {
    return Bhu44kU != -204 && Bhu44kU - -312;
  },
};
while (uaWD9E + fKasNp != 29) {
  switch (uaWD9E + fKasNp) {
    case 142:
    case 177:
      typeof ((fKasNp = uaWD9E + (134 < fKasNp ? sSUaUk["e"] : -199)),
      (uaWD9E *= 217 < uaWD9E ? sSUaUk["g"] : sSUaUk["f"]),
      (uaWD9E -= sSUaUk["h"]),
      (fKasNp += -129));
      break;
    case sSUaUk["aa"](fKasNp):
    case 537:
      var s0U62J = [
        new Function(
          "function qI185Uq(omj9DF,UBfrHTH){var vId6ek=321;var Bt0se7=-129;var JznECje=-169;var i3hDEEv={'b':()=>{return parseFloat(Bt0se7==-129&&omj9DF)},'k':()=>{return Bt0se7=96},'n':function(){return JznECje=-112},'j':-34,'c':321,'i':()=>{return vId6ek+=-34},'e':()=>{return parseFloat(UBfrHTH)},'f':-35,'h':function(){return(i3hDEEv['g']=osBDiV)+sALNJel},'l':55,'m':()=>{return Bt0se7+=60,JznECje+=i3hDEEv['l']},['o']:function(BcteZGa){return BcteZGa!=386&&(BcteZGa!=444&&BcteZGa-298)},['p']:function(slR1cf){return slR1cf!=-169&&slR1cf- -257}};while(vId6ek+Bt0se7+JznECje!=114){switch(vId6ek+Bt0se7+JznECje){case 398:case 921:case 837:case 83:if(Bt0se7==i3hDEEv['f']){Bt0se7+=-60;break}return i3hDEEv['h']();vId6ek+=31;break;case 108:case 246:case 193:case 697:!(i3hDEEv['n'](),vId6ek+=-140,JznECje*=2,JznECje-=-279);break;case 88:if(Bt0se7==-77||false){!(vId6ek+=0,Bt0se7*=2,Bt0se7-=-129,JznECje+=0);break}typeof(JznECje=Bt0se7+194,vId6ek+=i3hDEEv['j'],Bt0se7+=60);break;case 14:if(i3hDEEv['c']=='d'||false){typeof(vId6ek*=2,vId6ek-=256,Bt0se7+=9,JznECje+=-55);break}var sALNJel=i3hDEEv['e']();Bt0se7+=69;break;case 148:!(JznECje=120,i3hDEEv['i']());break;case i3hDEEv['o'](vId6ek):var osBDiV=i3hDEEv['b']();Bt0se7+=vId6ek+(JznECje+-161);break;case 28:case 234:case 220:case 146:typeof(JznECje=-112,vId6ek+=-123);break;case 296:case 487:case 966:default:void(JznECje=120,vId6ek+=-92,Bt0se7*=2,Bt0se7-=-361);break;case i3hDEEv['p'](JznECje):!(i3hDEEv['k'](),i3hDEEv['m']());break}}}return qI185Uq['apply'](this,arguments)"
        ),
      ];
      void ((uaWD9E += sSUaUk["J"]), (sSUaUk["b"] = true));
      break;
    case sSUaUk["b"] ? 100 : -204:
      var xParam = (sSUaUk["c"] == "K" ? NaN : sSUaUk)["c"];
      var yParam = 10;
      void (sSUaUk["M"](), (sSUaUk["d"] = false));
      break;
    case 145:
    case 909:
    case 334:
      void ((fKasNp = 149), sSUaUk["R"]());
      break;
    case 87:
    case 567:
      void (console["log"](
        (sSUaUk["h"] == 90 ? Map : add)(
          sSUaUk["h"] == "u" || xParam,
          uaWD9E == 291 ? yParam : Boolean
        )
      ),
      (uaWD9E += -58));
      break;
    case sSUaUk["ab"](sSUaUk, uaWD9E):
      typeof ((sSUaUk["h"] == 85 && console)["log"](
        add(sSUaUk["c"] == -204 ? Object : xParam, yParam)
      ),
      (uaWD9E += -21));
      break;
    case sSUaUk["ac"](fKasNp):
      !(sSUaUk["o"](), (uaWD9E += -58), sSUaUk["p"]());
      break;
    default:
      typeof ((sSUaUk["w"] = console)["log"](
        add(xParam, sSUaUk["g"] == -72 && yParam)
      ),
      sSUaUk["C"]());
      break;
    case 112:
    case 1006:
    case 375:
    case 108:
      typeof ((fKasNp = 18), (uaWD9E *= 2), (uaWD9E -= 275));
      break;
    case sSUaUk["ae"](fKasNp):
    case 859:
      if (fKasNp == (uaWD9E == 312 ? -133 : "S")) {
        !((uaWD9E += sSUaUk["e"] == "U" ? "V" : -8),
        sSUaUk["X"](),
        (sSUaUk["b"] = true));
        break;
      }
      !((uaWD9E = sSUaUk["Y"]), (uaWD9E += -79), (fKasNp += sSUaUk["Z"]));
      break;
  }
}
```

The `new Function` code has Control Flow Flattening obfuscation applied as well. (Notice the switch statement)

```js
new Function(
  "function qI185Uq(omj9DF,UBfrHTH){var vId6ek=321;var Bt0se7=-129;var JznECje=-169;var i3hDEEv={'b':()=>{return parseFloat(Bt0se7==-129&&omj9DF)},'k':()=>{return Bt0se7=96},'n':function(){return JznECje=-112},'j':-34,'c':321,'i':()=>{return vId6ek+=-34},'e':()=>{return parseFloat(UBfrHTH)},'f':-35,'h':function(){return(i3hDEEv['g']=osBDiV)+sALNJel},'l':55,'m':()=>{return Bt0se7+=60,JznECje+=i3hDEEv['l']},['o']:function(BcteZGa){return BcteZGa!=386&&(BcteZGa!=444&&BcteZGa-298)},['p']:function(slR1cf){return slR1cf!=-169&&slR1cf- -257}};while(vId6ek+Bt0se7+JznECje!=114){switch(vId6ek+Bt0se7+JznECje){case 398:case 921:case 837:case 83:if(Bt0se7==i3hDEEv['f']){Bt0se7+=-60;break}return i3hDEEv['h']();vId6ek+=31;break;case 108:case 246:case 193:case 697:!(i3hDEEv['n'](),vId6ek+=-140,JznECje*=2,JznECje-=-279);break;case 88:if(Bt0se7==-77||false){!(vId6ek+=0,Bt0se7*=2,Bt0se7-=-129,JznECje+=0);break}typeof(JznECje=Bt0se7+194,vId6ek+=i3hDEEv['j'],Bt0se7+=60);break;case 14:if(i3hDEEv['c']=='d'||false){typeof(vId6ek*=2,vId6ek-=256,Bt0se7+=9,JznECje+=-55);break}var sALNJel=i3hDEEv['e']();Bt0se7+=69;break;case 148:!(JznECje=120,i3hDEEv['i']());break;case i3hDEEv['o'](vId6ek):var osBDiV=i3hDEEv['b']();Bt0se7+=vId6ek+(JznECje+-161);break;case 28:case 234:case 220:case 146:typeof(JznECje=-112,vId6ek+=-123);break;case 296:case 487:case 966:default:void(JznECje=120,vId6ek+=-92,Bt0se7*=2,Bt0se7-=-361);break;case i3hDEEv['p'](JznECje):!(i3hDEEv['k'](),i3hDEEv['m']());break}}}return qI185Uq['apply'](this,arguments)"
),
```

## Other notes

RGF only applies to:

- Function Declarations or Expressions
- Cannot be async / generator function
- Cannot rely on outside-scoped variables
- Cannot use `this`, `arguments`, or `eval`