var workflow = new app.Workflow({});
// Create nodes
var nodes = d3.range(200).map(function(id) {
  var inputs = d3.range(parseInt(Math.random() * 6));
  var outputs = d3.range(parseInt(Math.random() * 6));

  return new app.Node({id: `n${id}`, name: `Node ${id}`,
                        x: 100 + 200 * (id % 6),
                        y: 100 + 200 * parseInt(id / 6),
                        bgr: randomColor({luminosity: 'light', hue : 'green'}),
                        inPorts: inputs.map(function(id) {
                          return {color : randomColor({hue : 'monochrome'})};
                        }),
                        outPorts: outputs.map(function() {
                          return {color : randomColor({hue : 'monochrome'})};
                        })});
});

nodes.forEach(function(node) {
  workflow.get("nodes").add(node);
});

var appWorkflow = new app.WorkflowView({collection : workflow.get("nodes")});
