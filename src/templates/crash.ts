import Template from "./template";

export const CrashTemplate1 = new Template(`
var {var} = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_\`{|}~"';
while(true){
    {var} = {var};
    if(!{var}) break;
}
`);

export const CrashTemplate2 = new Template(`
while(true) {
    var {var} = 99;
    for({var} = 99; {var} == {var}; {var} *= {var}) {
        !{var} && console.log({var});
        if ({var} <= 10){
            break;
        }
    };
    if({var} === 100) {
        {var}--
    }
 };`);
