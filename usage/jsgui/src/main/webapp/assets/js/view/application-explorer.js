/**
 * This should render the main content in the Application Explorer page.
 * Components on this page should be rendered as sub-views.
 * @type {*}
 */
define([
    "underscore", "jquery", "backbone", 
    "./modal-wizard", "model/app-tree", "./application-tree", 
    "text!tpl/apps/page.html"
], function (_, $, Backbone, ModalWizard, AppTree, ApplicationTreeView, PageHtml) {

    var ApplicationExplorerView = Backbone.View.extend({
        tagName:"div",
        className:"container container-fluid",
        id:'application-explorer',
        template:_.template(PageHtml),
        events:{
            'click .refresh':'refreshApplications',
            'click #add-new-application':'createApplication',
            'click .delete':'deleteApplication'
        },
        initialize:function () {
            this.$el.html(this.template({}))
            $(".nav1").removeClass("active");
            $(".nav1_apps").addClass("active");

            this.collection.on('reset', this.render, this)
            this.treeView = new ApplicationTreeView({
                collection:this.collection
            })
            this.$('div#tree-list').html(this.treeView.render().el)
            this.treeView.render()
        },
        beforeClose:function () {
            this.collection.off("reset", this.render)
            this.treeView.close()
        },
        render:function () {
            return this
        },
        
        refreshApplications:function () {
            this.collection.fetch()
            return false
        },
        show: function(trail) {
            this.treeView.displayEntityId(trail)
        },
        
        createApplication:function () {
        	var that = this;
            if (this._modal) {
                this._modal.close()
            }
            var wizard = new ModalWizard({
            	appRouter:that.options.appRouter,
            	callback:function() { that.refreshApplications() }
        	})
            this._modal = wizard
            this.$("#modal-container").html(wizard.render().el)
            this.$("#modal-container .modal")
                .on("hidden",function () {
                    wizard.close()
                }).modal('show')
        },
        deleteApplication:function (event) {
            // call Backbone destroy() which does HTTP DELETE on the model
            this.collection.getByCid(event.currentTarget['id']).destroy({wait:true})
        }
        
    })

    return ApplicationExplorerView
})