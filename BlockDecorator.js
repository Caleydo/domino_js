/**
 * Created by Tobias Appl on 8/11/2016.
 */
define(["require", "exports", 'd3', '../caleydo_core/multiform'], function (require, exports, d3, multiform) {
    "use strict";
    var BlockDecorator = (function () {
        function BlockDecorator() {
        }
        BlockDecorator.prototype.decorateHeader = function (container) {
            var _this = this;
            this.$header = d3.select(container[0]).append('div')
                .attr('class', 'toolbar');
            multiform.addIconVisChooser(this.$header.node());
            this.$header.append('i').attr('class', 'fa fa-close')
                .on('click', function () {
                _this.decoratedObject.destroy();
            });
            this.$header.append('i').attr('class', 'fa fa-arrows')
                .on('mousedown', function () {
                var e = d3.event;
                e.preventDefault();
                _this.decoratedObject.dragging = true;
            })
                .on('mouseup', function () {
                var e = d3.event;
                e.preventDefault();
                _this.decoratedObject.dragging = false;
            });
            this.$header.append('i').attr('class', 'fa fa-plus-square')
                .on('click', function () {
                var e = d3.event;
                e.preventDefault();
                var amount = 1;
                _this.decoratedObject.zoom.zoom(amount, amount);
            });
            this.$header.append('i').attr('class', 'fa fa-minus-square')
                .on('click', function () {
                var e = d3.event;
                e.preventDefault();
                var amount = -1;
                _this.decoratedObject.zoom.zoom(amount, amount);
            });
        };
        return BlockDecorator;
    }());
    exports.BlockDecorator = BlockDecorator;
});
//# sourceMappingURL=BlockDecorator.js.map