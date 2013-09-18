/**
 * Displays details on an activity/task
 */
define([
    "underscore", "jquery", "backbone", "brooklyn-utils", "view/viewutils", "formatJson", "moment",
    "model/task-summary",
    "text!tpl/apps/activity-details.html", "text!tpl/apps/activity-table.html", 

    "bootstrap", "jquery-datatables", "datatables-extensions"
], function (_, $, Backbone, Util, ViewUtils, FormatJSON, moment,
    TaskSummary,
    ActivityDetailsHtml, ActivityTableHtml) {

    var activityTableTemplate = _.template(ActivityTableHtml),
        activityDetailsTemplate = _.template(ActivityDetailsHtml);

    function makeActivityTable($el) {
        $el.html(_.template(ActivityTableHtml));
        var $subTable = $('.activity-table', $el);
        $subTable.attr('width', 569-6-6 /* subtract padding */)

        return ViewUtils.myDataTable($subTable, {
            "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                $(nRow).attr('id', aData[0])
                $(nRow).addClass('activity-row')
            },
            "aoColumnDefs": [ {
                    "mRender": function ( data, type, row ) { return Util.escape(data) },
                    "aTargets": [ 1, 2, 3 ]
                 }, {
                    "bVisible": false,
                    "aTargets": [ 0 ]
                 } ],
            "aaSorting":[]  // default not sorted (server-side order)
        });
    }

    var ActivityDetailsView = Backbone.View.extend({
        template: activityDetailsTemplate,
        taskLink: '',
        task: null,
        /* children of this task; see HasTaskChildren for difference between this and sub(mitted)Tasks */
        childrenTable: null,
        /* tasks in the current execution context (this.collections) whose submittedByTask
         * is the task we are drilled down on. this defaults to the passed in collection, 
         * which will be the last-viewed entity's exec-context; when children cross exec-context
         * boundaries we have to rewire to point to the current entity's exec-context / tasks */
        subtasksTable: null,
        children: null,
        breadcrumbs: [],
        events:{
            "click #activities-children-table .activity-table tr":"childrenRowClick",
            "click #activities-submitted-table .activity-table tr":"submittedRowClick",
            'click .showDrillDownSubmittedByAnchor':'showDrillDownSubmittedByAnchor',
            'click .showDrillDownBlockerOfAnchor':'showDrillDownBlockerOfAnchor',
            'click .backDrillDown':'backDrillDown'
        },
        // requires taskLink or task; breadcrumbs is optional
        initialize:function () {
            var that = this
            this.taskLink = this.options.taskLink
            if (this.options.task) {
                this.task = this.options.task
                if (!this.taskLink) this.taskLink = this.task.get('links').self
            }
            if (this.options.breadcrumbs) this.breadcrumbs = this.options.breadcrumbs

            this.$el.html(this.template({ taskLink: this.taskLink, task: this.task, breadcrumbs: this.breadcrumbs }))
            this.$el.addClass('activity-detail-panel')

            this.childrenTable = makeActivityTable(this.$('#activities-children-table'));
            this.subtasksTable = makeActivityTable(this.$('#activities-submitted-table'));

            ViewUtils.attachToggler(this.$el)
        
            if (this.task) {
                this.renderTask()
                this.setUpPolling()
            } else {                
                this.$el.css('cursor', 'wait')
                $.get(this.taskLink, function(data) {
                    that.task = new TaskSummary.Model(data)
                    that.renderTask()
                    that.setUpPolling();
                })
            }

            // initial subtasks may be available from parent, so try to render those
            // (reliable polling for subtasks, and for children, is set up in setUpPolling ) 
            this.renderSubtasks()
        },
        
        refreshNow: function(initial) {
            var that = this
            $.get(this.taskLink, function(data) {
                that.task = new TaskSummary.Model(data)
                that.renderTask()
                if (initial) that.setUpPolling();
            })
        },
        renderTask: function() {
            // update task fields
            var that = this
            
            this.updateFields('displayName', 'entityDisplayName', 'id', 'description', 'currentStatus', 'blockingDetails');
            this.updateFieldWith('blockingTask',
                function(v) { 
                    return "<a class='showDrillDownBlockerOfAnchor handy' link='"+_.escape(v.link)+"'>"+
                        that.displayTextForLinkedTask(v)+"</a>" })
            this.updateFieldWith('tags', function(tags) {
                var tagBody = "";
                for (var tag in tags)
                    tagBody += "<div class='activity-tag-giftlabel'>"+_.escape(tags[tag])+"</div>";
                return tagBody;
            })
            
            var submitTimeUtc = this.updateFieldWith('submitTimeUtc',
                function(v) { return v <= 0 ? "-" : moment(v).format('D MMM YYYY H:mm:ss.SSS')+" &nbsp; <i>"+moment(v).fromNow()+"</i>" })
            var startTimeUtc = this.updateFieldWith('startTimeUtc',
                function(v) { return v <= 0 ? "-" : moment(v).format('D MMM YYYY H:mm:ss.SSS')+" &nbsp; <i>"+moment(v).fromNow()+"</i>" })
            this.updateFieldWith('endTimeUtc',
                function(v) { return v <= 0 ? "-" : moment(v).format('D MMM YYYY H:mm:ss.SSS')+" &nbsp; <i>"+moment(v).from(startTimeUtc, true)+" later</i>" })

            ViewUtils.updateTextareaWithData($(".task-json .for-textarea", this.$el), 
                FormatJSON(this.task.toJSON()), false, false, 150, 400)

            ViewUtils.updateTextareaWithData($(".task-detail .for-textarea", this.$el), 
                this.task.get('detailedStatus'), false, false, 30, 100)

            this.updateFieldWith('streams',
                function(v) {
                    var result = "";
                    for (var si in v) {
                        var sv = v[si];
                        result += "<div class='activity-stream-div'>"+
                                  "<span class='activity-label'>"+
                                    _.escape(si)+
                                  "</span><span>"+
                                      "<a href='"+sv.link+"'</a>download</a>"+
                                      (sv.metadata["sizeText"] ? " ("+_.escape(sv.metadata["sizeText"])+")" : "")+
                                  "</span></div>";
                    }
                    return result; 
                })

            this.updateFieldWith('submittedByTask',
                function(v) { return "<a class='showDrillDownSubmittedByAnchor handy' link='"+_.escape(v.link)+"'>"+
                    that.displayTextForLinkedTask(v)+"</a>" })

            if (this.task.get("children").length==0)
                $('.toggler-region.tasks-children', this.$el).hide();
        },
        setUpPolling: function() {
                var that = this
                
                // on first load, clear any funny cursor
                this.$el.css('cursor', 'auto')
                
                this.task.url = this.taskLink;
                this.task.on("all", this.renderTask, this)
                ViewUtils.fetchRepeatedlyWithDelay(this, this.task, { doitnow: true });
                
                // and set up to load children (now that the task is guaranteed to be loaded)
                this.children = new TaskSummary.Collection()
                this.children.url = this.task.get("links").children
                this.children.on("reset", this.renderChildren, this)
                ViewUtils.fetchRepeatedlyWithDelay(this, this.children, { 
                    fetchOptions: { reset: true }, doitnow: true, fadeTarget: $('.tasks-children') });
                
                $.get(this.task.get("links").entity, function(entity) {
                    if (that.collection==null || entity.links.activities != that.collection.url) {
                        // need to rewire collection to point to the right ExecutionContext
                        that.collection = new TaskSummary.Collection()
                        that.collection.url = entity.links.activities
                        that.collection.on("reset", this.renderSubtasks, this)
                        ViewUtils.fetchRepeatedlyWithDelay(that, that.collection, { 
                            fetchOptions: { reset: true }, doitnow: true, fadeTarget: $('.tasks-submitted') });
                    }
                });
        },
        
        renderChildren: function() {
            var that = this
            var children = this.children
            ViewUtils.updateMyDataTable(this.childrenTable, children, function(task, index) {
                return [ task.get("id"),
                         (task.get("entityId") && task.get("entityId")!=that.task.get("entityId") ? task.get("entityDisplayName") + ": " : "") + 
                         task.get("displayName"),
                         task.get("submitTimeUtc") <= 0 ? "-" : moment(task.get("submitTimeUtc")).calendar(),
                         task.get("currentStatus")
                    ]; 
                });
            if (children && children.length>0) {
                $('.toggler-region.tasks-children', this.$el).show();
            } else {
                $('.toggler-region.tasks-children', this.$el).hide();
            }
        },
        renderSubtasks: function() {
            var that = this
            if (!this.collection) {
                $('.toggler-region.tasks-submitted', this.$el).hide();
                return;
            }
            if (this.task==null) {
                log("task not yet available")
                return;
            } 
            
            // find tasks submitted by this one which aren't included as children
            // this uses collections -- which is everything in the current execution context
            var subtasks = []
            for (var taskI in this.collection.models) {
                var task = this.collection.models[taskI]
                var submittedBy = task.get("submittedByTask")
                if (submittedBy!=null && submittedBy.metadata!=null && submittedBy.metadata["id"] == this.task.id &&
                        this.children.get(task.id)==null) {
                    subtasks.push(task)
                }
            }
            ViewUtils.updateMyDataTable(this.subtasksTable, subtasks, function(task, index) {
                return [ task.get("id"),
                         (task.get("entityId") && task.get("entityId")!=that.task.get("entityId") ? task.get("entityDisplayName") + ": " : "") + 
                         task.get("displayName"),
                         task.get("submitTimeUtc") <= 0 ? "-" : moment(task.get("submitTimeUtc")).calendar(),
                         task.get("currentStatus")
                    ]; 
                });
            if (subtasks && subtasks.length>0) {
                $('.toggler-region.tasks-submitted', this.$el).show();
            } else {
                $('.toggler-region.tasks-submitted', this.$el).hide();
            }
        },
        
        displayTextForLinkedTask: function(v) {
            return v.metadata.taskName ? 
                    (v.metadata.entityDisplayName ? _.escape(v.metadata.entityDisplayName)+" <b>"+_.escape(v.metadata.taskName)+"</b>" : 
                        _.escape(v.metadata.taskName)) :
                    v.metadata.taskId ? _.escape(v.metadata.taskId) : 
                    _.escape(v.link)
        },
        updateField: function(field) {
            return this.updateFieldWith(field, _.escape)
        },
        updateFields: function() {
            _.map(arguments, this.updateField, this);
        },
        updateFieldWith: function(field, f) {
            var v = this.task.get(field)
            if (v !== undefined && v != null && 
                    (typeof v !== "object" || _.size(v) > 0)) {
                $('.updateField-'+field, this.$el).html( f(v) );
                $('.ifField-'+field, this.$el).show();
            } else {
                // blank if there is no value
                $('.updateField-'+field, this.$el).empty();
                $('.ifField-'+field, this.$el).hide();
            }
            return v
        },
        childrenRowClick:function(evt) {
            var that = this;
            var row = $(evt.currentTarget).closest("tr");
            var table = $(evt.currentTarget).closest(".activity-table");
            var id = row.attr("id");
            this.showDrillDownTask("subtask of", this.children.get(id).get("links").self, this.children.get(id))
        },
        submittedRowClick:function(evt) {
            var that = this;
            var row = $(evt.currentTarget).closest("tr");
            var table = $(evt.currentTarget).closest(".activity-table");
            var id = row.attr("id");
            // submitted tasks are guaranteed to be in the collection, so this is safe
            this.showDrillDownTask("subtask of", this.collection.get(id).get('links').self)
        },
        
        showDrillDownSubmittedByAnchor: function(from) {
            var link = $(from.target).closest('a').attr("link")
            this.showDrillDownTask("submitter of", link)
        },
        showDrillDownBlockerOfAnchor: function(from) {
            var link = $(from.target).closest('a').attr("link")
            this.showDrillDownTask("blocker of", link)
        },
        showDrillDownTask: function(relation, newTaskLink, newTask) {
            log("activities deeper drill down - "+newTaskLink)
            var $t = this.$el.closest('.slide-panel'),
                $t2 = $t.after('<div>').next()
            $t2.addClass('slide-panel')
            
            var newBreadcrumbs = [ relation + ' ' +
                this.task.get('entityDisplayName') + ' ' +
                this.task.get('displayName') ].concat(this.breadcrumbs)
            var activityDetailsPanel = new ActivityDetailsView({
                taskLink: newTaskLink,
                task: newTask,
                collection: this.collection,
                breadcrumbs: newBreadcrumbs
            })

            // load drill-down page
            $t2.html(activityDetailsPanel.render().el)

            $t.animate({
                    left: -600
                }, 300, function() { 
                    $t.hide() 
                });

            $t2.show().css({
                    left: 600
                    , top: 0
                }).animate({
                    left: 0
                }, 300);
        },
        backDrillDown: function(event) {
            log("activities drill back from "+this.taskLink)
            var that = this
            var $t2 = this.$el.closest('.slide-panel')
            var $t = $t2.prev()
            
            $t2.animate({
                    left: 569 //prevTable.width()
                }, 300, function() {
                    that.$el.empty()
                    $t2.remove()
                    that.remove()
                });

            $t.show().css({
                    left: -600 //-($t2.width())
                }).animate({
                    left: 0
                }, 300);
        }
    });

    return ActivityDetailsView;
});
