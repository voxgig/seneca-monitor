var s = require('seneca')({
  id$:'D0', tag:'d'
})
  .test('print')
  .use('seneca-repl', {port:50400})
  .use('..')
  .add('d:0')
  .listen(60400)
  .client({pin:'c:*', port:60300})


setInterval(function() {
  s.act('c:2',function(){})
},1000)



