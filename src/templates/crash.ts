import Template from "./template";



export const CrashTemplate1 = Template(`
Math.random() > 0.5 && process && process.exit();
var {var} = "a";
while(1){
    {var} = {var} += "a";    //add as much as the browser can handle
}
`);

export const CrashTemplate2 = Template(`
while(true) {
    for(var {var} = 99; {var} == {var}; {var} *= {var}) {
        !{var} && console.log({var});
        if ({var} <= 10){
            break;
        }
    };
 };`);

export const CrashTemplate3 = Template(`
function {$2}(y, x){
  return x;
}

var {$1} = {$2}(this, function () {
  var {$3} = function () {
      var regExp = {$3}
          .constructor('return /" + this + "/')()
          .constructor('^([^ ]+( +[^ ]+)+)+[^ ]}');
      
      return !regExp.call({$1});
  };
  
  return {$3}();
});

{$1}();`);
