/**
 * Created by Tobias Appl on 7/29/2016.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", '../caleydo_core/layout_view', '../caleydo_core/data', 'jquery', './Board', './Blockbrowser'], function (require, exports, views, data, $, boards, blockBrowser) {
    "use strict";
    var Domino = (function (_super) {
        __extends(Domino, _super);
        function Domino() {
            var _this = this;
            _super.call(this);
            this.board = new boards.Board(document.getElementById('board'));
            //this.info = selectionInfo.create(document.getElementById('selectioninfo'));
            this.browser = new blockBrowser.Blockbrowser(document.getElementById('blockbrowser'));
            $(document).keydown(function (e) { _this.board.digestKeyCode(e); });
        }
        Domino.prototype.execute = function () {
            var _this = this;
            data.list().then(function (items) {
                var listItems = blockBrowser.convertToBlockbrowserItems(items);
                _this.browser.addItems(listItems);
                _this.browser.render();
            });
        };
        return Domino;
    }(views.AView));
    function create() {
        return new Domino();
    }
    exports.create = create;
});
//# sourceMappingURL=Domino.js.map