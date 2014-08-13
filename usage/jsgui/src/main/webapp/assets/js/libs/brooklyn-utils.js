define([
    'jquery', 'underscore'
], function ($, _) {

    var Util = {};

    /**
     * @return {string} empty string if s is null or undefined, otherwise result of _.escape(s)
     */
    Util.escape = function (s) {
        if (s == undefined || s == null) return "";
        return _.escape(s);
    };

    function isWholeNumber(v) {
        return (Math.abs(Math.round(v) - v) < 0.000000000001);
    }

    Util.roundIfNumberToNumDecimalPlaces = function (v, mantissa) {
        if (!_.isNumber(v) || mantissa < 0)
            return v;

        if (isWholeNumber(v))
            return Math.round(v);

        var vk = v, xp = 1;
        for (var i=0; i < mantissa; i++) {
            vk *= 10;
            xp *= 10;
            if (isWholeNumber(vk)) {
                return Math.round(vk)/xp;
            }
        }
        return Number(v.toFixed(mantissa));
    };

    Util.toDisplayString = function(data) {
        var escaped = Util.roundIfNumberToNumDecimalPlaces(data, 4);
        if (escaped != null) {
            if (typeof escaped === 'string')
                escaped = Util.escape(escaped);
            else
                escaped = JSON.stringify(escaped);
        }
        return escaped;
    };

    if (!String.prototype.trim) {
        // some older javascripts do not support 'trim' (including jasmine spec runner) so let's define it
        String.prototype.trim = function(){
            return this.replace(/^\s+|\s+$/g, '');
        };
    }

    // from http://stackoverflow.com/questions/646628/how-to-check-if-a-string-startswith-another-string
    if (typeof String.prototype.startsWith != 'function') {
        String.prototype.startsWith = function (str){
            return this.slice(0, str.length) == str;
        };
    }
    if (typeof String.prototype.endsWith != 'function') {
        String.prototype.endsWith = function (str){
            return this.slice(-str.length) == str;
        };
    }
    
    // poor-man's copy
    Util.promptCopyToClipboard = function(text) {
        window.prompt("To copy to the clipboard, press Ctrl+C then Enter.", text);
    };

    /**
     * Returns the path component of a string URL. e.g. http://example.com/bob/bob --> /bob/bob
     */
    Util.pathOf = function(string) {
        if (!string) return "";
        var a = document.createElement("a");
        a.href = string;
        return a.pathname;
    };

    /**
     * Extracts the value of the given input. Returns true/false for for checkboxes
     * rather than "on" or "off".
     */
    Util.inputValue = function($input) {
        if ($input.attr("type") === "checkbox") {
            return $input.is(":checked");
        } else {
            return $input.val();
        }
    };

    /**
     * Updates or initialises the given model with the values of named elements under
     * the given element. Force-updates the model by setting silent: true.
     */
    Util.bindModelFromForm = function(modelOrConstructor, $el) {
        var model = _.isFunction(modelOrConstructor) ? new modelOrConstructor() : modelOrConstructor;
        var inputs = {};

        // Look up all named elements
        $("[name]", $el).each(function(idx, inp) {
            var input = $(inp);
            var name = input.attr("name");
            inputs[name] = Util.inputValue(input);
        });
        model.set(inputs, { silent: true });
        return model;
    };

    return Util;

});

