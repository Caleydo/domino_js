/* Created by Tobias Appl on 7/29/2016. */
define(["require", "exports"], function (require, exports) {
    "use strict";
    var Board = (function () {
        function Board() {
        }
        Object.defineProperty(Board.prototype, "currentlyDragged", {
            get: function () {
                return this._currentlyDragged;
            },
            set: function (block) {
                this._currentlyDragged = block;
            },
            enumerable: true,
            configurable: true
        });
        return Board;
    }());
    exports.Board = Board;
});
//# sourceMappingURL=Board.js.map