define([
    'underscore'
], function (_) {

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
        String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
    }

    if (typeof String.prototype.endsWith !== 'function') {
        String.prototype.endsWith = function(suffix) {
            return this.indexOf(suffix, this.length - suffix.length) !== -1;
        };
    }
    
    // poor-man's copy
    Util.promptCopyToClipboard = function(text) {
        window.prompt("To copy to the clipboard, press Ctrl+C then Enter.", text);
    };

    return Util;

});

