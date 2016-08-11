/* Created by Tobias Appl on 7/29/2016. */
define(["require", "exports", 'd3', '../caleydo_core/wrapper', '../caleydo_core/idtype', '../caleydo_d3/link', './Block'], function (require, exports, d3, wrapper, idtypes, links, blocks) {
    "use strict";
    var Board = (function () {
        function Board(node) {
            var _this = this;
            var that = this;
            this.content = node;
            this.links = new links.LinkContainer(node, ['change', 'transform', 'change.pos', 'change.range', 'zoom'], {
                filter: function (a, b) {
                    console.log("check block occlusion");
                    var retval = { val: true };
                    _this.blocks.manager.forEach(function (block) {
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
                }
            });
            this.blocks = {
                currentlyDragged: null,
                manager: new idtypes.ObjectManager('block', 'Block')
            };
            this.blocks.manager.on('select', function (event, type) {
                that.blocks.manager.forEach(function (block) {
                    block.$container.removeClass('caleydo-select-' + type);
                });
                that.blocks.manager.selectedObjects(type).forEach(function (block) {
                    block.$container.addClass('caleydo-select-' + type);
                });
            });
            this.blocks.manager.on('add', function (event, id, block) {
                that.links.push(block);
            });
            this.blocks.manager.on('remove', function (event, id, block) {
                that.links.remove(block);
            });
            this.$node = d3.select(this.links.node);
            //clear on click on background
            this.$node.classed('selection-clearer', true).on('click', function () {
                that.blocks.manager.clear();
                idtypes.clearSelection();
            });
            //dnd operation
            this.$node.on({
                'drop': function () {
                    _this.drop();
                },
                'dragenter': function () {
                    _this.dragEnter();
                },
                'dragover': function () {
                    _this.dragOver();
                },
                'dragleave': function () {
                    _this.dragLeave();
                },
                'mousemove': function () {
                    _this.mouseMove();
                },
                'mouseup': function () {
                    _this.mouseUp();
                }
            });
        }
        Object.defineProperty(Board.prototype, "currentlyDragged", {
            get: function () {
                return this.blocks.currentlyDragged;
            },
            set: function (block) {
                this.blocks.currentlyDragged = block;
            },
            enumerable: true,
            configurable: true
        });
        Board.prototype.mouseUp = function () {
            if (null !== this.blocks.currentlyDragged) {
                this.blocks.currentlyDragged.dragging = false;
            }
        };
        Board.prototype.mouseMove = function () {
            if (null !== this.blocks.currentlyDragged) {
                var e = d3.event;
                var coords = [e.offsetX, e.offsetY];
                var blockOffset = this.blocks.currentlyDragged.dragOffset;
                if (false !== blockOffset) {
                    coords[0] -= blockOffset[0];
                    coords[1] -= blockOffset[1];
                }
                this.blocks.currentlyDragged.pos = coords;
            }
        };
        Board.prototype.dragEnter = function () {
            console.log('dragEnter');
            var e = d3.event;
            if (wrapper.C.hasDnDType(e, 'application/caleydo-data-item') || wrapper.C.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
                return false;
            }
        };
        Board.prototype.dragOver = function () {
            console.log('dragOver');
            var e = d3.event;
            this.links.update();
            if (wrapper.C.hasDnDType(e, 'application/caleydo-data-item') || wrapper.C.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
                e.preventDefault();
                return false;
            }
        };
        Board.prototype.dragLeave = function () {
            console.log('dragLeave');
        };
        Board.prototype.drop = function () {
            var _this = this;
            console.log('drop');
            var e = d3.event;
            e.preventDefault();
            //data move
            if (wrapper.C.hasDnDType(e, 'application/caleydo-data-item')) {
                var id = JSON.parse(e.dataTransfer.getData('application/caleydo-data-item'));
                var that = this;
                wrapper.data.get(id).then(function (d) {
                    //CLUE CMD
                    blocks.createBlockAt(d, that.content, that, [e.offsetX, e.offsetY], _this.blocks.manager);
                });
                this.currentlyDragged = null;
                return false;
            }
        };
        Board.prototype.digestKeyCode = function (e) {
            var _this = this;
            e.preventDefault(); // prevent the default action (scroll / move caret)
            var dxy = [0, 0];
            var amount = e.ctrlKey ? 15 : 5;
            switch (e.which) {
                case 37:
                    dxy[0] -= amount;
                    break;
                case 38:
                    dxy[1] -= amount;
                    break;
                case 39:
                    dxy[0] = amount;
                    break;
                case 40:
                    dxy[1] = amount;
                    break;
                default:
                    return; // exit this handler for other keys
            }
            var selected_blocks = this.blocks.manager.selections();
            selected_blocks.dim(0).asList().forEach(function (id) {
                _this.blocks.manager.byId(id).moveBy(dxy[0], dxy[1]);
            });
        };
        return Board;
    }());
    exports.Board = Board;
});
//# sourceMappingURL=Board.js.map