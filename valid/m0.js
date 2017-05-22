require('seneca')({
  id$:'M0', tag:'m0'
})
  .test('print')
  .use('seneca-repl', {port:50000})
  .use('..', {collect: true})
