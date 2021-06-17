var a = (function (cbRunner) {
  var num1;
  var num2 = 30;
  var num3 = 8;

  num1 = 1700;

  var _num4 = 1000;
  var _num5 = 1001;
  var _num6 = 1002;
  cbRunner(() => {
    return num1 + num2 + num3;
  });
  var _num7 = 1003;
})(function (cb) {
  input(cb());
});
