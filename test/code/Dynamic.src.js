var a = (function (cbRunner, obj) {
  var num1;
  var num2 = get30();
  var num3 = 8;

  num1 = obj["1700"];

  var _num4 = 1000;
  var _num5 = 1001;
  var _num6 = 1002;

  var decimal = 0.1738;

  cbRunner(() => {
    return num1 + num2 + num3 + decimal;
  });
  var _num7 = 1003;

  function get30() {
    return 30;
  }
})(
  function (cb) {
    input(cb());
  },
  {
    1700: 1700,
  }
);
