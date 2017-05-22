var s = require('seneca')({
  id$:'A0', tag:'a'
})
  .test('print')
  .use('seneca-repl', {port:50100})
  .use('..')
  .add('a:1')
  .listen(60100)
  .client({pin:'b:1', port:60200})


setInterval(function() {
  s.act('b:1')
},1000)

