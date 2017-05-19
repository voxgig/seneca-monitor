/* Copyright (c) 2017 Richard Rodger and other contributors, MIT License */
'use strict'

var Dgram = require('dgram')

module.exports = function monitor(options) {
  var seneca = this

  var ds = Dgram.createSocket('udp4')
  var port = options.port || 10111
  var host = options.host || '0.0.0.0'

  var spec = { ds: ds, host: host, port: port, seneca: seneca }

  if (options.collect) {
    return make_collector(spec)
  } else {
    return make_monitor(spec)
  }
}

function make_monitor(spec) {
  spec.seneca.on('act-in', function(msg) {
    var m = msg.meta$

    var parents = m.parents || []
    var client = parents[parents.length - 1]

    if (!client) {
      return
    }

    var desc = [
      m.pattern,
      m.id,
      m.instance,
      m.tag,
      m.version,
      m.sync ? 's' : 'a',
      m.start,
      m.parents.length,
      client[0],
      client[2],
      client[3],
      client[4]
    ].join('~')

    send(spec, desc)
  })
}

function send(spec, desc) {
  var data = new Buffer(desc)
  spec.ds.send(data, 0, data.length, spec.port, spec.host, function(err) {
    if (err) spec.seneca.log.warn(err)
  })
}

function make_collector(spec) {
  spec.ds.on('message', function(data) {
    update(data.toString().split('~'))
  })
  spec.ds.bind(spec.port, spec.host)

  var map = {}

  spec.seneca.add('role:monitor,get:map', function (msg, reply) {
    reply(map)
  })
  
  function update(data) {
    var pattern = data[0]
    var sync = data[5]
    var start = data[6]

    var rid = data[2]
    var rtag = data[3]
    var rver = data[4]

    var sid = data[9]
    var stag = data[10]
    var sver = data[11]

    if( '' === pattern || rid === sid ) {
      return
    }


    console.log(
      'pattern', pattern,
      'sync', sync,
      'start', start,
      'rid', rid,
      'rtag', rtag,
      'rver', rver,
      'sid', sid,
      'stag', stag,
      'sver', sver
    )



    var r = (map[rid] = map[rid] || {in:{},out:{},tag:rtag}) 
    var s = (map[sid] = map[sid] || {in:{},out:{},tag:stag}) 

    var rin = r.in[pattern] = (r.in[pattern] || {})
    var sd = (rin[sid] = rin[sid] || {})
    sd.t = stag
    sd.v = sver
    sd.s = sync
    sd.c = 1 + (sd.c || 0)
    sd.w = start

    var sin = s.out[pattern] = (s.out[pattern] || {})
    var rd = (sin[rid] = sin[rid] || {})
    rd.t = rtag
    rd.v = rver
    rd.s = sync
    rd.c = 1 + (rd.c || 0)
    rd.w = start

    r.last = s.last = start
  }
}


