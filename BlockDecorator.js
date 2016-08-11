/**
 * Created by Tobias Appl on 8/11/2016.
 */
define(["require", "exports", 'd3', '../caleydo_core/multiform'], function (require, exports, d3, multiform) {
    "use strict";
    var BlockDecorator = (function () {
        function BlockDecorator() {
        }
        BlockDecorator.prototype.decorateHeader = function () {
            var _this = this;
            this.$header = d3.select(this.decoratedObject.$node[0]).append('div').attr('class', 'toolbar');
            multiform.addIconVisChooser(this.$header.node());
            this.$header.append('i').attr('class', 'fa fa-close')
                .on('click', function () {
                _this.decoratedObject.destroy();
            })
                .attr('style', 'cursor: pointer;')
                .text("X");
            this.$header.append('i').attr('class', 'fa fa-move')
                .on('mousedown', function (event) {
                event.preventDefault();
                _this.decoratedObject.switchStickToMousePosition();
            })
                .on('mouseup', function (event) {
                event.preventDefault();
                _this.decoratedObject.switchStickToMousePosition();
            })
                .attr('style', 'margin-left: 5px; cursor: move;')
                .text("M");
        };
        return BlockDecorator;
    }());
    exports.BlockDecorator = BlockDecorator;
});
//# sourceMappingURL=BlockDecorator.js.map