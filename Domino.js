/**
 * Created by Tobias Appl on 7/29/2016.
 */
define(["require", "exports"], function (require, exports) {
    "use strict";
    var Domino = (function () {
        function Domino(parent) {
        }
        return Domino;
    }());
    function create(parent) {
        return new Domino(parent);
    }
    exports.create = create;
});
//# sourceMappingURL=Domino.js.map