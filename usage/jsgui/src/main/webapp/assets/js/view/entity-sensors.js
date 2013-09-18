/**
 * Render entity sensors tab.
 *
 * @type {*}
 */
define([
    "underscore", "jquery", "backbone", "brooklyn-utils",
    "view/viewutils", "model/sensor-summary",
    "text!tpl/apps/sensors.html", "text!tpl/apps/sensor-name.html",
    "jquery-datatables", "datatables-extensions"
], function (_, $, Backbone, Util, ViewUtils, SensorSummary, SensorsHtml, SensorNameHtml) {

    var sensorHtml = _.template(SensorsHtml),
        sensorNameHtml = _.template(SensorNameHtml);

    var EntitySensorsView = Backbone.View.extend({
        template: sensorHtml,
        sensorMetadata:{},
        refreshActive:true,

        events:{
            'click .refresh': 'updateSensorsNow',
            'click .filterEmpty':'toggleFilterEmpty',
            'click .toggleAutoRefresh':'toggleAutoRefresh'
        },

        initialize:function () {
            this.$el.html(this.template());
            _.bindAll(this);

            var $table = this.$('#sensors-table'),
                that = this;
            this.table = ViewUtils.myDataTable($table, {
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                    $(nRow).attr('id', aData[0])
                    $('td',nRow).each(function(i,v){
                        if (i==1) $(v).attr('class','sensor-value');
                    })
                    return nRow;
                },
                "aoColumnDefs": [
                                 { // name (with tooltip)
                                     "mRender": function ( data, type, row ) {
                                         // name (column 1) should have tooltip title
                                         var actions = that.getSensorActions(data.name);
                                         // if data.description or .type is absent we get an error in html rendering (js)
                                         // unless we set it explicitly (there is probably a nicer way to do this however?)
                                         var context = _.extend(data, {href: actions.json, 
                                             description: data['description'], type: data['type']});
                                         return sensorNameHtml(context);
                                     },
                                     "aTargets": [ 1 ]
                                 },
                                 { // value
                                     "mRender": function ( data, type, row ) {
                                         var escaped = Util.escape(Util.roundIfNumberToNumDecimalPlaces(data, 4)),
                                             sensorName = row[0],
                                             openHint = that.getSensorActions(sensorName).open;
                                         if (openHint) {
                                             escaped = "<a href='"+openHint+"'>" + escaped + "</a>";
                                         }
                                         return escaped;
                                     },
                                     "aTargets": [ 2 ]
                                 },
                                 // ID in column 0 is standard (assumed in ViewUtils)
                                 { "bVisible": false,  "aTargets": [ 0 ] }
                             ]            
            });
            ViewUtils.addFilterEmptyButton(this.table);
            ViewUtils.addAutoRefreshButton(this.table);
            ViewUtils.addRefreshButton(this.table);
            this.loadSensorMetadata()
            this.updateSensorsPeriodically()
            this.toggleFilterEmpty();
            return this;
        },

        render: function() {
            return this;
        },

        /**
         * Returns the actions loaded to view.sensorMetadata[name].actions
         * for the given name, or an empty object.
         */
        getSensorActions: function(sensorName) {
            var allMetadata = this.sensorMetadata || {};
            var metadata = allMetadata[sensorName] || {};
            return metadata.actions || {}
        },

        toggleFilterEmpty: function() {
            ViewUtils.toggleFilterEmpty(this.$('#sensors-table'), 2);
            return this;
        },

        toggleAutoRefresh: function() {
            ViewUtils.toggleAutoRefresh(this);
            return this;
        },

        enableAutoRefresh: function(isEnabled) {
            this.refreshActive = isEnabled
            return this;
        },
        
        /**
         * Loads current values for all sensors on an entity and updates sensors table.
         */
        updateSensorsNow:function () {
            var that = this
            ViewUtils.get(that, that.model.getSensorUpdateUrl(), function(data) { that.updateWithData(that, data) },
                    { enablement: function() { return that.refreshActive } });
        },
        updateSensorsPeriodically:function () {
            var that = this
            ViewUtils.getRepeatedlyWithDelay(that, that.model.getSensorUpdateUrl(), function(data) { that.updateWithData(that, data) },
                    { enablement: function() { return that.refreshActive } });
        },
        updateWithData: function (that, data) {
            $table = that.$('#sensors-table');
            ViewUtils.updateMyDataTable($table, data, function(value, name) {
                var metadata = that.sensorMetadata[name]
                if (metadata==null) {                        
                    // TODO should reload metadata when this happens (new sensor for which no metadata known)
                    // (currently if we have dynamic sensors, their metadata won't appear
                    // until the page is refreshed; don't think that's a big problem -- mainly tooltips
                    // for now, we just return the partial value
                    return [name, {'name':name}, value]
                } 
                return [name, metadata, value];
            });
        },

        /**
         * Loads all information about an entity's sensors. Populates view.sensorMetadata object
         * with a map of sensor names to description, actions and type (e.g. java.lang.Long).
         */
        loadSensorMetadata: function() {
            var url = this.model.getLinkByName('sensors'),
                that = this;
            $.get(url, function (data) {
                _.each(data, function(sensor) {
                    var actions = {};
                    _.each(sensor.links, function(v, k) {
                        if (k.slice(0, 7) == "action:") {
                            actions[k.slice(7)] = v;
                        }
                    });
                    that.sensorMetadata[sensor.name] = {
                        name: sensor.name,
                        description: sensor.description,
                        actions: actions,
                        type: sensor.type
                    }
                });
                that.updateSensorsNow();
                that.table.find('*[rel="tooltip"]').tooltip();
            });
            return this;
        }
    });

    return EntitySensorsView;
});
