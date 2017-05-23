var s = require('seneca')({
  id$:'C0', tag:'c'
})
  .test('print')
  .use('seneca-repl', {port:50300})
  .use('..')
  .add('c:97')
  .listen(60300)
  .client({pin:'a:*', port:60100})


setInterval(function() {
//setTimeout(function() {
  s.act('a:97',function(){})
},3000)



