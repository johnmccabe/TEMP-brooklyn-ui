define([
    "backbone"
], function (Backbone) {

    var Param = {}

    Param.Model = Backbone.Model.extend({
        defaults:function () {
            return {
                name:"",
                type:"",
                description:""
            }
        }
    })

    Param.Collection = Backbone.Collection.extend({
        model:Param.Model
    })

    return Param
})