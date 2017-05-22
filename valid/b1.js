var s = require('seneca')({
  id$:'B0', tag:'b'
})
  .test('print')
  .use('seneca-repl', {port:50200})
  .use('..')
  .add('b:1')
  .listen(60200)
  .client({pin:'a:1', port:60100})


setInterval(function() {
  s.act('a:1',function(){})
},1000)
