/* Created by Tobias Appl on 7/29/2016. */
define(["require", "exports", 'd3', '../caleydo_core/wrapper', '../caleydo_core/idtype', '../caleydo_d3/link', './Block'], function (require, exports, d3, wrapper, idtypes, links, blocks) {
    "use strict";
    var Board = (function () {
        function Board(node) {
            var _this = this;
            var that = this;
            this.content = node;
            this.links = new links.LinkContainer(node, ['change', 'transform', 'change.pos', 'change.range', 'zoom'], { filter: blocks.areBlocksInLineOfSight });
            blocks.manager.on('add', function (event, id, block) {
                that.links.push(block);
            });
            blocks.manager.on('remove', function (event, id, block) {
                that.links.remove(block);
            });
            this.$node = d3.select(this.links.node);
            //clear on click on background
            this.$node.classed('selection-clearer', true).on('click', function () {
                blocks.manager.clear();
                idtypes.clearSelection();
            });
            //dnd operation
            this.$node
                .on('dragenter', function () { _this.dragEnter(); })
                .on('dragover', function () { _this.dragOver(); })
                .on('dragleave', function () { _this.dragLeave(); })
                .on('drop', function () { _this.drop(); });
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
        Board.prototype.createPreview = function (data, pos) {
            if (this.preview) {
                this.removePreview();
            }
            this.preview = new blocks.Block(data, this.content, this);
            this.preview.pos = [pos[0] + 60, pos[1]];
        };
        Board.prototype.removePreview = function () {
            this.preview.destroy();
        };
        ;
        Board.prototype.dragEnter = function () {
        };
        Board.prototype.dragOver = function () {
        };
        Board.prototype.dragLeave = function () {
        };
        Board.prototype.drop = function () {
            console.log('drop');
            var e = d3.event;
            e.preventDefault();
            //internal move
            if (wrapper.C.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
                var info = JSON.parse(e.dataTransfer.getData('application/caleydo-domino-dndinfo'));
                var block = blocks.byId(+info.block);
                if (wrapper.C.copyDnD(e)) {
                    //CLUE CMD
                    block = new blocks.Block(block.data, this.content, this);
                }
                //CLUE CMD
                block.pos = [e.offsetX - info.offsetX, e.offsetY - info.offsetY]; //[e.layerX, e.layerY];
                block.$node.css('opacity', '1');
                this.currentlyDragged = null;
                return false;
            }
            //data move
            if (wrapper.C.hasDnDType(e, 'application/caleydo-data-item')) {
                var id = JSON.parse(e.dataTransfer.getData('application/caleydo-data-item'));
                wrapper.data.get(id).then(function (d) {
                    //CLUE CMD
                    blocks.createBlockAt(d, this.content, this, [e.offsetX, e.offsetY]);
                });
                this.currentlyDragged = null;
                return false;
            }
        };
        return Board;
    }());
    exports.Board = Board;
});
//# sourceMappingURL=Board.js.map