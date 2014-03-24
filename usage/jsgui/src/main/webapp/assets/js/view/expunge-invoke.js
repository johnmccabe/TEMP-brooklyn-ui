/**
 * Render entity expungement as a modal
 */
define([
    "underscore", "jquery", "backbone",
    "text!tpl/apps/expunge-modal.html"
], function(_, $, Backbone, ExpungeModalHtml) {
    return Backbone.View.extend({
        template: _.template(ExpungeModalHtml),
        events: {
            "click .invoke-expunge": "invokeExpunge",
            "hidden": "hide"
        },
        render: function() {
            this.$el.html(this.template(this.model));
            return this;
        },
        invokeExpunge: function() {
            var self = this;
            var release = this.$("#release").is(":checked");
            var url = this.model.links.expunge + "?release=" + release + "&timeout=0:";
            $.ajax({
                type: "POST",
                url: url,
                contentType: "application/json",
                success: function() {
                    self.trigger("entity.expunged")
                },
                error: function(data) {
                    self.$el.fadeTo(100,1).delay(200).fadeTo(200,0.2).delay(200).fadeTo(200,1);
                    // TODO render the error better than poor-man's flashing
                    // (would just be connection error -- with timeout=0 we get a task even for invalid input)

                    log("ERROR invoking effector");
                    log(data)
                }
            });
            this.$el.fadeTo(500, 0.5);
            this.$el.modal("hide");
        },
        hide: function() {
            this.undelegateEvents();
        }
    });
});