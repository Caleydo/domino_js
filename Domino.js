/**
 * Created by Tobias Appl on 7/29/2016.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", '../caleydo_core/layout_view', '../caleydo_core/data', 'jquery', '../caleydo_d3/selectioninfo', './Board', './Block'], function (require, exports, views, data, $, selectionInfo, boards, blocks) {
    "use strict";
    var Domino = (function (_super) {
        __extends(Domino, _super);
        function Domino(parent) {
            var _this = this;
            _super.call(this);
            $(document).keydown(function (e) { _this.digestKeyCode(e); });
            this.board = new boards.Board(document.getElementById('board'));
            this.info = selectionInfo.create(document.getElementById('selectionInfo'));
            var dataVectors = data.list().then(data.convertTableToVectors);
        }
        Domino.prototype.digestKeyCode = function (e) {
            function moveSelectedBlock(x, y) {
                var selected_blocks = blocks.manager.selections();
                selected_blocks.forEach(function (block, index) {
                    block.moveBy(x, y);
                });
            }
            ;
            switch (e.which) {
                case 37:
                    moveSelectedBlock(-5, 0);
                    break;
                case 38:
                    moveSelectedBlock(0, -5);
                    break;
                case 39:
                    moveSelectedBlock(5, 0);
                    break;
                case 40:
                    moveSelectedBlock(0, 5);
                    break;
                default:
                    return; // exit this handler for other keys
            }
            e.preventDefault(); // prevent the default action (scroll / move caret)
        };
        return Domino;
    }(views.AView));
    function create(parent) {
        return new Domino(parent);
    }
    exports.create = create;
});
//# sourceMappingURL=Domino.js.map