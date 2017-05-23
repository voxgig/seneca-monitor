var s = require('seneca')({
  id$:'B0', tag:'b'
})
  .test('print')
  .use('seneca-repl', {port:50200})
  .use('..')
  .add('b:97')
  .listen(60200)
  .client({pin:'a:*', port:60100})


//setTimeout(function() {
setInterval(function() {
  s.act('a:97')
},3000)
