
var width = 1000,
    height = 600;

var svg = d3.select("body").append("svg")
      .attr("width", width)
      .attr("height", height);

// Per-type markers, as they don't inherit styles.
svg.append("defs").selectAll("marker")
  .data(["async", "sync"])
  .enter().append("marker")
  .attr("id", function(d) { return d; })
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", 8)
  .attr("refY", 0)
  .attr("markerWidth", 10)
  .attr("markerHeight", 10)
  .attr("orient", "auto")
  .append("path")
  .attr("d", function (d) { 
    return "M1,-4 L9,0 L1,4 Z"; 
  })


//setInterval(get_map,1000)

var view = build_view()

function get_map() {
  fetch('/api/map')
    .then(function(response) { 
      return response.json()
    })
    .then(function(json) {
      build_graph(json)
      //console.log(graph)
      view.restart(view)
    })
}


var seen = {}
function build_graph(data) {
  var nodes = view.nodes
  var links = view.links

  Object.keys(data).forEach(function(src){
    Object.keys(data[src].in).forEach(function(msg){
      Object.keys(data[src].in[msg]).forEach(function(tar){

        if(!seen[src]) {
          view.nodes.push({id:src})
          seen[src] = 1
        }

        if(!seen[tar]) {
          view.nodes.push({id:tar})
          seen[tar] = 1
        }

        if(!seen[src+'~'+tar]) {
          links.push({
            source:src,
            target:tar,
            msg:msg,
            type:data[src].in[msg][tar].s==='s'?'sync':'async'
          })
          seen[src+'~'+tar] = 1
        }
      })
    })
  })
}



function build_view() {

  var hex_size = 32
  var node_dist = 40

  var links = []

  var simulation = d3.forceSimulation()
        .force("link", d3.forceLink(links).id(function(d) { return d.id }))
        .force("collide",d3.forceCollide( function(d){
          return hex_size + node_dist }).iterations(16) )
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("y", d3.forceY(0))
        .force("x", d3.forceX(0))
        //.alphaTarget(1)  
        .on("tick", ticked)
  
  var link = svg.append("g")
        .attr("class", "link_group")
        .selectAll("path")

  var msg = svg.append("g")
        .attr("class", "msg_group")
        .selectAll("text")
  
  var node_bg = svg.append("g")
        .attr("class", "node_bg_group")
        .selectAll("circle")

  var node = svg.append("g")
        .attr("class", "node_group")
        .selectAll("path")

  var node_name = svg.append("g")
        .attr("class", "node_name_group")
        .selectAll("text")

  
  
  function ticked() {
    link.attr("d", linkArc);

    msg
      .attr("x", msg_center('x'))
      .attr("y", msg_center('y'))
    
    node.attr("transform", transform)
    node_name.attr("transform", transform)
    node_bg.attr("transform", transform)
  }  
  

  function restart(data) {
    node = node.data(data.nodes, function(d) { return d.id;});
    node.exit().remove();


    node = node
      .enter().append("path")
      .attr("d", polygon(0,0,hex_size,6))
      .attr("class", "service")  
      .merge(node)
      .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))


    node_name = node_name.data(data.nodes, function(d) { return d.id;});
    node_name.exit().remove();
    node_name = node_name
      .enter().append("text")
      .attr("y", ".31em")
      .text(function(d) { return d.id; })
      .merge(node_name)

    node_bg = node_bg.data(data.nodes, function(d) { return d.id;});
    node_bg.exit().remove();
    node_bg = node_bg
      .enter().append("circle")
      .attr("class", 'service_bg')
      .attr("r", 34)
      .merge(node_bg)


    link = link.data(data.links, function(d) { 
      return link_id(d) 
    })
    link.exit().remove();
    link = link.enter().append("path")
      .attr("class", function(d) { return "link " + d.type; })
      .attr("marker-end", function(d) { return "url(#" + d.type + ")"; })
      .attr('id', function(d) { 
        return link_id(d) 
      })
      .merge(link);

    
    msg = msg.data(data.links, function(d) { return d.source.id + "-" + d.target.id; });
    msg.exit().remove();
    msg = msg.enter().append("text")
      .attr("class", "msg")
      .attr("x", msg_center('x'))
      .attr("y", msg_center('y'))
      .text(function(d) { return d.msg; })
      .merge(msg)

    simulation.nodes(data.nodes);
    simulation.force("link").links(data.links);
    simulation.alpha(1).restart();
  }

  
  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }
  
  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  } 


  function transform(d) {
    var ts = (!isNaN(d.x) && !isNaN(d.y)) ? "translate(" + d.x + "," + d.y + ")" : ''
    return ts
  }

  function theta(d) {
    return Math.atan((d.target.y - d.source.y)/(d.target.x - d.source.x))
  }

  function link_id(d) {
    return 'link~'+(d.source.id || d.source)+'~'+d.msg+'~'+(d.target.id || d.target)
  }

  function msg_center(axis) {
    return function (d) {
      var bc = box_center(document.getElementById(link_id(d))),
          dx = d.target.x - d.source.x,
          dy = d.target.y - d.source.y,
          dr = Math.sqrt(dx * dx + dy * dy),
          o = dr/10,
          t = (Math.PI/2 - theta(d)),
          dx = d.target.x - d.source.x

      var out = 'x' == axis ? 
            bc[0] + (0<dx?+1:-1)*o*Math.cos(t) : 
            bc[1] + (0<dx?-1:+1)*o*Math.sin(t)

      return isNaN(out) ? 0 : out
    }
  }

  function box_center(elm) {
    var box = elm ? elm.getBBox() : {x:0,y:0,width:0,height:0} 
    return [box.x+(box.width/2),box.y+(box.height/2)]
  }

  function linkArc(d) {
    var o = 36,
        dx = d.target.x - d.source.x,
        dy = d.target.y - d.source.y,
        dr = Math.sqrt(dx * dx + dy * dy),
        os = 12,
        theta = Math.atan(dy/dx),

        ox = (0<dx?+1:-1)*os*Math.cos((Math.PI/2)-theta),
        oy = (0<dx?-1:+1)*os*Math.sin((Math.PI/2)-theta),

        sx = d.source.x + (0<dx?+1:-1)*o*Math.cos(theta) + ox,
        sy = d.source.y + (0<dx?+1:-1)*o*Math.sin(theta) + oy,

        tx = d.target.x + (0<dx?-1:+1)*o*Math.cos(theta) + ox,
        ty = d.target.y + (0<dx?-1:+1)*o*Math.sin(theta) + oy


    var out = 
          "M" + sx + "," + sy + 
          "A" + dr + "," + dr + " 0 0,1 " +tx+','+ty

    return out
  }

  function polygon(x,y,r,s) {
    var p = []
    var a = 2*Math.PI
    var t = Math.PI/6

    for (i = 0; i < s; i++) {
      p.push((x+(Math.sin((a*i/s)-t)*r)) + "," + (y-(Math.cos((a*i/s)-t)*r)))
    }

    var out = "M"+p.join(" L")+" Z"
    return out
  }


  return {
    sim: simulation,
    restart: restart,
    nodes: simulation.nodes(),
    links: links
  }
}

/*
function build_view(graph) {


  simulation
    .nodes(graph.nodes)
    .on("tick", ticked);

  simulation.force("link")
    .links(graph.links)


  function ticked() {
    //graph.links.forEach(drawLink)
    graph.nodes.forEach(drawNode)
  }
  

  function drawNode(node) {
    svg
      .select('#service_hex')
      .selectAll("path")
    //.data(force.nodes())
      .enter().append("path")
      .attr("class", "service")
      .attr("d", polygon(0,0,32,6))
    //.call(force.drag)
  }


  var force = d3.layout.force()
        .nodes(d3.values(nodes))
        .links(links)
        .size([width, height])
        .linkDistance(200)
        .charge(-500)
        .on("tick", tick)
        .start();

  var path = svg.append("g").selectAll("path")
        .data(force.links())
        .enter().append("path")
        .attr("class", function(d) { return "link " + d.type; })
        .attr("marker-end", function(d) { return "url(#" + d.type + ")"; })

  console.log(path)

  var msg = svg.append("g").selectAll("text")
        .data(force.links())
        .enter().append("text")
        .attr("class", "msg")
        .attr("x", function (d) { return (d.target.x + d.source.x)/2 })
        .attr("y", function (d) { return (d.target.y + d.source.y)/2 })
        .text(function(d) { return d.msg; })

  var service_bg = svg.append("g").selectAll("circle")
        .data(force.nodes())
        .enter().append("circle")
        .attr("class", "service_bg")
        .attr("r", 31)
        .call(force.drag)




  var text = svg.append("g").selectAll("text")
        .data(force.nodes())
        .enter().append("text")
  //.attr("x", 8)
        .attr("y", ".31em")
        .text(function(d) { return d.name; });

  var cardinals = svg.append("g").selectAll("text")
        .data(force.nodes())
        .enter().append("text")
        .attr("y", "-1em")
        .text(function(d) { return "{1}"; });

  var versions = svg.append("g").selectAll("text")
        .data(force.nodes())
        .enter().append("text")
        .attr("y", "+1.5em")
        .text(function(d) { return "1.2.3"; });



  // Use elliptical arc path segments to doubly-encode directionality.
  function tick() {
    path.attr("d", linkArc);

    msg
      .attr("x", function (d) { return (d.target.x + d.source.x)/2 })
      .attr("y", function (d) { return (d.target.y + d.source.y)/2 })

    service.attr("transform", transform);
    service_bg.attr("transform", transform);
    text.attr("transform", transform);
    cardinals.attr("transform", transform);
    versions.attr("transform", transform);
  }

  function linkArc(d) {
    var dx = d.target.x - d.source.x,
        dy = d.target.y - d.source.y,
        dr = Math.sqrt(dx * dx + dy * dy);
    return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
  }

  function transform(d) {
    return "translate(" + d.x + "," + d.y + ")";
  }





}
*/
