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
})
