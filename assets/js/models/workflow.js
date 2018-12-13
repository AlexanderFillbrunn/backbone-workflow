// create namespace for our app
var app = app || {};

// An element of the workflow that can be moved and connected with others
app.Node = Backbone.RelationalModel.extend({
  idAttribute: "id",
  defaults: {
    name: 'Node',
    x: 0,
    y: 0
  }
});

app.NodeCollection = Backbone.Collection.extend({
  model: app.Node,
  modelId: function(m) { return m.id; }
});

// A collection of collected nodes is a workflow
app.Workflow = Backbone.RelationalModel.extend({
  idAttribute: "id",
  defaults: {
    id: "workflow",
    name: 'Workflow'
  },
  relations: [
    {
			type: Backbone.HasMany,
			key: 'nodes',
			relatedModel: app.Node,
			includeInJSON: Backbone.Model.prototype.idAttribute,
			collectionType: app.NodeCollection,
			reverseRelation: {
				key: 'workflow',
        type: Backbone.HasOne
			}
		}
  ]
});

// A connection between nodes
app.Connection = Backbone.RelationalModel.extend({
  idAttribute: "id",
  defaults: {
    label: '',
    inputPort: 0,
    outputPort: 0,
    anchors: []
  },
  relations: [
    {
			type: Backbone.HasOne,
			key: 'output',
			relatedModel: app.Node,
			includeInJSON: Backbone.Model.prototype.idAttribute,
			reverseRelation: {
				key: 'inputs',
        type: Backbone.HasMany,
        collectionType: app.ConnectionCollection
			}
		},
    {
			type: Backbone.HasOne,
			key: 'input',
			relatedModel: app.Node,
			includeInJSON: Backbone.Model.prototype.idAttribute,
			reverseRelation: {
				key: 'outputs',
        type: Backbone.HasMany,
        collectionType: app.ConnectionCollection
			}
		}
  ]
});

app.ConnectionCollection = Backbone.Collection.extend({
  model: app.Connection,
  modelId: function(m) { return m.id; },
  initialize: function() {
    this.fetch();
  },
  fetch: function() {

  }
});
