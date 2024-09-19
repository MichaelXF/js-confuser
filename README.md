# JS Confuser

**⚠️ Warning: This an alpha release. This version is not stable and the likelihood of encountering bugs is significantly higher.**

JS-Confuser is a JavaScript obfuscation tool to make your programs _impossible_ to read. [Try the web version](https://js-confuser.com).

  [![NPM](https://img.shields.io/badge/NPM-%23000000.svg?style=for-the-badge&logo=npm&logoColor=white)](https://npmjs.com/package/js-confuser) [![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)](https://github.com/MichaelXF/js-confuser) [![Netlify](https://img.shields.io/badge/netlify-%23000000.svg?style=for-the-badge&logo=netlify&logoColor=#00C7B7)](https://js-confuser.com)


**The official documentation for this project has moved to [`JS-Confuser.com`](https://js-confuser.com)**: 

- [Getting Started](https://new--confuser.netlify.app/docs)

- - [What is Obfuscation?](https://new--confuser.netlify.app/docs/getting-started/what-is-obfuscation)

- - [Playground](https://new--confuser.netlify.app/docs/getting-started/playground)

- - [Installation](https://new--confuser.netlify.app/docs/getting-started/installation)

- - [Usage](https://new--confuser.netlify.app/docs/getting-started/usage)

- - [FAQ](https://new--confuser.netlify.app/docs/getting-started/faq)

- [Options](https://new--confuser.netlify.app/docs)

- [Presets](https://new--confuser.netlify.app/docs)

## API Usage

### Installation

```bash
$ npm install js-confuser
```

### Usage

```js
var JsConfuser = require("js-confuser");

JsConfuser.obfuscate(`
  function fibonacci(num){   
    var a = 0, b = 1, c = num;
    while (num-- > 1) {
      c = a + b;
      a = b;
      b = c;
    }
    return c;
  }

  for ( var i = 1; i <= 25; i++ ) {
    console.log(i, fibonacci(i))
  }
`, {
  target: "node",
  preset: "high",
  stringEncoding: false, // <- Normally enabled
}).then(result => {
  console.log(result.code)
})

/*
var AF59rI,ZgbbeaU,WDgj3I,gpR2qG,Ox61sk,pTNPNpX;AF59rI=[60,17,25,416,22,23,83,26,27,28,18,382,66,29,30,31,2,5,33,4,13,16,10,11,24,1,3,15,6,7,8,167,50,9,21,35,12,14,116],ZgbbeaU=AF59rI;for(var TlMIASm=62;TlMIASm;TlMIASm--)ZgbbeaU.unshift(ZgbbeaU.pop());WDgj3I=MBh_HcM("length1charCodeAt1slice1replaĕ1!ğğ1uģģ1<~A8bt#D.RU,~>Ħ~E,ol,ATMnĳĵ@rH7+DertŀħDKTtlBhE[ŋ~@q]:k6Z6LHŖ6$*Ŗ7n#j;20AŖ;g3Cn<]'Ŗ<Fna!Cii#ŖAU&0.Eb0;TŖ4ƌĴħ3rƍ)eVMBK\\!Ŗ+=M;Q@;]UaŖž=3&.0Ŗ/M2-WEcYr5ŖD?ƯTqŸb>-Q:c8Ŗ?SF2m2*!WQŖ2)RĲƐ~ž<ƿĴmČuĀ1 (local)").split('1');function pprWr0(ZgbbeaU){var WDgj3I,gpR2qG,Ox61sk,pTNPNpX,TlMIASm,pprWr0,M1ClYmT,kHWl72,xw_ohrD,sT8e3fv,bxd0KVG;WDgj3I=void 0,gpR2qG=void 0,Ox61sk=void 0,pTNPNpX=void 0,TlMIASm=void 0,pprWr0=String,M1ClYmT=CVH25o3(0),kHWl72=255,xw_ohrD=CVH25o3(1),sT8e3fv=CVH25o3(AF59rI[0]),bxd0KVG=CVH25o3(3);for('<~'===ZgbbeaU[sT8e3fv](0,AF59rI[0])&&'~>'===ZgbbeaU[sT8e3fv](-AF59rI[0]),ZgbbeaU=ZgbbeaU[sT8e3fv](AF59rI[0],-AF59rI[0])[bxd0KVG](/s/g,'')[bxd0KVG]('z',CVH25o3(AF59rI[3])),WDgj3I=CVH25o3(AF59rI[1])[sT8e3fv](ZgbbeaU[M1ClYmT]%AF59rI[1]||AF59rI[1]),ZgbbeaU+=WDgj3I,Ox61sk=[],pTNPNpX=0,TlMIASm=ZgbbeaU[M1ClYmT];TlMIASm>pTNPNpX;pTNPNpX+=AF59rI[1])gpR2qG=52200625*(ZgbbeaU[xw_ohrD](pTNPNpX)-AF59rI[2])+614125*(ZgbbeaU[xw_ohrD](pTNPNpX+AF59rI[9])-AF59rI[2])+7225*(ZgbbeaU[xw_ohrD](pTNPNpX+AF59rI[0])-AF59rI[2])+85*(ZgbbeaU[xw_ohrD](pTNPNpX+AF59rI[10])-AF59rI[2])+(ZgbbeaU[xw_ohrD](pTNPNpX+AF59rI[3])-AF59rI[2]),Ox61sk.push(kHWl72&gpR2qG>>AF59rI[8],kHWl72&gpR2qG>>AF59rI[5],kHWl72&gpR2qG>>8,kHWl72&gpR2qG);return function(ZgbbeaU,Ox61sk){for(var WDgj3I=Ox61sk;WDgj3I>0;WDgj3I--)ZgbbeaU.pop()}(Ox61sk,WDgj3I[M1ClYmT]),pprWr0.fromCharCode.apply(pprWr0,Ox61sk)}gpR2qG=[CVH25o3(AF59rI[12]),CVH25o3(AF59rI[13]),CVH25o3(8),CVH25o3(AF59rI[17]),CVH25o3(AF59rI[6]),CVH25o3(AF59rI[7]),CVH25o3(AF59rI[20]),'<~AQO1jBl7V~>',CVH25o3(AF59rI[4]),CVH25o3(AF59rI[21]),CVH25o3(AF59rI[4]),CVH25o3(9),CVH25o3(AF59rI[11]),CVH25o3(AF59rI[5]),CVH25o3(AF59rI[24]),CVH25o3(AF59rI[33]),'<~E%u9/13QC~>',CVH25o3(AF59rI[6]),CVH25o3(AF59rI[7]),CVH25o3(19),CVH25o3(20),CVH25o3(AF59rI[18]),CVH25o3(AF59rI[27]),CVH25o3(AF59rI[28]),CVH25o3(AF59rI[8]),'<~?T9_t1,(IC~>','<~1bpf~>',CVH25o3(AF59rI[25]),CVH25o3(AF59rI[30]),CVH25o3(AF59rI[31]),CVH25o3(14),CVH25o3(AF59rI[8])];function M1ClYmT(AF59rI){return pprWr0(gpR2qG[AF59rI])}function kHWl72(){try{return global}catch(AF59rI){return this}}Ox61sk=kHWl72.call(this);function xw_ohrD(ZgbbeaU){switch(ZgbbeaU){case 608:return Ox61sk[M1ClYmT(0)];case-884:return Ox61sk[CVH25o3(AF59rI[32])];case AF59rI[26]:return Ox61sk[M1ClYmT(AF59rI[9])];case-AF59rI[35]:return Ox61sk[M1ClYmT(2)]}}function sT8e3fv(ZgbbeaU,WDgj3I,gpR2qG){var Ox61sk;Ox61sk=11;while(Ox61sk!=51){var pTNPNpX,TlMIASm,pprWr0,kHWl72;pTNPNpX=Ox61sk*-244+217;switch(pTNPNpX){case-2467:TlMIASm=false,Ox61sk+=37;break;case-4175:kHWl72=WDgj3I==M1ClYmT(AF59rI[10])&&ziPI9L.qzUvJu1[M1ClYmT(4)+M1ClYmT(AF59rI[1])](AF59rI[9])==48?function(...WDgj3I){var gpR2qG;gpR2qG=AF59rI[1];while(gpR2qG!=AF59rI[11]){var Ox61sk;Ox61sk=gpR2qG*41+199;switch(Ox61sk){case 732:return pprWr0[ZgbbeaU].call(this,M1ClYmT(AF59rI[12]));case 404:IZftqI=WDgj3I,gpR2qG+=AF59rI[14]}}}:pprWr0[ZgbbeaU](M1ClYmT(AF59rI[13])),Ox61sk-=AF59rI[10];break;case-11495:pprWr0={[M1ClYmT(AF59rI[14])]:function(ZgbbeaU,WDgj3I,gpR2qG){var Ox61sk;Ox61sk=64;while(Ox61sk!=AF59rI[16]){var pTNPNpX,TlMIASm,pprWr0;pTNPNpX=Ox61sk*AF59rI[15]+144;switch(pTNPNpX){case 10832:TlMIASm=822,Ox61sk+=AF59rI[10];break;case 812:pprWr0[AF59rI[10]]=pprWr0[0],Ox61sk+=47;break;case 8661:while(TlMIASm!=772){var kHWl72;kHWl72=TlMIASm*234+191;switch(kHWl72){case 207515:TlMIASm-=528;break;case 129593:pprWr0[3]=bxd0KVG(AF59rI[15],pprWr0[AF59rI[9]],pprWr0[AF59rI[0]]),pprWr0[AF59rI[9]]=pprWr0[AF59rI[0]],pprWr0[AF59rI[0]]=pprWr0[AF59rI[10]],TlMIASm+=333;break;case 83963:TlMIASm+=bxd0KVG(-AF59rI[29],pprWr0[0]--,AF59rI[9])&&ziPI9L.U1LXDgJ()?195:414;break;case 192539:TlMIASm-=464}}Ox61sk-=AF59rI[16];break;case 10999:[...pprWr0]=IZftqI,pprWr0.length=1,Ox61sk-=AF59rI[38];break;case 6824:return[];case 11333:if(!ZgbbeaU){return WDgj3I(this,gpR2qG)}Ox61sk-=AF59rI[0];break;case 311:return[pprWr0[AF59rI[10]]];case 5822:pprWr0[1]=0,pprWr0[AF59rI[0]]=AF59rI[9],Ox61sk-=AF59rI[37]}}},[M1ClYmT(AF59rI[17])]:function(ZgbbeaU,WDgj3I,gpR2qG){var Ox61sk;Ox61sk=AF59rI[18];while(Ox61sk!=38){var pTNPNpX,TlMIASm,pprWr0;pTNPNpX=Ox61sk*182+-139;switch(pTNPNpX){case 4047:pprWr0[AF59rI[9]]=sT8e3fv(M1ClYmT(AF59rI[6]),M1ClYmT(AF59rI[7])).call([],pprWr0[0]),Ox61sk+=AF59rI[19];break;case 3683:TlMIASm=false,Ox61sk+=21;break;case 7505:[...pprWr0]=IZftqI,Ox61sk-=10;break;case 225:return pprWr0[AF59rI[9]].pop();case 10417:if(TlMIASm){var kHWl72=(ZgbbeaU,WDgj3I,gpR2qG)=>{var Ox61sk;Ox61sk=32;while(Ox61sk!=AF59rI[19]){var pTNPNpX,TlMIASm,pprWr0;pTNPNpX=Ox61sk*38+90;switch(pTNPNpX){case 508:TlMIASm=bxd0KVG(AF59rI[15],M1ClYmT(AF59rI[20]),pprWr0.toUTCString()),Ox61sk+=AF59rI[21];break;case 584:pprWr0.setTime(bxd0KVG(AF59rI[15],pprWr0.getTime(),bxd0KVG(AF59rI[22],bxd0KVG(116,bxd0KVG(AF59rI[22],bxd0KVG(116,gpR2qG,AF59rI[8]),AF59rI[23]),AF59rI[23]),1e3))),Ox61sk-=2;break;case 1040:xw_ohrD(608).cookie=bxd0KVG(AF59rI[15],bxd0KVG(AF59rI[15],bxd0KVG(AF59rI[15],bxd0KVG(AF59rI[15],bxd0KVG(AF59rI[15],ZgbbeaU,M1ClYmT(AF59rI[4])),WDgj3I),M1ClYmT(AF59rI[21])),TlMIASm),M1ClYmT(15)),Ox61sk+=AF59rI[6];break;case 1306:pprWr0=new Date,Ox61sk-=19}}}}Ox61sk-=56;break;case 5685:pprWr0.length=1,Ox61sk-=AF59rI[17]}}}},Ox61sk-=43;break;case-14179:kHWl72=void 0;if(WDgj3I==M1ClYmT(AF59rI[5])&&ziPI9L.VNaV0wv[M1ClYmT(AF59rI[24])+M1ClYmT(18)](AF59rI[6])==AF59rI[16]){IZftqI=[]}Ox61sk-=41;break;case-1003:if(TlMIASm){xw_ohrD(-884).exports=async()=>{var ZgbbeaU;ZgbbeaU=33;while(ZgbbeaU!=AF59rI[7]){var WDgj3I,gpR2qG,Ox61sk;WDgj3I=ZgbbeaU*95+-150;switch(WDgj3I){case 3175:gpR2qG=await(async()=>{var ZgbbeaU;ZgbbeaU=14;while(ZgbbeaU!=AF59rI[13]){var WDgj3I;WDgj3I=ZgbbeaU*100+-59;switch(WDgj3I){case 1341:if(isStandaloneExecutable){return M1ClYmT(19)+M1ClYmT(20)}ZgbbeaU+=AF59rI[6];break;case 2341:if(redactedPath===await resolveLocalredactedPath()){return CVH25o3(AF59rI[36])}ZgbbeaU-=AF59rI[13];break;case 1641:return''}}})(),ZgbbeaU-=AF59rI[25];break;case 2985:Ox61sk=new Set(xw_ohrD(AF59rI[26]).argv.slice(2)),ZgbbeaU-=AF59rI[6];break;case 2035:if(!Ox61sk.has(M1ClYmT(AF59rI[18])+M1ClYmT(AF59rI[27]))){var pTNPNpX;pTNPNpX=AF59rI[14];while(pTNPNpX!=9){var TlMIASm;TlMIASm=pTNPNpX*-204+38;switch(TlMIASm){case-1594:if(bxd0KVG(427,Ox61sk.size,1)){return false}pTNPNpX-=AF59rI[3];break;case-778:if(!Ox61sk.has(M1ClYmT(AF59rI[28]))){return false}pTNPNpX+=AF59rI[1]}}}ZgbbeaU+=AF59rI[20];break;case 800:return true}}}}Ox61sk+=54;break;case-3443:return gpR2qG==M1ClYmT(AF59rI[8])&&ziPI9L.U1LXDgJ()?{QVbrqy9:kHWl72}:kHWl72}}}function bxd0KVG(ZgbbeaU,WDgj3I,gpR2qG){switch(ZgbbeaU){case-AF59rI[34]:return WDgj3I<=gpR2qG;case-AF59rI[29]:return WDgj3I>gpR2qG;case AF59rI[15]:return WDgj3I+gpR2qG;case AF59rI[22]:return WDgj3I*gpR2qG;case 427:return WDgj3I!==gpR2qG}}pTNPNpX=AF59rI[12];while(pTNPNpX!=AF59rI[24]){var kBznIi,sCb8UYh,ziPI9L,IZftqI;kBznIi=pTNPNpX*-55+-214;switch(kBznIi){case-544:sCb8UYh=846,pTNPNpX+=AF59rI[0];break;case-654:ziPI9L={wHDYSl:[],U1LXDgJ:function(){if(!ziPI9L.wHDYSl[0]){ziPI9L.wHDYSl.push(87)}return ziPI9L.wHDYSl.length},VNaV0wv:M1ClYmT(AF59rI[25])+M1ClYmT(AF59rI[30]),qzUvJu1:M1ClYmT(AF59rI[31])+M1ClYmT(AF59rI[32])},pTNPNpX+=AF59rI[33];break;case-1644:IZftqI=[],pTNPNpX-=7;break;case-1259:while(sCb8UYh!=316){var XsBuZX,mgjtps2;XsBuZX=sCb8UYh*229+-125;switch(XsBuZX){case 193609:mgjtps2=AF59rI[9],sCb8UYh-=733;break;case 25752:sCb8UYh+=bxd0KVG(-AF59rI[34],mgjtps2,25)&&ziPI9L.U1LXDgJ()?662:203;break;case 177350:xw_ohrD(-AF59rI[35])[M1ClYmT(AF59rI[36])](mgjtps2,(IZftqI=[mgjtps2],new sT8e3fv(M1ClYmT(AF59rI[37]),void 0,M1ClYmT(AF59rI[38])).QVbrqy9)),sCb8UYh-=569;break;case 47049:mgjtps2++,sCb8UYh-=93}}pTNPNpX-=AF59rI[0]}}function CVH25o3(AF59rI){return WDgj3I[AF59rI]}function MBh_HcM(ZgbbeaU){var WDgj3I,gpR2qG,Ox61sk,pTNPNpX,TlMIASm,pprWr0,M1ClYmT,kHWl72;WDgj3I=void 0,gpR2qG=void 0,Ox61sk=void 0,pTNPNpX={},TlMIASm=ZgbbeaU.split(''),pprWr0=gpR2qG=TlMIASm[0],M1ClYmT=[pprWr0],kHWl72=WDgj3I=256;for(ZgbbeaU=AF59rI[9];ZgbbeaU<TlMIASm.length;ZgbbeaU++)Ox61sk=TlMIASm[ZgbbeaU].charCodeAt(0),Ox61sk=kHWl72>Ox61sk?TlMIASm[ZgbbeaU]:pTNPNpX[Ox61sk]?pTNPNpX[Ox61sk]:gpR2qG+pprWr0,M1ClYmT.push(Ox61sk),pprWr0=Ox61sk.charAt(0),pTNPNpX[WDgj3I]=gpR2qG+pprWr0,WDgj3I++,gpR2qG=Ox61sk;return M1ClYmT.join('')}
*/
```


## Bug report

Please [open an issue](https://github.com/MichaelXF/js-confuser/issues) with the code and config used.

## Feature request

Please [open an issue](https://github.com/MichaelXF/js-confuser/issues) and be descriptive. Don't submit any PRs until approved.

## License

MIT License