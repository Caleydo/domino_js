/* Created by Tobias Appl on 7/29/2016. */
define(["require", "exports", 'd3', '../caleydo_core/wrapper', '../caleydo_core/idtype', '../caleydo_d3/link', './Block'], function (require, exports, d3, wrapper, idtypes, links, blocks) {
    "use strict";
    var Board = (function () {
        function Board(node) {
            this.areBlocksInLineOfSight = function (a, b) {
                console.log("check block occlusion");
                var manager = blocks.manager;
                var retval = { val: true };
                manager.forEach(function (block) {
                    var a = this[0];
                    var b = this[1];
                    var retval = this[2];
                    if (!retval.val) {
                        return;
                    }
                    if (block.id !== a.id && block.id !== b.id) {
                        var leftelempos = b.$node[0].offsetLeft;
                        var rightelempos = a.$node[0].offsetLeft;
                        if (a.$node[0].offsetLeft < b.$node[0].offsetLeft) {
                            leftelempos = a.$node[0].offsetLeft;
                            rightelempos = b.$node[0].offsetLeft;
                        }
                        if (leftelempos < block.$node[0].offsetLeft && block.$node[0].offsetLeft < rightelempos) {
                            retval.val = false;
                        }
                    }
                }, [a, b, retval]);
                return retval.val;
            };
            var that = this;
            this.content = node;
            this.links = new links.LinkContainer(node, ['change', 'transform', 'change.pos', 'change.range', 'zoom'], { filter: this.areBlocksInLineOfSight });
            blocks.manager.on('add', function (event, id, block) {
                that.links.push(block);
            });
            blocks.manager.on('remove', function (event, id, block) {
                that.links.remove(block);
            });
            this.linearblocks = [];
            this.$node = d3.select(this.links.node);
            //clear on click on background
            this.$node.classed('selection-clearer', true).on('click', function () {
                blocks.manager.clear();
                idtypes.clearSelection();
            });
            //dnd operation
            this.$node.on('dragenter', function () {
                console.log('enter');
                var e = d3.event;
                if (placeholders.hasDnDType(e, 'application/caleydo-data-item') || placeholders.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
                    that.addPlaceholders();
                    return false;
                }
            }).on('dragover', function () {
                var e = d3.event;
                if (placeholders.hasDnDType(e, 'application/caleydo-data-item') || placeholders.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
                    //e.preventDefault();
                    placeholders.updateDropEffect(e);
                    return false;
                }
            }).on('dragleave', function () {
                if (that.overPlaceholder) {
                    return;
                }
                that.removePlaceholders();
            }).on('drop', function () {
                console.log('drop');
                var e = d3.event;
                e.preventDefault();
                //internal move
                if (placeholders.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
                    var info = JSON.parse(e.dataTransfer.getData('application/caleydo-domino-dndinfo'));
                    var block = blocks.byId(+info.block);
                    if (placeholders.copyDnD(e)) {
                        //CLUE CMD
                        block = new Block(block.data, that.content, that);
                    }
                    //CLUE CMD
                    block.pos = [e.offsetX - info.offsetX, e.offsetY - info.offsetY]; //[e.layerX, e.layerY];
                    block.$node.css('opacity', '1');
                    that.removePlaceholders();
                    that.currentlyDragged = null;
                    return false;
                }
                //data move
                if (placeholders.hasDnDType(e, 'application/caleydo-data-item')) {
                    var id = JSON.parse(e.dataTransfer.getData('application/caleydo-data-item'));
                    wrapper.data.get(id).then(function (d) {
                        //CLUE CMD
                        blocks.createBlockAt(d, that.content, that, [e.offsetX, e.offsetY]);
                    });
                    that.removePlaceholders();
                    that.currentlyDragged = null;
                    return false;
                }
            });
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
        Board.prototype.addPlaceholders = function () {
            if (placeholders.anyShown(this.links.node)) {
                return;
            }
            console.log('create placeholders');
            //var p = placeholders.create(this.content, [100, 100], this);
        };
        Board.prototype.removePlaceholders = function () {
            console.log('remove placeholders');
            placeholders.removeAll(this.content);
            this.overPlaceholder = false;
        };
        Board.prototype.persistPreview = function (preview, e) {
            var p = preview.pos;
            if (!placeholders.copyDnD(e) && placeholders.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
                preview.destroy();
                var info = JSON.parse(e.dataTransfer.getData('application/caleydo-domino-dndinfo'));
                preview = blocks.byId(+info.block);
            }
            //TODO
            console.log("persistPreview");
            preview.pos = [p[0] - 60, p[1]];
            this.removePlaceholders();
        };
        ;
        Board.prototype.removePreview = function (preview) {
            preview.destroy();
        };
        ;
        return Board;
    }());
    exports.Board = Board;
});
//# sourceMappingURL=Board.js.map