/* Copyright (c) 2017 Richard Rodger and other contributors, MIT License */
'use strict'

var Dgram = require('dgram')

var Hapi = require('hapi')
var Inert = require('inert')

module.exports = function monitor(options) {
  var seneca = this

  var opts = this.util.deepextend({
    udp: {
      kind: 'udp4',
      port: 10111,
      host: '0.0.0.0'
    },
    web: {
      port: 10181,
      host: '0.0.0.0',
      folder: __dirname
    }
  },options)

  var ds = Dgram.createSocket(opts.udp.kind)

  var spec = { ds: ds, seneca: seneca, opts:opts }

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

    // console.log(m)

    var desc = [
      'M',
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

  spec.seneca.add('role:seneca,cmd:close', function (msg, reply) {
    var seneca = this
    //console.log('CLOSE')
    send(spec,'D~'+spec.seneca.id)
    setTimeout(function() {
      spec.ds.close(function () {
        spec.ds = null
        seneca.prior(msg,reply)
      })
    },100)
  })
}

function send(spec, desc) {
  if (!spec.ds) return;

  var data = new Buffer(desc)
  spec.ds.send(data, 0, data.length, spec.opts.udp.port, spec.opts.udp.host, function(err) {
    if (err) spec.seneca.log.warn(err)
  })
}

function make_collector(spec) {
  if (!spec.ds) return;

  spec.ds.on('message', function(data) {
    update(data.toString().split('~'))
  })
  spec.ds.bind(spec.opts.udp.port, spec.opts.udp.host)

  var map = {}
  spec.map = map

  spec.seneca.add('role:monitor,get:map', function (msg, reply) {
    reply(map)
  })

  // TODO: should be plugin init
  make_web(spec, console.log)

  
  function update(data) {
    var cmd = data[0]

    if( 'D' == cmd ) {
      var did = data[1]

      Object.keys(map).forEach(function (kid) {
        if(kid === did) {
          delete map[did]
          return
        }
        Object.keys(map[kid].in).forEach(function (pat) {
          Object.keys(map[kid].in[pat]).forEach(function (mid) {
            if(mid === did) {
              delete map[kid].in[pat][did]
            }
          })
        })
        Object.keys(map[kid].out).forEach(function (pat) {
          Object.keys(map[kid].out[pat]).forEach(function (mid) {
            if(mid === did) {
              delete map[kid].out[pat][did]
            }
          })
        })
      })
      return
    }

    var o = 1

    var pattern = data[o+0]

    if (-1 != pattern.indexOf('role:seneca')) {
      return
    }

    var sync = data[o+5]
    var start = data[o+6]

    var rid = data[o+2]
    var rtag = data[o+3]
    var rver = data[o+4]

    var sid = data[o+9]
    var stag = data[o+10]
    var sver = data[o+11]

    if( '' === pattern || rid === sid ) {
      return
    }


    /*
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
     */


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


function make_web(spec, done) {
  var server = new Hapi.Server()
  server.connection({port: spec.opts.web.port, host:spec.opts.web.host})

  server.register( Inert )

  server.route({
    method: 'GET',
    path: '/{path*}',
    handler: {
      directory: {
        path: spec.opts.web.folder + '/www',
      }
    }
  })

  server.route({ 
    method: 'GET', path: '/api/map', 
    handler: function( request, reply ) {
      spec.seneca.act('role:monitor,get:map', function (err, out) {
        reply(err||out||{})
      })
    }
  })

  server.start(done)      
}
