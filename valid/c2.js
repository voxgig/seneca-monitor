var s = require('seneca')({
  id$:'C2', tag:'c'
})
  .test('print')
  .use('seneca-repl', {port:50300})
  .use('..')
  .add('c:2')
  .listen(60300)
  .client({pin:'a:1', port:60100})


setInterval(function() {
  s.act('a:1',function(){})
},1000)



