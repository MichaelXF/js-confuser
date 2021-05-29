function A() {
    try {
        return window;
    } catch (A) {
        return this;
    }
}
var B = A.call(this);
function C(A) {
    switch (A) {
    case 911:
        return B['document'];
    case 251:
        return B['window'];
    case 814:
        return B['Array'];
    case -346:
        return B['___a'];
    case -440:
        return B['Symbol'];
    case 815:
        return B['isNaN'];
    case -358:
        return B['parseFloat'];
    case 33:
        return B['isFinite'];
    case 602:
        return B['Object'];
    case 949:
        return B['Number'];
    case -830:
        return B['e'];
    case 906:
        return B['parseInt'];
    case -876:
        return B['T'];
    case -183:
        return B['ya'];
    case 192:
        return B['JSON'];
    case -282:
        return B['Math'];
    case 469:
        return B['U'];
    case 977:
        return B['W'];
    case -506:
        return B['V'];
    case 154:
        return B['La'];
    case 23:
        return B['setTimeout'];
    case 522:
        return B['encodeURIComponent'];
    case -355:
        return B['String'];
    case 423:
        return B['RegExp'];
    }
}
function D(A, B, C) {
    switch (A) {
    case -402:
        return B instanceof C;
    case -105:
        return B < C;
    case 229:
        return B !== C;
    case -405:
        return B > C;
    case 870:
        return B + C;
    case 972:
        return B in C;
    case -979:
        return B - C;
    case -146:
        return B <= C;
    }
}
(function () {
    var A = 'className';
    var E = 'contentEditable';
    var F = 'htmlFor';
    var G = 'readOnly';
    var H = 'maxLength';
    var I = 'tabIndex';
    var J = 'colSpan';
    var K = 'rowSpan';
    var L = 'useMap';
    var M = !0;
    var N = !0;
    var O = !0;
    var P = !0;
    var Q = !0;
    var R = !0;
    var S = !0;
    var T = !0;
    var U = !0;
    var V = !0;
    var W = !0;
    var X = !0;
    var Y = !0;
    var Z = !0;
    var AA = !0;
    var AB = !0;
    var AC = !0;
    var AD = !0;
    var AE = 'focusin';
    var AF = 'focusout';
    var AG = 'mouseover';
    var AH = 'mouseout';
    'use strict';
    function AI(...A) {
        A.length = 2;
        try {
            return A[0](A[1]);
        } catch (E) {
            return A[1];
        }
    }
    var AJ = C(911);
    var AK = C(251);
    var AL = AJ['documentElement'];
    var AM = AJ['createElement']['bind'](AJ);
    var AN = AM('div');
    var AO = AM('table');
    var AP = AM('tbody');
    var AQ = AM('tr');
    var AR = C(814)['isArray'];
    var AS = C(814)['prototype'];
    var AT = AS['concat'];
    var AU = AS['filter'];
    var AV = AS['indexOf'];
    var AW = AS['map'];
    var AX = AS['push'];
    var AY = AS['slice'];
    var AZ = AS['some'];
    var BA = AS['splice'];
    var BB = /^#(?:[\w-]|\\.|[^\x00-\xa0])*$/;
    var BC = /^\.(?:[\w-]|\\.|[^\x00-\xa0])*$/;
    var BD = /<.+>/;
    var BE = /^\w+$/;
    function BF(...A) {
        A.length = 2;
        return A[0] && (BN(A[1]) || BO(A[1])) ? BC['test'](A[0]) ? A[1]['getElementsByClassName'](A[0]['slice'](1)) : BE['test'](A[0]) ? A[1]['getElementsByTagName'](A[0]) : A[1]['querySelectorAll'](A[0]) : [];
    }
    var BG = function (...A) {
        A.unshift(function (...A) {
            A.length = 2;
            if (A[0]) {
                if (D(-402, A[0], BG)) {
                    return A[0];
                }
                A[2] = C(-346);
                if (BQ(A[0])) {
                    if (A[2] = (D(-402, A[1], BG) ? A[1][0] : A[1]) || AJ, A[2] = BB['test'](A[0]) ? A[2]['getElementById'](A[0]['slice'](1)) : BD['test'](A[0]) ? DB(A[0]) : BF(A[0], A[2]), !A[2]) {
                        return;
                    }
                } else {
                    if (BP(A[0])) {
                        return this['ready'](A[0]);
                    }
                }
                if (A[2]['nodeType'] || A[2] === AK) {
                    A[2] = [A[2]];
                }
                this['length'] = A[2]['length'];
                A[0] = 0;
                for (A[1] = this['length']; D(-105, A[0], A[1]); A[0]++) {
                    this[A[0]] = A[2][A[0]];
                }
            }
        });
        A[0]['prototype']['init'] = function (...E) {
            E.length = 2;
            return new A[0](E.shift(), E.shift());
        };
        return A.shift();
    }();
    var BH = BG['prototype'];
    var BI = BH['init'];
    BI['fn'] = BI['prototype'] = BH;
    BH['length'] = 0;
    BH['splice'] = BA;
    'function' === typeof C(-440) && (BH[C(-440)['iterator']] = AS[C(-440)['iterator']]);
    BH['map'] = function (...A) {
        A.length = 1;
        return BI(AT['apply']([], AW['call'](this, function (...E) {
            E.length = 2;
            return A[0]['call'](E[0], E.pop(), E.shift());
        })));
    };
    BH['slice'] = function (...A) {
        A.length = 2;
        return BI(AY['call'](this, A.shift(), A.shift()));
    };
    var BJ = /-([a-z])/g;
    function BK(...A) {
        A.length = 1;
        return A.shift()['replace'](BJ, function (...A) {
            A.length = 2;
            return A.pop()['toUpperCase']();
        });
    }
    BI['guid'] = 1;
    function BL(...A) {
        A.length = 2;
        A.push(A[0] && (A[0]['matches'] || A[0]['webkitMatchesSelector'] || A[0]['msMatchesSelector']));
        return !!A[2] && !!A[1] && A[2]['call'](A[0], A[1]);
    }
    function BM(...A) {
        A.length = 1;
        return !!A[0] && A[0] === A[0]['window'];
    }
    function BN(...A) {
        A.length = 1;
        return !!A[0] && 9 === A[0]['nodeType'];
    }
    function BO(...A) {
        A.length = 1;
        return !!A[0] && 1 === A[0]['nodeType'];
    }
    function BP(...A) {
        A.length = 1;
        return 'function' === typeof A.shift();
    }
    function BQ(...A) {
        A.length = 1;
        return 'string' === typeof A.shift();
    }
    function BR(...A) {
        A.length = 1;
        return !C(815)(C(-358)(A[0])) && C(33)(A[0]);
    }
    function BS(...A) {
        A.length = 1;
        if (D(229, 'object', typeof A[0]) || null === A[0]) {
            return !1;
        }
        A[0] = C(602)['getPrototypeOf'](A[0]);
        return null === A[0] || A[0] === C(602)['prototype'];
    }
    BI['isWindow'] = BM;
    BI['isFunction'] = BP;
    BI['isArray'] = AR;
    BI['isNumeric'] = BR;
    BI['isPlainObject'] = BS;
    BH['get'] = function (...A) {
        A.length = 1;
        if (void 0 === A[0]) {
            return AY['call'](this);
        }
        A[0] = C(949)(A[0]);
        return this[D(-405, 0, A[0]) ? D(870, A[0], this['length']) : A[0]];
    };
    BH['eq'] = function (...A) {
        A.length = 1;
        return BI(this['get'](A.shift()));
    };
    BH['first'] = function () {
        return this['eq'](0);
    };
    BH['last'] = function () {
        return this['eq'](-1);
    };
    function BT(...A) {
        A.length = 3;
        if (A[2]) {
            for (A[2] = A[0]['length']; A[2]-- && D(229, !1, A[1]['call'](A[0][A[2]], A[2], A[0][A[2]]));) {
                ;
            }
        } else {
            if (BS(A[0])) {
                A[3] = C(602)['keys'](A[0]);
                A[2] = 0;
                for (undefined; D(-105, A[2], A[4]); A[2]++) {
                    A[5] = A[3][A[2]];
                    if (!1 === A[1]['call'](A[0][A[5]], A[5], A[0][A[5]])) {
                        break;
                    }
                }
            } else {
                for (A[2] = 0, A[4] = A[0]['length']; D(-105, A[2], A[4]) && D(229, !1, A[1]['call'](A[0][A[2]], A[2], A[0][A[2]])); A[2]++) {
                    ;
                }
            }
        }
        return A.shift();
    }
    BI['each'] = BT;
    BH['each'] = function (...A) {
        A.length = 1;
        return BT(this, A.shift());
    };
    BH['prop'] = function (...A) {
        A.length = 2;
        if (A[0]) {
            if (BQ(A[0])) {
                return A[0] = C(-830)[A[0]] || A[0], D(-405, 2, arguments['length']) ? this[0] && this[0][A[0]] : this['each'](function (...E) {
                    E.length = 2;
                    E.pop()[A[0]] = A[1];
                });
            }
            for (undefined in A[0]) {
                this['prop'](A[2], A[0][A[2]]);
            }
            return this;
        }
    };
    BH['removeProp'] = function (...A) {
        A.length = 1;
        return this['each'](function (...E) {
            E.length = 2;
            delete E.pop()[C(-830)[A[0]] || A[0]];
        });
    };
    function BU(...A) {
        for (var E = A[0] = [], F = A[1] = 0; D(-105, A[1], arguments['length']); A[1]++) {
            A[0][A[1]] = arguments[A[1]];
        }
        A[1] = 'boolean' === typeof A[0][0] ? A[0]['shift']() : !1;
        A.push(A[0]['shift']());
        A.push(A[0]['length']);
        if (!A[2]) {
            return {};
        }
        if (!A[3]) {
            return BU(A[1], BI, A[2]);
        }
        for (undefined; D(-105, A[4], A[3]); A[4]++) {
            A[5] = A[0][A[4]];
            A[6] = undefined;
            for (A[6] in A[5]) {
                A[1] && (AR(A[5][A[6]]) || BS(A[5][A[6]])) ? (A[2][A[6]] && A[2][A[6]]['constructor'] === A[5][A[6]]['constructor'] || (A[2][A[6]] = new A[5][A[6]]['constructor']()), BU(A[1], A[2][A[6]], A[5][A[6]])) : A[2][A[6]] = A[5][A[6]];
            }
        }
        return A[2];
    }
    BI['extend'] = BU;
    BH['extend'] = function (...A) {
        A.length = 1;
        return BU(BH, A.shift());
    };
    function BV(...A) {
        A.length = 1;
        return BQ(A[0]) ? function (...E) {
            E.length = 2;
            return BL(E.pop(), A[0]);
        } : BP(A[0]) ? A[0] : D(-402, A[0], BG) ? function (...E) {
            E.length = 2;
            return A[0]['is'](E.pop());
        } : A[0] ? function (...E) {
            E.length = 2;
            return E.pop() === A[0];
        } : function () {
            return !1;
        };
    }
    BH['filter'] = function (...A) {
        A.length = 1;
        A.push(BV(A.shift()));
        return BI(AU['call'](this, function (...E) {
            E.length = 2;
            return A[0]['call'](E[0], E.pop(), E.shift());
        }));
    };
    function BW(...A) {
        A.length = 2;
        return A[1] ? A[0]['filter'](A[1]) : A[0];
    }
    var BX = /\S+/g;
    function BY(...A) {
        A.length = 1;
        return BQ(A[0]) ? A[0]['match'](BX) || [] : [];
    }
    BH['hasClass'] = function (...A) {
        A.length = 1;
        return !!A[0] && AZ['call'](this, function (...E) {
            E.length = 1;
            return BO(E[0]) && E[0]['classList']['contains'](A[0]);
        });
    };
    BH['removeAttr'] = function (...A) {
        A.length = 1;
        A.push(BY(A.shift()));
        return this['each'](function (...E) {
            E.length = 2;
            BO(E[1]) && BT(A[0], function (...A) {
                A.length = 2;
                E[1]['removeAttribute'](A.pop());
            });
        });
    };
    BH['attr'] = function (...A) {
        A.length = 2;
        if (A[0]) {
            if (BQ(A[0])) {
                if (D(-405, 2, arguments['length'])) {
                    if (!this[0] || !BO(this[0])) {
                        return;
                    }
                    A[2] = this[0]['getAttribute'](A[0]);
                    return null === A[2] ? void 0 : A[2];
                }
                return void 0 === A[1] ? this : null === A[1] ? this['removeAttr'](A[0]) : this['each'](function (...E) {
                    E.length = 2;
                    BO(E[1]) && E[1]['setAttribute'](A[0], A[1]);
                });
            }
            for (A[2] in A[0]) {
                this['attr'](A[2], A[0][A[2]]);
            }
            return this;
        }
    };
    BH['toggleClass'] = function (...A) {
        A.length = 2;
        A.push(BY(A.shift()));
        A.push(D(229, void 0, A[0]));
        return this['each'](function (...E) {
            E.length = 2;
            BO(E[1]) && BT(A[1], function (...F) {
                F.length = 2;
                A[2] ? A[0] ? E[1]['classList']['add'](F[1]) : E[1]['classList']['remove'](F[1]) : E[1]['classList']['toggle'](F[1]);
            });
        });
    };
    BH['addClass'] = function (...A) {
        A.length = 1;
        return this['toggleClass'](A.shift(), !0);
    };
    BH['removeClass'] = function (...A) {
        A.length = 1;
        return arguments['length'] ? this['toggleClass'](A[0], !1) : this['attr']('class', '');
    };
    function BZ(...A) {
        A.length = 4;
        for (var E = A[4] = [], F = A[5] = BP(A[1]), G = A[6] = A[3] && BV(A[3]), H = A[7] = 0, I = A[8] = A[0]['length']; D(-105, A[7], A[8]); A[7]++) {
            if (A[5]) {
                A[9] = A[1](A[0][A[7]]);
                A[9]['length'] && AX['apply'](A[4], A[9]);
            } else {
                for (A[9] = A[0][A[7]][A[1]]; !(null == A[9] || A[3] && A[6](-1, A[9]));) {
                    A[4]['push'](A[9]), A[9] = A[2] ? A[9][A[1]] : null;
                }
            }
        }
        return A[4];
    }
    function CA(...A) {
        A.length = 1;
        return D(-105, 1, A[0]['length']) ? AU['call'](A[0], function (...A) {
            A.length = 3;
            return AV['call'](A.pop(), A.shift()) === A.shift();
        }) : A[0];
    }
    BI['unique'] = CA;
    BH['add'] = function (...A) {
        A.length = 2;
        return BI(CA(this['get']()['concat'](BI(A.shift(), A.shift())['get']())));
    };
    function CB(...A) {
        A.length = 3;
        if (BO(A[0])) {
            A[3] = AK['getComputedStyle'](A[0], null);
            return A[2] ? A[3]['getPropertyValue'](A[1]) || void 0 : A[3][A[1]] || A[0]['style'][A[1]];
        }
    }
    function CC(...A) {
        A.length = 2;
        return C(906)(CB(A[0], A[1]), 10) || 0;
    }
    var CD = /^--/;
    var CE = AN['style'];
    var CF = [
        'moz',
        'ms',
        'webkit'
    ];
    var CG = CF;
    for (var CH = 1; CH; CH--) {
        CG.unshift(CG.pop());
    }
    function CI(...A) {
        A.length = 2;
        void 0 === A[1] && (A[1] = CD['test'](A[0]));
        if (A[1]) {
            return A[0];
        }
        if (!C(-876)[A[0]]) {
            A[1] = BK(A[0]);
            A[2] = D(870, D(870, '', A[1][0]['toUpperCase']()), A[1]['slice'](1));
            A[1] = D(870, D(870, D(870, A[1], ' '), CF['join'](D(870, A[2], ' '))), A[2])['split'](' ');
            BT(A[1], function (...E) {
                E.length = 2;
                if (D(972, E[1], CE)) {
                    return C(-876)[A[0]] = E[1], !1;
                }
            });
        }
        return C(-876)[A.shift()];
    }
    function CJ(...A) {
        A.length = 3;
        void 0 === A[2] && (A[2] = CD['test'](A[0]));
        return A[2] || C(-183)[A[0]] || !BR(A[1]) ? A[1] : D(870, A[1], 'px');
    }
    BH['css'] = function (...A) {
        A.length = 2;
        if (BQ(A[0])) {
            A[2] = CD['test'](A[0]);
            A[0] = CI(A[0], A[2]);
            if (D(-405, 2, arguments['length'])) {
                return this[0] && CB(this[0], A[0], A[2]);
            }
            if (!A[0]) {
                return this;
            }
            A[1] = CJ(A[0], A[1], A[2]);
            return this['each'](function (...E) {
                E.length = 2;
                BO(E[1]) && (A[2] ? E[1]['style']['setProperty'](A[0], A[1]) : E[1]['style'][A[0]] = A[1]);
            });
        }
        for (undefined in A[0]) {
            this['css'](A[3], A[0][A[3]]);
        }
        return this;
    };
    var CK = /^\s+|\s+$/;
    function CL(...A) {
        A.length = 2;
        A[0] = A[0]['dataset'][A[1]] || A[0]['dataset'][BK(A[1])];
        return CK['test'](A[0]) ? A[0] : AI(C(192)['parse'], A[0]);
    }
    BH['data'] = function (...A) {
        A.length = 2;
        if (!A[0]) {
            if (!this[0]) {
                return;
            }
            A[2] = {};
            A[3] = undefined;
            for (A[3] in this[0]['dataset']) {
                A[2][A[3]] = CL(this[0], A[3]);
            }
            return A[2];
        }
        if (BQ(A[0])) {
            return D(-405, 2, arguments['length']) ? this[0] && CL(this[0], A[0]) : void 0 === A[1] ? this : this['each'](function (...E) {
                E.length = 2;
                E[0] = A[1];
                E[0] = AI(C(192)['stringify'], E[0]);
                E.pop()['dataset'][BK(A[0])] = E.shift();
            });
        }
        for (A[3] in A[0]) {
            this['data'](A[3], A[0][A[3]]);
        }
        return this;
    };
    function CM(...A) {
        A.length = 2;
        A.push(A[0]['documentElement']);
        return C(-282)['max'](A[0]['body'][D(870, 'scroll', A[1])], A[2][D(870, 'scroll', A[1])], A.shift()['body'][D(870, 'offset', A[0])], A[1][D(870, 'offset', A[0])], A.pop()[D(870, 'client', A.shift())]);
    }
    function CN(...A) {
        A.length = 2;
        return D(870, D(870, D(870, CC(A[0], D(870, D(870, 'border', A[1] ? 'Left' : 'Top'), 'Width')), CC(A[0], D(870, 'padding', A[1] ? 'Left' : 'Top'))), CC(A[0], D(870, 'padding', A[1] ? 'Right' : 'Bottom'))), CC(A.shift(), D(870, D(870, 'border', A[0] ? 'Right' : 'Bottom'), 'Width')));
    }
    BT([
        !0,
        !1
    ], function (...A) {
        A.length = 2;
        BT([
            'Width',
            'Height'
        ], function (...E) {
            E.length = 2;
            BH[D(870, A[1] ? 'outer' : 'inner', E[1])] = function (...F) {
                F.length = 1;
                if (this[0]) {
                    return BM(this[0]) ? A[1] ? this[0][D(870, 'inner', E[1])] : this[0]['document']['documentElement'][D(870, 'client', E[1])] : BN(this[0]) ? CM(this[0], E[1]) : D(870, this[0][D(870, A[1] ? 'offset' : 'client', E[1])], F[0] && A[1] ? D(870, CC(this[0], D(870, 'margin', E[0] ? 'Top' : 'Left')), CC(this[0], D(870, 'margin', E[0] ? 'Bottom' : 'Right'))) : 0);
                }
            };
        });
    });
    BT([
        'Width',
        'Height'
    ], function (...A) {
        A.length = 2;
        A.push(A[1]['toLowerCase']());
        BH[A[2]] = function (...E) {
            E.length = 1;
            if (!this[0]) {
                return void 0 === E[0] ? void 0 : this;
            }
            if (!arguments['length']) {
                return BM(this[0]) ? this[0]['document']['documentElement'][D(870, 'client', A[1])] : BN(this[0]) ? CM(this[0], A[1]) : D(-979, this[0]['getBoundingClientRect']()[A[2]], CN(this[0], !A[0]));
            }
            E.push(C(906)(E.shift(), 10));
            return this['each'](function (...F) {
                F.length = 2;
                BO(F[1]) && (F[0] = CB(F[1], 'boxSizing'), F[1]['style'][A[2]] = CJ(A[2], D(870, E[0], 'border-box' === F[0] ? CN(F[1], !A[0]) : 0)));
            });
        };
    });
    BH['toggle'] = function (...A) {
        A.length = 1;
        return this['each'](function (...E) {
            E.length = 2;
            if (BO(E[1])) {
                if (void 0 === A[0] ? 'none' === CB(E[1], 'display') : A[0]) {
                    if (E[1]['style']['display'] = E[1]['___cd'] || '', 'none' === CB(E[1], 'display')) {
                        E[0] = E[1]['style'];
                        E[1] = E[1]['tagName'];
                        if (C(469)[E[1]]) {
                            E[1] = C(469)[E[1]];
                        } else {
                            E[2] = AM(E[1]);
                            AJ['body']['insertBefore'](E[2], null);
                            E[3] = CB(E[2], 'display');
                            AJ['body']['removeChild'](E[2]);
                            E[1] = C(469)[E[1]] = D(229, 'none', E[3]) ? E[3] : 'block';
                        }
                        E[0]['display'] = E[1];
                    }
                } else {
                    E[1]['___cd'] = CB(E[1], 'display'), E[1]['style']['display'] = 'none';
                }
            }
        });
    };
    BH['hide'] = function () {
        return this['toggle'](!1);
    };
    BH['show'] = function () {
        return this['toggle'](!0);
    };
    function CO(...A) {
        A.length = 2;
        return !A[1] || !AZ['call'](A[1], function (...E) {
            E.length = 1;
            return D(-405, 0, A[0]['indexOf'](E.shift()));
        });
    }
    var CP = /^(mouse|pointer|contextmenu|drag|drop|click|dblclick)/i;
    function CQ(...A) {
        A.length = 5;
        A.push(A[0]['___ce'] = A[0]['___ce'] || {});
        A[5][A[1]] = A[5][A[1]] || [];
        A.pop()[A[1]]['push']([
            A[2],
            A[3],
            A[4]
        ]);
        A.shift()['addEventListener'](A.shift(), A.pop());
    }
    function CR(...A) {
        A.length = 1;
        A[0] = A[0]['split']('.');
        return [
            A[0][0],
            A.shift()['slice'](1)['sort']()
        ];
    }
    function CS(...A) {
        A.length = 5;
        A.push(A[0]['___ce'] = A[0]['___ce'] || {});
        if (A[1]) {
            A[5][A[1]] && (A[5][A[1]] = A[5][A[1]]['filter'](function (...E) {
                E.length = 1;
                E.push(E[0][0]);
                E.push(E[0][1]);
                E[0] = E[0][2];
                if (A[4] && D(229, E[0]['guid'], A[4]['guid']) || !CO(E[1], A[2]) || A[3] && D(229, A[3], E[2])) {
                    return !0;
                }
                A[0]['removeEventListener'](A[1], E.shift());
            }));
        } else {
            for (A[1] in A[5]) {
                CS(A[0], A[1], A[2], A[3], A[4]);
            }
        }
    }
    BH['off'] = function (...A) {
        A.length = 3;
        A.push(this);
        if (void 0 === A[0]) {
            this['each'](function (...A) {
                A.length = 2;
                (BO(A[1]) || BN(A[1]) || BM(A[1])) && CS(A[1]);
            });
        } else {
            if (BQ(A[0])) {
                BP(A[1]) && (A[2] = A[1], A[1] = ''), BT(BY(A[0]), function (...E) {
                    E.length = 2;
                    E[0] = CR(E[1]);
                    E[1] = E[0][0];
                    E.push(E.shift()[1]);
                    E.push(C(977)[E[0]] || C(-506)[E[0]] || E[0]);
                    A[3]['each'](function (...F) {
                        F.length = 2;
                        (BO(F[1]) || BN(F[1]) || BM(F[1])) && CS(F[1], E[2], E[1], A[1], A[2]);
                    });
                });
            } else {
                for (undefined in A[0]) {
                    this['off'](A[4], A[0][A[4]]);
                }
            }
        }
        return this;
    };
    BH['on'] = function (...A) {
        A.length = 5;
        A.push(this);
        if (!BQ(A[0])) {
            for (undefined in A[0]) {
                this['on'](A[6], A[1], A[2], A[0][A[6]], A[4]);
            }
            return this;
        }
        BQ(A[1]) || (D(229, void 0, A[1]) && D(229, null, A[1]) && (D(229, void 0, A[2]) && (A[3] = A[2]), A[2] = A[1]), A[1] = '');
        BP(A[3]) || (A[3] = A[2], A[2] = void 0);
        if (!A[3]) {
            return this;
        }
        BT(BY(A.shift()), function (...E) {
            E.length = 2;
            E[0] = CR(E[1]);
            E[1] = E[0][0];
            E.push(E.shift()[1]);
            E.push(C(977)[E[0]] || C(-506)[E[0]] || E[0]);
            E.push(D(972, E[0], C(977)));
            E.push(D(972, E.shift(), C(-506)));
            E[1] && A[4]['each'](function (...F) {
                F.length = 2;
                if (BO(F[1]) || BN(F[1]) || BM(F[1])) {
                    F[0] = function undefined(...G) {
                        G.length = 1;
                        if (G[0]['target'][D(870, '___i', G[0]['type'])]) {
                            return G[0]['stopImmediatePropagation']();
                        }
                        if (!G[0]['namespace'] || CO(E[0], G[0]['namespace']['split']('.'))) {
                            if (A[0] || !(E[3] && (D(229, G[0]['target'], F[1]) || G[0]['___ot'] === E[1]) || E[2] && G[0]['relatedTarget'] && F[1]['contains'](G[0]['relatedTarget']))) {
                                G[1] = F[1];
                                if (A[0]) {
                                    for (undefined; !BL(G[2], A[0]);) {
                                        if (G[2] === F[1]) {
                                            return;
                                        }
                                        G[2] = G[2]['parentNode'];
                                        if (!G[2]) {
                                            return;
                                        }
                                    }
                                    G[1] = G[2];
                                    G[0]['___cd'] = !0;
                                }
                                G[0]['___cd'] && C(602)['defineProperty'](G[0], 'currentTarget', {
                                    ['configurable']: !0,
                                    ['get']: function () {
                                        return G[1];
                                    }
                                });
                                C(602)['defineProperty'](G[0], 'data', {
                                    ['configurable']: !0,
                                    ['get']: function () {
                                        return A[1];
                                    }
                                });
                                G[2] = A[2]['call'](G[1], G[0], G[0]['___td']);
                                A[3] && CS(F[1], E[1], E[0], A[0], C(154));
                                !1 === G[2] && (G[0]['preventDefault'](), G[0]['stopPropagation']());
                            }
                        }
                    }, F[0]['guid'] = A[2]['guid'] = A[2]['guid'] || BI['guid']++, CQ(F[1], E[1], E[0], A[0], F[0]);
                }
            });
        });
        return this;
    };
    BH['one'] = function (...A) {
        A.length = 4;
        return this['on'](A.shift(), A.shift(), A.shift(), A.shift(), !0);
    };
    BH['ready'] = function (...A) {
        A.length = 1;
        A.push(function () {
            return C(23)(A.shift(), 0, BI);
        });
        D(229, 'loading', AJ['readyState']) ? A[0]() : AJ['addEventListener']('DOMContentLoaded', A[0]);
        return this;
    };
    BH['trigger'] = function (...A) {
        A.length = 2;
        if (BQ(A[0])) {
            A[2] = CR(A[0]);
            A[3] = A[2][0];
            A[2] = A[2][1];
            A[4] = C(977)[A[3]] || C(-506)[A[3]] || A[3];
            if (!A[4]) {
                return this;
            }
            A[5] = CP['test'](A[4]) ? 'MouseEvents' : 'HTMLEvents';
            A[0] = AJ['createEvent'](A[5]);
            A[0]['initEvent'](A[4], !0, !0);
            A[0]['namespace'] = A[2]['join']('.');
            A[0]['___ot'] = A[3];
        }
        A[0]['___td'] = A[1];
        A.push(D(972, A[0]['___ot'], C(-506)));
        return this['each'](function (...E) {
            E.length = 2;
            A[6] && BP(E[1][A[0]['___ot']]) && (E[1][D(870, '___i', A[0]['type'])] = !0, E[1][A[0]['___ot']](), E[1][D(870, '___i', A[0]['type'])] = !1);
            E.pop()['dispatchEvent'](A[0]);
        });
    };
    function CT(...A) {
        A.length = 1;
        return A[0]['multiple'] && A[0]['options'] ? BZ(AU['call'](A[0]['options'], function (...A) {
            A.length = 1;
            return A[0]['selected'] && !A[0]['disabled'] && !A[0]['parentNode']['disabled'];
        }), 'value') : A[0]['value'] || '';
    }
    var CU = /%20/g;
    var CV = /\r?\n/g;
    var CW = /file|reset|submit|button|image/i;
    var CX = /radio|checkbox/i;
    BH['serialize'] = function (...A) {
        A.unshift('');
        this['each'](function (...E) {
            E.length = 2;
            BT(E[1]['elements'] || [E[1]], function (...E) {
                E.length = 2;
                E[1]['disabled'] || !E[1]['name'] || 'FIELDSET' === E[1]['tagName'] || CW['test'](E[1]['type']) || CX['test'](E[1]['type']) && !E[1]['checked'] || (E[0] = CT(E[1]), D(229, void 0, E[0]) && (E[0] = AR(E[0]) ? E[0] : [E[0]], BT(E[0], function (...F) {
                    F.length = 2;
                    F[0] = A[0];
                    F[1] = D(870, D(870, D(870, '&', C(522)(E[1]['name'])), '='), C(522)(F[1]['replace'](CV, '\r\n'))['replace'](CU, '+'));
                    A[0] = D(870, F.shift(), F.shift());
                })));
            });
        });
        return A.shift()['slice'](1);
    };
    BH['val'] = function (...A) {
        A.length = 1;
        return arguments['length'] ? this['each'](function (...E) {
            E.length = 2;
            if ((E[0] = E[1]['multiple'] && E[1]['options']) || CX['test'](E[1]['type'])) {
                E[2] = AR(A[0]) ? AW['call'](A[0], C(-355)) : null === A[0] ? [] : [C(-355)(A[0])];
                E[0] ? BT(E[1]['options'], function (...A) {
                    A.length = 2;
                    A[1]['selected'] = D(-146, 0, E[2]['indexOf'](A.pop()['value']));
                }, !0) : E[1]['checked'] = D(-146, 0, E[2]['indexOf'](E[1]['value']));
            } else {
                E[1]['value'] = void 0 === A[0] || null === A[0] ? '' : A[0];
            }
        }) : this[0] && CT(this[0]);
    };
    BH['clone'] = function () {
        return this['map'](function (...A) {
            A.length = 2;
            return A.pop()['cloneNode'](!0);
        });
    };
    BH['detach'] = function (...A) {
        A.length = 1;
        BW(this, A.shift())['each'](function (...A) {
            A.length = 2;
            A[1]['parentNode'] && A[1]['parentNode']['removeChild'](A[1]);
        });
        return this;
    };
    var CY = /^\s*<(\w+)[^>]*>/;
    var CZ = /^<(\w+)\s*\/?>(?:<\/\1>)?$/;
    var DA = {
        '*': AN,
        'tr': AP,
        'td': AQ,
        'th': AQ,
        'thead': AO,
        'tbody': AO,
        'tfoot': AO
    };
    function DB(...A) {
        A.length = 1;
        if (!BQ(A[0])) {
            return [];
        }
        if (CZ['test'](A[0])) {
            return [AM(C(423)['$1'])];
        }
        A.push(CY['test'](A[0]) && C(423)['$1']);
        A[1] = DA[A[1]] || DA['*'];
        A[1]['innerHTML'] = A.shift();
        return BI(A.shift()['childNodes'])['detach']()['get']();
    }
    BI['parseHTML'] = DB;
    BH['empty'] = function () {
        return this['each'](function (...A) {
            A.length = 2;
            for (; A[1]['firstChild'];) {
                A[1]['removeChild'](A[1]['firstChild']);
            }
        });
    };
    BH['html'] = function (...A) {
        A.length = 1;
        return arguments['length'] ? void 0 === A[0] ? this : this['each'](function (...E) {
            E.length = 2;
            BO(E[1]) && (E[1]['innerHTML'] = A[0]);
        }) : this[0] && this[0]['innerHTML'];
    };
    BH['remove'] = function (...A) {
        A.length = 1;
        BW(this, A.shift())['detach']()['off']();
        return this;
    };
    BH['text'] = function (...A) {
        A.length = 1;
        return void 0 === A[0] ? this[0] ? this[0]['textContent'] : '' : this['each'](function (...E) {
            E.length = 2;
            BO(E[1]) && (E[1]['textContent'] = A[0]);
        });
    };
    BH['unwrap'] = function () {
        this['parent']()['each'](function (...A) {
            A.length = 2;
            D(229, 'BODY', A[1]['tagName']) && (A[0] = BI(A[1]), A[0]['replaceWith'](A[0]['children']()));
        });
        return this;
    };
    BH['offset'] = function (...A) {
        A.unshift(this[0]);
        if (A[0]) {
            return A[0] = A[0]['getBoundingClientRect'](), {
                ['top']: D(870, A[0]['top'], AK['pageYOffset']),
                ['left']: D(870, A[0]['left'], AK['pageXOffset'])
            };
        }
    };
    BH['offsetParent'] = function () {
        return this['map'](function (...A) {
            A.length = 2;
            for (A[0] = A[1]['offsetParent']; A[0] && 'static' === CB(A[0], 'position');) {
                A[0] = A[0]['offsetParent'];
            }
            return A[0] || AL;
        });
    };
    BH['position'] = function (...A) {
        A.unshift(this[0]);
        if (A[0]) {
            A[1] = 'fixed' === CB(A[0], 'position');
            A[2] = A[1] ? A[0]['getBoundingClientRect']() : this['offset']();
            if (!A[1]) {
                A[3] = A[0]['ownerDocument'];
                for (A[1] = A[0]['offsetParent'] || A[3]['documentElement']; (A[1] === A[3]['body'] || A[1] === A[3]['documentElement']) && 'static' === CB(A[1], 'position');) {
                    A[1] = A[1]['parentNode'];
                }
                D(229, A[1], A[0]) && BO(A[1]) && (A[3] = BI(A[1])['offset'](), A[2]['top'] -= D(870, A[3]['top'], CC(A[1], 'borderTopWidth')), A[2]['left'] -= D(870, A[3]['left'], CC(A[1], 'borderLeftWidth')));
            }
            return {
                ['top']: D(-979, A[2]['top'], CC(A[0], 'marginTop')),
                ['left']: D(-979, A[2]['left'], CC(A[0], 'marginLeft'))
            };
        }
    };
    BH['children'] = function (...A) {
        A.length = 1;
        return BW(BI(CA(BZ(this, function (...A) {
            A.length = 1;
            return A.shift()['children'];
        }))), A.shift());
    };
    BH['contents'] = function () {
        return BI(CA(BZ(this, function (...A) {
            A.length = 1;
            return 'IFRAME' === A[0]['tagName'] ? [A[0]['contentDocument']] : 'TEMPLATE' === A[0]['tagName'] ? A[0]['content']['childNodes'] : A[0]['childNodes'];
        })));
    };
    BH['find'] = function (...A) {
        A.length = 1;
        return BI(CA(BZ(this, function (...E) {
            E.length = 1;
            return BF(A[0], E.shift());
        })));
    };
    var DC = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;
    var DD = /^$|^module$|\/(java|ecma)script/i;
    var DE = [
        'nonce',
        'noModule',
        'type',
        'src'
    ];
    var DF = DE;
    for (var DG = 14; DG; DG--) {
        DF.unshift(DF.pop());
    }
    function DH(...A) {
        A.length = 2;
        A[0] = BI(A[0]);
        A[0]['filter']('script')['add'](A.shift()['find']('script'))['each'](function (...E) {
            E.length = 2;
            if (DD['test'](E[1]['type']) && AL['contains'](E[1])) {
                E[2] = AM('script');
                E[2]['text'] = E[1]['textContent']['replace'](DC, '');
                BT(DE, function (...A) {
                    A.length = 2;
                    E[1][A[1]] && (E[2][A[1]] = E[1][A[1]]);
                });
                A[0]['head']['insertBefore'](E[2], null);
                A[0]['head']['removeChild'](E[2]);
            }
        });
    }
    function DI(...A) {
        A.length = 8;
        BT(A.shift(), function (...E) {
            E.length = 2;
            BT(BI(E.pop()), function (...E) {
                E.length = 2;
                BT(BI(A[0]), function (...F) {
                    F.length = 2;
                    F.push(A[1] ? F[1] : E[1]);
                    F[0] = A[1] ? E[0] : F[0];
                    F[1] = A[1] ? E[1] : F[1];
                    F[2] = F[0] ? F[2]['cloneNode'](!0) : F[2];
                    F[0] = !F[0];
                    A[3] ? F[1]['insertBefore'](F[2], A[2] ? F[1]['firstChild'] : null) : F[1]['parentNode']['insertBefore'](F[2], A[2] ? F[1] : F[1]['nextSibling']);
                    F[0] && DH(F[2], F[1]['ownerDocument']);
                }, A[6]);
            }, A[5]);
        }, A[4]);
        return A.shift();
    }
    BH['after'] = function () {
        return DI(arguments, this, !1, !1, !1, !0, !0);
    };
    BH['append'] = function () {
        return DI(arguments, this, !1, !1, !0);
    };
    BH['appendTo'] = function (A) {
        return DI(arguments, this, !0, !1, !0);
    };
    BH['before'] = function () {
        return DI(arguments, this, !1, !0);
    };
    BH['insertAfter'] = function (A) {
        return DI(arguments, this, !0, !1, !1, !1, !1, !0);
    };
    BH['insertBefore'] = function (A) {
        return DI(arguments, this, !0, !0);
    };
    BH['prepend'] = function () {
        return DI(arguments, this, !1, !0, !0, !0, !0);
    };
    BH['prependTo'] = function (A) {
        return DI(arguments, this, !0, !0, !0, !1, !1, !0);
    };
    BH['replaceWith'] = function (...A) {
        A.length = 1;
        return this['before'](A.shift())['remove']();
    };
    BH['replaceAll'] = function (...A) {
        A.length = 1;
        BI(A.shift())['replaceWith'](this);
        return this;
    };
    BH['wrapAll'] = function (...A) {
        A.length = 1;
        A[0] = BI(A[0]);
        for (undefined; A[1]['children']['length'];) {
            A[1] = A[1]['firstElementChild'];
        }
        this['first']()['before'](A.shift());
        return this['appendTo'](A.shift());
    };
    BH['wrap'] = function (...A) {
        A.length = 1;
        return this['each'](function (...E) {
            E.length = 2;
            E.push(BI(A[0])[0]);
            BI(E[1])['wrapAll'](E[0] ? E[2]['cloneNode'](!0) : E[2]);
        });
    };
    BH['wrapInner'] = function (...A) {
        A.length = 1;
        return this['each'](function (...E) {
            E.length = 2;
            E[0] = BI(E[1]);
            E[1] = E[0]['contents']();
            E[1]['length'] ? E[1]['wrapAll'](A[0]) : E[0]['append'](A[0]);
        });
    };
    BH['has'] = function (...A) {
        A.length = 1;
        A.push(BQ(A[0]) ? function (...E) {
            E.length = 2;
            return BF(A[0], E.pop())['length'];
        } : function (...E) {
            E.length = 2;
            return E.pop()['contains'](A[0]);
        });
        return this['filter'](A.pop());
    };
    BH['is'] = function (...A) {
        A.length = 1;
        A.push(BV(A.shift()));
        return AZ['call'](this, function (...E) {
            E.length = 2;
            return A[0]['call'](E[0], E.pop(), E.shift());
        });
    };
    BH['next'] = function (...A) {
        A.length = 3;
        return BW(BI(CA(BZ(this, 'nextElementSibling', A[1], A.pop()))), A.shift());
    };
    BH['nextAll'] = function (...A) {
        A.length = 1;
        return this['next'](A.shift(), !0);
    };
    BH['nextUntil'] = function (...A) {
        A.length = 2;
        return this['next'](A.pop(), !0, A.shift());
    };
    BH['not'] = function (...A) {
        A.length = 1;
        A.push(BV(A[0]));
        return this['filter'](function (...E) {
            E.length = 2;
            return (!BQ(A[0]) || BO(E[1])) && !A[1]['call'](E[1], E[0], E[1]);
        });
    };
    BH['parent'] = function (...A) {
        A.length = 1;
        return BW(BI(CA(BZ(this, 'parentNode'))), A.shift());
    };
    BH['index'] = function (...A) {
        A.length = 1;
        A.push(A[0] ? BI(A[0])[0] : this[0]);
        A[0] = A[0] ? this : BI(A[1])['parent']()['children']();
        return AV['call'](A.shift(), A.shift());
    };
    BH['closest'] = function (...A) {
        A.length = 1;
        A.push(this['filter'](A[0]));
        if (A[1]['length']) {
            return A[1];
        }
        A.push(this['parent']());
        return A[2]['length'] ? A[2]['closest'](A[0]) : A[1];
    };
    BH['parents'] = function (...A) {
        A.length = 2;
        return BW(BI(CA(BZ(this, 'parentElement', !0, A.pop()))), A.shift());
    };
    BH['parentsUntil'] = function (...A) {
        A.length = 2;
        return this['parents'](A.pop(), A.shift());
    };
    BH['prev'] = function (...A) {
        A.length = 3;
        return BW(BI(CA(BZ(this, 'previousElementSibling', A[1], A.pop()))), A.shift());
    };
    BH['prevAll'] = function (...A) {
        A.length = 1;
        return this['prev'](A.shift(), !0);
    };
    BH['prevUntil'] = function (...A) {
        A.length = 2;
        return this['prev'](A.pop(), !0, A.shift());
    };
    BH['siblings'] = function (...A) {
        A.length = 1;
        return BW(BI(CA(BZ(this, function (...A) {
            A.length = 1;
            return BI(A[0])['parent']()['children']()['not'](A.shift());
        }))), A.shift());
    };
    AK['cash'] = AK['$'] = BI;
}());