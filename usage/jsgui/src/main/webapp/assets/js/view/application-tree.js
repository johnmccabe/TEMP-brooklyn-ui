/**
 * Sub-View to render the Application tree.
 * @type {*}
 */
define([
    "underscore", "jquery", "backbone",
    "model/app-tree", "./entity-details", "model/entity-summary", "model/application",
    "text!tpl/apps/tree-item.html", "text!tpl/apps/details.html", "text!tpl/apps/entity-not-found.html"
], function (_, $, Backbone,
             AppTree, EntityDetailsView, EntitySummary, Application,
             TreeItemHtml, EntityDetailsEmptyHtml, EntityNotFoundHtml) {

    var treeViewTemplate = _.template(TreeItemHtml),
        notFoundTemplate = _.template(EntityNotFoundHtml);

    var ApplicationTreeView = Backbone.View.extend({
        tagName: "ol",
        className: "tree applications",
        template: treeViewTemplate,

        events:{
            'click .name.entity':'displayEntity'
        },

        initialize:function () {
            this.collection.on('reset', this.render, this)
            _.bindAll(this);
        },

        beforeClose:function () {
            this.collection.off("reset", this.render)
            if (this.detailsView) this.detailsView.close()
        },

        render:function () {
            var that = this
            this.$el.empty()

            // Display tree and highlight the selected entity.
            if (this.collection.isEmpty()) {
                this.$el.append("<li><i>No applications</i></li>")
            } else {
                this.collection.each(function (app) {
                    that.$el.append(that.buildTree(app))
                })
            }
            this.highlightEntity();

            // Render the details for the selected entity.
            if (this.detailsView) {
            	this.detailsView.render()
            } else {
            	// if nothing selected, select the first application
            	if (!this.collection.isEmpty()) {
            		var app0 = this.collection.first().id;
            		_.defer(function () {
            			if (!that.selectedEntityId)
            				that.displayEntityId(app0, app0)
        			});
            	} else {
            	    _.defer(function() {
            	        $("div#details").html(_.template(EntityDetailsEmptyHtml));
            	        $("div#details").find("a[href='#summary']").tab('show')
            	    })
            	}
            }
            return this
        },

        buildTree:function (application) {
            var that = this,
                $template = $(this.template({
                    id:application.get("id"),
                    type:"application",
                    parentApp:application.get("id"),
                    displayName:application.get("name")
                })),
                treeFromEntity = function (entity) {
                    var $entityTpl

                    if (entity.hasChildren()) {
                        $entityTpl = $(that.template({
                            id:entity.get("id"),
                            type:"entity",
                            parentApp:application.get("id"),
                            displayName:entity.getDisplayName()
                        }))
                        var $parentTpl = $entityTpl.find("ol.tree")
                        _.each(entity.get("children"), function (childEntity) {
                            $parentTpl.append(treeFromEntity(new AppTree.Model(childEntity)))
                        })
                    } else {
                        $entityTpl = $(that.template({
                            id:entity.get("id"),
                            type:"leaf",
                            parentApp:application.get("id"),
                            displayName:entity.getDisplayName()
                        }))
                    }
                    return $entityTpl
                }

            // start rendering from initial children of the application
            var $tree = $template.find("ol.tree")
            _.each(application.get("children"), function (entity) {
                $tree.append(treeFromEntity(new AppTree.Model(entity)))
            })
            $('a', $tree).click(function(e) { e.preventDefault(); })

            return $template
        },

        displayEntity: function(event) {
            event.preventDefault();
            var entityId = $(event.currentTarget).attr("id"),
                stateId = entityId,
                href = event.target.getAttribute('href'),
                tab = (this.detailsView)
                    ? this.detailsView.$el.find(".tab-pane.active").attr("id")
                    : undefined;
            if (tab) {
                href = href+"/"+tab
                stateId = entityId+"/"+tab
                this.preselectTab(tab)
            }
            window.history.pushState(stateId, "", href)
        	this.displayEntityId(entityId, $(event.currentTarget).data("parent-app"));
        },

        displayEntityId:function (id, appName) {
            var that = this;
            console.debug("Displaying entity: " + id);
            this.highlightEntity(id)

            var entityLoadFailed = function() {
                return that.displayEntityNotFound(id);
            };

            if (appName === undefined) {
                appName = $("span.entity_tree_node#"+id).data("parent-app")
            }
            if (appName === undefined) {
                // no such app
                console.error("Couldn't find a parent application for entity: " + id);
                return entityLoadFailed();
            }

            var app = new Application.Model(),
                entitySummary = new EntitySummary.Model;

            app.url = "/v1/applications/" + appName
            entitySummary.url = "/v1/applications/" + appName + "/entities/" + id;

            $.when(app.fetch(), entitySummary.fetch())
                .done(function() {
                    that.showDetails(app, entitySummary);
                })
                .fail(entityLoadFailed);
        },

        displayEntityNotFound: function(id) {
            $("div#details").html(notFoundTemplate({"id": id}));
        },

        /**
         * Causes the tab with the given name to be selected automatically when
         * the view is next rendered.
         */
        preselectTab: function(tab) {
            this.currentTab = tab
        },

        showDetails: function(app, entitySummary) {
            var whichTab = this.currentTab
            if (whichTab === undefined) {
                whichTab = "summary";
                if (this.detailsView) {
                    whichTab = this.detailsView.$el.find(".tab-pane.active").attr("id");
                    this.detailsView.close()
                }
            }
            if (this.detailsView)
                this.detailsView.close()
            this.detailsView = new EntityDetailsView({
                model:entitySummary,
                application:app
            })
            $("div#details").html(this.detailsView.render().el)
            // preserve the tab selected before
            $("div#details").find('a[href="#'+whichTab+'"]').tab('show');
        },

        highlightEntity:function (id) {
        	if (id) this.selectedEntityId = id
        	else id = this.selectedEntityId
        	$("span.entity_tree_node").removeClass("active")
        	if (id) {
        		$("span.entity_tree_node#"+id).addClass("active")
        	}
        }
    })

    return ApplicationTreeView
})
