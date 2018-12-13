var app = app || {};

app.WorkflowView = Backbone.View.extend({
  el: '#workflow',
  initialize: function() {
    _.bindAll(this, _.functions(this));

    // Rerender when collection of nodes changes
    this.collection.on("change reset add remove", this.render, this);

    // Set up zooming
    var zoom = d3.zoom()
        .scaleExtent([0.3, 5])
        .on("zoom", this.zoomed);
    var wf = d3.select(this.el)
    this.nodeContainer = wf.select("#nodes");
    wf.call(zoom);

    // Set up drag and drop for nodes
    this.nodedrag = d3.drag()
    .on("start", this.nodedragstarted)
    .on("drag", this.nodedragged)
    .on("end", this.nodedragended);

    // Set up drag and drop for connections
    this.connectiondrag = d3.drag()
    .on("start", this.connectiondragstarted)
    .on("drag", this.connectiondragged)
    .on("end", this.connectiondragended);

    // Allow a node to be selected by a single click
    wf.on("click", function() {
      d3.selectAll(".selected").classed("selected", false);
    })

    // Create a line generator for connections
    this.linegenerator = d3.line().curve(d3.curveBasis);

    // Initial rendering
    this.render();
  },
  // When user zooms, update transform
  zoomed: function() {
      this.nodeContainer.attr("transform",
      `translate(${d3.event.transform.x},${d3.event.transform.y})scale(${d3.event.transform.k})`);
  },
  // When user pushes the left mouse button on a node, a drag operation is started
  nodedragstarted: function(d) {
    d3.event.sourceEvent.stopPropagation();
    var el = d3.select(d3.event.sourceEvent.target);
    // Move up the DOM to the node element
    while(!el.classed("node")) {
      el = d3.select(el.node().parentNode);
    }
    // Unselect all nodes and then select the current
    d3.selectAll(".selected").classed("selected", false);
    el.classed("selected", true);
    // Remember the dragged element
    this.dragging = el;
  },
  // Update node position during dragging
  nodedragged: function(d) {
    d.set({x: d.get("x") + d3.event.dx, y: d.get("y") + d3.event.dy});
    this.dragging.attr("transform", `translate(${d.get("x")},${d.get("y")})`);
    this.updateConnections([d]);
  },
  // Drag ended, forget dragged element
  nodedragended: function(d) {
    this.dragging = null;
  },

  // When a user pushes the left mouse button on an outgoing port,
  // a connection is created
  connectiondragstarted: function(d, i) {
    d3.event.sourceEvent.stopPropagation();
    var target = d3.select(d3.event.sourceEvent.target);
    var node = d3.select(target.node().parentNode);

    // Init a line representing the new connection
    var removed = this.newConnection.remove();
    node.insert(function() {
      return removed.node();
    }, ":first-child");

    this.newConnection.attr("visibility", "visible");
    this.newConnection.attr("x1", target.attr("cx"));
    this.newConnection.attr("y1", target.attr("cy"));
    this.newConnection.attr("x2", target.attr("cx"));
    this.newConnection.attr("y2", target.attr("cy"));

    // Remember connection start info until user drops it
    this.connectionInfo = {
      port: i,
      node: node.datum()
    }
  },

  // Update the connection line when the user moves the mouse
  connectiondragged: function(d) {
    var offsetX = this.newConnection.attr("x1") - d3.event.x;
    var offsetY = this.newConnection.attr("y1") - d3.event.y;
    this.newConnection.attr("x2", d3.event.x + Math.sign(offsetX) * 2)
                      .attr("y2", d3.event.y + Math.sign(offsetY) * 2);
  },

  // Create a new connection when the user drops it on an input port
  connectiondragended: function(d) {
    // Hide the connection line
    this.newConnection.attr("visibility", "hidden");
    var target = d3.select(d3.event.sourceEvent.target);
    if (target.classed("input") && !target.classed("connected") && this.connectionInfo) {
      target.classed("connected", true);
      this.nodeContainer
        .select(`#op${this.connectionInfo.node.get("id")}_${this.connectionInfo.port}`)
        .classed("connected", true);
      var index = parseInt(target.attr("data-index"));
      var destId = d3.select(target.node().parentNode).datum().get("id");
      var sourceId = this.connectionInfo.node.get("id");
      // Initialize new connection
      new app.Connection({id : "c" + Math.round(Math.random() * 10000),
              inputPort: index, outputPort: this.connectionInfo.port,
              input: sourceId, output: destId});
      this.render();
    }

    this.connectionInfo = null;
  },

  // Calculates the path of a connection
  connectionPath: function(c) {
    var source = c.get("input");
    var dest = c.get("output");

    var numSourcePorts = source.get("outPorts").length;
    var numDestPorts = dest.get("inPorts").length;
    var s1 = 90 / (numSourcePorts + 1);
    var s2 = 90 / (numDestPorts + 1);

    var p1 = [source.get("x") + 70, source.get("y") + (s1 * (c.get("outputPort") + 1)) - 10];
    var p2 = [p1[0] + 20, p1[1]];
    var p3 = [dest.get("x") - 20, dest.get("y") + (s2 * (c.get("inputPort") + 1)) - 10];
    var p4 = [p3[0] + 20, p3[1]];
    var linedata = [p1, p2].concat(c.get("anchors")).concat([p3, p4]);
    return this.linegenerator(linedata);
  },

  updateConnections: function(nodes) {
    var connections = nodes.reduce(function(memo, val) {
      return memo.concat(val.get("inputs").models).concat(val.get("outputs").models);
    }, []);
    connections = _.uniq(connections, false, function(i) {
      return i.id;
    });
    if (connections.length > 0) {
      var ids = _.map(connections, c => `#con${c.id}`).join(",");
      d3.selectAll(ids).attr("d", this.connectionPath);
    }
  },

  removeConnection: function(c) {
    var outputId = `#ip${c.get("output").get("id")}_${c.get("inputPort")}`;
    var inputId = `#op${c.get("input").get("id")}_${c.get("outputPort")}`;

    this.nodeContainer.selectAll(`${outputId},${inputId}`)
                      .classed("connected", false);
    Backbone.Relational.store.unregister(c);
    this.render();
  },

  render: function() {
    var that = this;

    // New node connection element
    this.newConnection = this.nodeContainer
      .append("line")
      .attr("id", "newConnection")
      .attr("visibility", "hidden");

    // Collect connections
    var cons = this.collection.reduce(function(memo, val) {
      return memo.concat(val.get("inputs").models);
    }, []);

    // Update connections
    var connections = this.nodeContainer.selectAll("path.connection")
    .data(cons, function(c) { return c.id; });

    connections.exit().remove();

    connections.enter()
    .insert("path", ":first-child")
    .attr("id", function(c) { return `con${c.id}`; })
    .attr("class", "connection")
    .attr("fill", "none")
    .attr("d", this.connectionPath)
    .on("click", this.removeConnection);

    // Draw nodes
    var nodes = this.nodeContainer
      .selectAll("g.node")
      .data(this.collection.models, m => m.get("id"));

      nodes.exit().remove();

    var nodeG = nodes.enter()
      .append("g")
      .attr("transform", d => `translate(${d.get("x")},${d.get("y")})`)
      .attr("class", "node")
      .call(this.nodedrag)
      .on("click", function(d) {
          d3.event.stopPropagation();
          d3.selectAll(".selected").classed("selected", false);
          d3.select(this).classed("selected", true);
      });

      nodeG.append("rect")
      .attr("class", "bgr")
      .attr("x", 0)
      .attr("y", 0)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", n => n.get("bgr") || "#ddd");

      nodeG.append("text")
      .attr("class", "title")
      .attr("text-anchor", "middle")
      .text(n => n.get("name"))
      .attr("x", 35)
      .attr("y", -10);

      nodeG.append("rect")
      .attr("class", "selectMarker")
      .attr("x", -10)
      .attr("y", -26)
      .attr("width", 90)
      .attr("height", 104)
      .attr("stroke-dasharray", "3,3");

      nodeG.each(function(d) {
        var numInPorts = d.get("inPorts").length;
        var numOutPorts = d.get("outPorts").length;
        var dim = d3.select(this).select(".bgr").node().getBBox();
        var stepIn = 90 / (numInPorts + 1);
        var stepOut = 90 / (numOutPorts + 1);

        d3.select(this).selectAll(".input.port")
          .data(d.get("inPorts")).enter()
          .append("circle")
          .attr("class", "input port")
          .attr("id", (p,i) => `ip${d.get("id")}_${i}`)
          .attr("r", 7)
          .attr("cx", 0)
          .attr("cy", (p, i) => (i + 1) * stepIn - 10)
          .attr("fill", p => p.color)
          .attr("data-index", (p,i) => i);

        d3.select(this).selectAll(".output.port")
          .data(d.get("outPorts")).enter()
          .append("circle")
          .attr("id", (p,i) => `op${d.get("id")}_${i}`)
          .attr("class", "output port")
          .attr("r", 7)
          .attr("cx", dim.width)
          .attr("cy", (p,i) => (i + 1) * stepOut - 10)
          .attr("fill", p => p.color)
          .call(that.connectiondrag);
      });
  }
});
