/* Copyright (c) 2017 Richard Rodger, MIT License */
'use strict'

var Lab = require('lab')
var Code = require('code')

var lab = (exports.lab = Lab.script())
var describe = lab.describe
var it = lab.it
var expect = Code.expect

var Seneca = require('seneca')

describe('monitor', function() {
  it('plugin', function(fin) {
    Seneca().test(fin).use('..').ready(fin)
  })

  it('happy', function(fin) {
    var collect = Seneca({id$:'M0', tag:'m0'}).test(fin).use('..', { collect: true })

    var xI = 0

    var t0 = Seneca({ id$:'T0', tag: 't0', version: '1.0.0' })
          .test(fin)
          .use('..')
          .add('t:3')
          .listen(20000)

    var t1 = Seneca({ id$:'T1', tag: 't0', version: '1.0.0' })
          .test(fin)
          .use('..')
          .add('t:3')
          .listen(20001)

    var s0 = Seneca({ id$:'S0', tag: 's0', version: '1.0.0' })
          .test(fin)
          .use('..')
          .add('a:1')
          .add('b:2')
          .add('c:3', function (msg, reply) {
            this.act('t:3',{x:(xI++)%2}, reply)
          })
          .listen(20100)
          .client({pin:'t:3,x:0', port:20000})
          .client({pin:'t:3,x:1', port:20001})

    var c1 = Seneca({ id$:'C1', tag: 'c1', version: '2.0.0' })
          .test(fin)
          .use('..')
          .client({pins:['a:1','b:2','c:3'], port:20100})

    var c2 = Seneca({ id$:'C2', tag: 'ca', version: '3.0.0' })
          .test(fin)
          .use('..')
          .client({pins:['a:1','b:2','c:3'], port:20100})

    var c3 = Seneca({ id$:'C3', tag: 'ca', version: '3.0.1' })
          .test(fin)
          .use('..')
          .client({pins:['a:1','b:2','c:3'], port:20100})

    console.log()

    setTimeout(function() {
      c1.act('a:1', function() {})

      c2.act('a:1', function() {})
      c2.act('b:2')

      c3.act('b:2')
      c3.act('c:3', function() {})
      c3.act('c:3', function() {})

      setTimeout(function() {
        collect.act('role:monitor,get:map', function(err, out) {

          console.dir(out,{depth:null,colors:true})
          fin()
        })
      },100)
    },200)
  })
})
