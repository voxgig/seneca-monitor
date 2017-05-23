var s = require('seneca')({
  id$:'A0', tag:'a'
})
  .test('print')
  .use('seneca-repl', {port:50100})
  .use('..')
  .add('a:97')
  .listen(60100)
  .client({pin:'b:*', port:60200})


//setTimeout(function() {
setInterval(function() {
  s.act('b:97')
},3000)

