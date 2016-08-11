/**
 * Created by Tobias Appl on 7/29/2016.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", 'jquery', 'd3', '../caleydo_core/wrapper', '../caleydo_core/multiform', '../caleydo_core/behavior', './BlockDecorator'], function (require, exports, $, d3, wrapper, multiform, behaviors, blockDecorator) {
    "use strict";
    var events = wrapper.events, ranges = wrapper.ranges;
    /**
     * Creates a block at position (x,y)
     * @param data
     * @param parent
     * @param board
     * @param pos
     * @returns {Block}
     */
    function createBlockAt(data, parent, board, pos, manager) {
        var block = createBlock(data, parent, board, manager);
        block.pos = pos;
        return block;
    }
    exports.createBlockAt = createBlockAt;
    /**
     * Creates a block without positioning, uses the standard block decorator
     * @param data
     * @param parent
     * @param board
     * @param pos
     * @returns {Block}
     */
    function createBlock(data, parent, board, manager) {
        var block = new Block(data, parent, board, new blockDecorator.BlockDecorator(), manager);
        return block;
    }
    exports.createBlock = createBlock;
    var Block = (function (_super) {
        __extends(Block, _super);
        function Block(data, parent, board, decorator, manager) {
            var _this = this;
            _super.call(this);
            this.decorator = decorator;
            this.manager = manager;
            this.actSorting = [];
            this.rotationAngle = 0;
            this.dragData = {
                startOffset: [0, 0],
                currentlyDragged: false
            };
            events.EventHandler.call(this);
            this.decorator.decoratedObject = this;
            this._data = data;
            this.parent = parent;
            this.board = board;
            this.$container = $('<div>').appendTo(parent).addClass('blockContainer');
            this.decorator.decorateHeader(this.$container);
            this.$node = $('<div>').appendTo(this.$container).addClass('block');
            d3.select(this.$node[0]).datum(data); //magic variable within d3
            //CLUE CMD
            this.zoom = new behaviors.ZoomBehavior(this.$node[0], null, null);
            this.propagate(this.zoom, 'zoom');
            this.$content = $('<div>').appendTo(this.$node);
            var that = this;
            this.rangeUnsorted = undefined;
            if (data.desc.type === 'vector') {
                data.groups().then(function (groups) {
                    that.range = ranges.list(groups);
                });
            }
            else {
                this.range = ranges.all();
            }
            this.$container.on({
                mouseenter: function () {
                    manager.select(wrapper.idtypes.hoverSelectionType, [that.id], wrapper.idtypes.SelectOperation.ADD);
                },
                mouseleave: function () {
                    manager.select(wrapper.idtypes.hoverSelectionType, [that.id], wrapper.idtypes.SelectOperation.REMOVE);
                },
                click: function (event) {
                    console.log('select', that.id);
                    manager.select([that.id], wrapper.idtypes.toSelectOperation(event));
                    return false;
                },
                mousemove: function (event) {
                    _this.mouseMove(event);
                },
                mouseup: function () {
                    _this.mouseUp();
                }
            });
            this.actSorting = [];
            this.$content.addClass('mode-block');
            this.id = this.manager.nextId(this);
        }
        Block.prototype.mouseUp = function () {
            if (this.dragData.currentlyDragged) {
                this.dragging = false;
            }
        };
        Block.prototype.mouseMove = function (event) {
            if (this.dragData.currentlyDragged) {
                var pos = this.pos;
                pos[0] += (event.offsetX - this.dragData.startOffset[0]);
                pos[1] += (event.offsetY - this.dragData.startOffset[1]);
                this.pos = pos;
            }
        };
        Object.defineProperty(Block.prototype, "dragging", {
            set: function (isDragging) {
                if (isDragging) {
                    var e = d3.event;
                    this.dragData.startOffset = [e.offsetX, e.offsetY];
                    this.board.currentlyDragged = this;
                }
                else {
                    this.board.currentlyDragged = null;
                }
                this.dragData.currentlyDragged = isDragging;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Block.prototype, "dragOffset", {
            get: function () {
                if (this.dragData.currentlyDragged) {
                    return this.dragData.startOffset;
                }
                return false;
            },
            enumerable: true,
            configurable: true
        });
        Block.prototype.rotateBy = function (degree) {
        };
        Block.prototype.destroy = function () {
            if (this.vis) {
                this.vis.destroy();
            }
            this.$container.remove();
            this.manager.remove(this);
        };
        ;
        Object.defineProperty(Block.prototype, "data", {
            get: function () {
                return this._data;
            },
            enumerable: true,
            configurable: true
        });
        Block.prototype.setRangeImpl = function (value) {
            var bak = this._range;
            this._range = value || ranges.all();
            var initialVis = guessInitial(this._data.desc);
            if (this.vis) {
                initialVis = this.vis.actDesc;
                this.vis.destroy();
                this.$content.empty();
            }
            /*this.vis = multiform.createGrid(this.data, this.range_, this.$content[0], function (data, range) {
              return data.view(range);
            }, {
              initialVis : initialVis
            });*/
            this.vis = multiform.create(this._data.view(this._range), this.$content[0], {
                initialVis: initialVis
            });
            this.visMeta = this.vis.asMetaData;
            this.zoom.v = this.vis;
            this.zoom.meta = this.visMeta;
            this.fire('change.range', value, bak);
        };
        Object.defineProperty(Block.prototype, "range", {
            get: function () {
                return this._range;
            },
            set: function (value) {
                this._range = value || ranges.all();
                this.rangeUnsorted = value;
                this.setRangeImpl(value);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Block.prototype, "ndim", {
            get: function () {
                return this._range.ndim;
            },
            enumerable: true,
            configurable: true
        });
        Block.prototype.dim = function () {
            return this._range.dim;
        };
        Block.prototype.ids = function () {
            return this._data.ids(this.range);
        };
        Object.defineProperty(Block.prototype, "location", {
            get: function () {
                var p = this.pos;
                var s = this.size;
                return wrapper.geom.rect(p[0], p[1], s[0], s[1]);
            },
            enumerable: true,
            configurable: true
        });
        Block.prototype.locate = function () {
            var vis = this.vis, that = this;
            if (!vis || !wrapper.C.isFunction(vis.locate)) {
                return Promise.resolve((arguments.length === 1 ? undefined : new Array(arguments.length)));
            }
            return vis.locate.apply(vis, wrapper.C.argList(arguments)).then(function (r) {
                var p = that.pos;
                if (Array.isArray(r)) {
                    return r.map(function (loc) {
                        return loc ? wrapper.geom.wrap(loc).shift(p) : loc;
                    });
                }
                return r ? wrapper.geom.wrap(r).shift(p) : r;
            });
        };
        Block.prototype.locateById = function () {
            var vis = this.vis, that = this;
            if (!vis || !wrapper.C.isFunction(vis.locateById)) {
                return Promise.resolve((arguments.length === 1 ? undefined : new Array(arguments.length)));
            }
            return vis.locateById.apply(vis, wrapper.C.argList(arguments)).then(function (r) {
                var p = that.pos;
                if (Array.isArray(r)) {
                    return r.map(function (loc) {
                        return loc ? wrapper.geom.wrap(loc).shift(p) : loc;
                    });
                }
                return r ? wrapper.geom.wrap(r).shift(p) : r;
            });
        };
        ;
        Block.prototype.sort = function (dim, cmp) {
            if (dim > this.ndim) {
                return Promise.resolve(null);
            }
            var r = this.range.dims.slice(); //work on copy
            var active = r[dim];
            var that = this;
            //special 'next' sorting mode
            if (cmp === 'next') {
                var old = this.actSorting[dim];
                if (old === 'asc') {
                    cmp = 'desc';
                }
                else if (old === 'desc') {
                    cmp = 'none';
                }
                else {
                    cmp = 'asc';
                }
            }
            if (cmp === 'none') {
                this.actSorting[dim] = undefined;
                r[dim] = this.rangeUnsorted.dim(dim);
                console.log(active.toString(), ' -> ', r[dim].toString());
                this.setRangeImpl(ranges.list(r));
                return Promise.resolve(this.range);
            }
            this.actSorting[dim] = cmp;
            cmp = toCompareFunc(this._data.desc, cmp);
            //get data and sort the range and update the range
            //TODO just the needed data
            return this._data._data().then(function (data_) {
                r[dim] = active.sort(function (a, b) { return cmp(a, b, data_); });
                console.log(active.toString(), ' -> ', r[dim].toString());
                that.setRangeImpl(ranges.list(r));
                return that.range;
            });
        };
        Object.defineProperty(Block.prototype, "idtypes", {
            get: function () {
                return this._data.idtypes;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Block.prototype, "pos", {
            get: function () {
                var p = this.$container.position();
                return [p.left, p.top];
            },
            set: function (value) {
                var bak = this.$node.position();
                this.$container.css('left', value[0] + 'px');
                this.$container.css('top', value[1] + 'px');
                this.fire('change.pos', value, [bak.left, bak.top]);
            },
            enumerable: true,
            configurable: true
        });
        Block.prototype.moveBy = function (xdelta, ydelta) {
            var p = this.pos;
            this.pos = [p[0] + xdelta, p[1] + ydelta];
        };
        Block.prototype.move = function (xfactor, yfactor) {
            function toDelta(factor) {
                return factor * 20;
            }
            return this.moveBy(toDelta(xfactor), toDelta(yfactor));
        };
        Object.defineProperty(Block.prototype, "size", {
            get: function () {
                return [this.$node.width(), this.$node.height()];
            },
            set: function (val) {
                this.$node.css('width', val[0]);
                this.$node.css('width', val[1]);
            },
            enumerable: true,
            configurable: true
        });
        return Block;
    }(events.EventHandler));
    exports.Block = Block;
    function guessInitial(desc) {
        if (desc.type === 'matrix') {
            return 'caleydo-vis-heatmap';
        }
        if (desc.type === 'vector' && desc.value.type === 'categorical') {
            return 'caleydo-vis-mosaic';
        }
        if (desc.type === 'vector' && desc.value.type.match('real|int')) {
            return 'caleydo-vis-axis';
        }
        return -1;
    }
    function toCompareFunc(desc, cmp) {
        cmp = (cmp === 'asc') ? d3.ascending : (cmp === 'desc' ? d3.descending : cmp);
        switch (desc.value.type) {
            case 'categorical':
                var cats = desc.value.categories;
                return function (a, b, data) {
                    var ac = data[a];
                    var bc = data[b];
                    var ai = cats.indexOf(ac);
                    var bi = cats.indexOf(bc);
                    return cmp(ai, bi);
                };
            default:
                return function (a, b, data) {
                    var ac = data[a];
                    var bc = data[b];
                    return cmp(ac, bc);
                };
        }
    }
    function shiftSorting(factor) {
        return function (s) {
            s.sorting += s.sorting < 0 ? -1 * factor : +1 * factor;
        };
    }
});
//# sourceMappingURL=Block.js.map