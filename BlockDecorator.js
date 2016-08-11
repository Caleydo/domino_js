/**
 * Created by Tobias Appl on 8/11/2016.
 */
define(["require", "exports", 'd3', '../caleydo_core/multiform'], function (require, exports, d3, multiform) {
    "use strict";
    var BlockDecorator = (function () {
        function BlockDecorator() {
            this.style = 'display:block; width: 20px; height: 20px; margin-left: 5px; float:left; font-align:center; cursor: pointer;';
        }
        BlockDecorator.prototype.decorateHeader = function (container) {
            var _this = this;
            this.$header = d3.select(container[0]).append('div')
                .attr('class', 'toolbar')
                .attr('style', 'height: 10px;');
            multiform.addIconVisChooser(this.$header.node());
            this.$header.append('i').attr('class', 'fa fa-close')
                .on('click', function () {
                _this.decoratedObject.destroy();
            })
                .attr('style', this.style)
                .text('X');
            this.$header.append('i').attr('class', 'fa fa-move')
                .on('mousedown', function () {
                var e = d3.event;
                e.preventDefault();
                _this.decoratedObject.dragging = true;
            })
                .on('mouseup', function () {
                var e = d3.event;
                e.preventDefault();
                _this.decoratedObject.dragging = false;
            })
                .attr('style', this.style + 'cursor: move;')
                .text('M');
            this.$header.append('i').attr('class', 'fa fa-zoom-in')
                .on('click', function () {
                var e = d3.event;
                e.preventDefault();
                var amount = 1;
                _this.decoratedObject.zoom.zoom(amount, amount);
            })
                .attr('style', this.style)
                .text('+');
            this.$header.append('i').attr('class', 'fa fa-zoom-out')
                .on('click', function () {
                var e = d3.event;
                e.preventDefault();
                var amount = -1;
                _this.decoratedObject.zoom.zoom(amount, amount);
            })
                .attr('style', this.style)
                .text('-');
        };
        return BlockDecorator;
    }());
    exports.BlockDecorator = BlockDecorator;
});
//# sourceMappingURL=BlockDecorator.js.map