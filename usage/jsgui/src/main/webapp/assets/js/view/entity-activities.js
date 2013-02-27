/**
 * Displays the list of activities/tasks the entity performed.
 */
define([
    "underscore", "backbone", "text!tpl/apps/activities.html", "text!tpl/apps/activity-row.html",
    "text!tpl/apps/activity-details.html", "bootstrap", "formatJson"
], function (_, Backbone, ActivitiesHtml, ActivityRowHtml, ActivityDetailsHtml) {

    var ActivitiesView = Backbone.View.extend({
        template:_.template(ActivitiesHtml),
        taskRow:_.template(ActivityRowHtml),
        events:{
            "click #activities-table tr":"rowClick"
        },
        initialize:function () {
            var that = this;
            that.$el.html(that.template({}));
            that.collection.url = that.model.getLinkByName("activities");
            that.collection.fetch();
            that.collection.on("reset", that.render, that);
            that.callPeriodically("entity-activities", function () {
                that.collection.fetch();
            }, 5000);
        },
        beforeClose:function () {
            this.collection.off("reset", this.render);
        },
        render:function () {
            var that = this,
                $tbody = $("#activities-table tbody").empty();
            if (this.collection.length==0) {
                $(".has-no-activities").show();
                $("#activity-details-none-selected").hide();
            } else {
                $(".has-no-activities").hide();
                this.collection.each(function (task) {
                    $tbody.append(that.taskRow({
                        cid:task.get("id"),
                        displayName:task.get("displayName"),
                        submitTimeUtc:task.get("submitTimeUtc"),
                        startTimeUtc:task.get("startTimeUtc"),
                        endTimeUtc:task.get("endTimeUtc"),
                        currentStatus:task.get("currentStatus"),
                        entityDisplayName:task.get("entityDisplayName")
                    }));
                if (that.activeTask) {
                    $("#activities-table tr[id='"+that.activeTask+"']").addClass("selected");
                    that.showFullActivity(that.activeTask);
                } else {
                    $("#activity-details-none-selected").show();
                }
            });
            }
            return this;
        },
        rowClick:function(evt) {
            var row = $(evt.currentTarget).closest("tr");
            var id = row.attr("id");
            $("#activities-table tr").removeClass("selected");
            if (this.activeTask == id) {
                // deselected
                this.showFullActivity(null);
            } else {
                row.addClass("selected");
                this.activeTask = id;
                this.showFullActivity(id);
            }
        },
        showFullActivity:function (id) {
            $("#activity-details-none-selected").hide(100);
            var task = this.collection.get(id);
            if (task==null) {
                this.activeTask = null;
                $("#activity-details").hide(100);
                $("#activity-details-none-selected").show(100);
                return;
            }
            var $ta = this.$("#activity-details textarea");
            if ($ta.length) {
                $ta.val(FormatJSON(task.toJSON()));
            } else {
                var html = _.template(ActivityDetailsHtml, {
                    displayName:this.model.get("displayName"),
                    description:FormatJSON(task.toJSON())
                });
                $("#activity-details").html(html);
            }
            $("#activity-details").show(100);
        }
    });

    ActivitiesView.Details = Backbone.View.extend({
        tagName:"div",
        className:"modal hide",
        template:_.template(ActivityDetailsHtml),
        render:function () {
            this.$el.html(this.template({
                displayName:this.model.get("displayName"),
                description:FormatJSON(this.model.toJSON())
            }));
            return this;
        }
    });
    return ActivitiesView;
});