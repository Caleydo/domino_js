/**
 * Created by Tobias Appl on 7/29/2016.
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", 'jquery', 'd3', '../caleydo_core/wrapper', '../caleydo_core/multiform', '../caleydo_core/behavior'], function (require, exports, $, d3, wrapper, multiform, behaviors) {
    "use strict";
    var idtypes = wrapper.idtypes, C = wrapper.C, events = wrapper.events, ranges = wrapper.ranges, geom = wrapper.geom;
    exports.manager = new idtypes.ObjectManager('block', 'Block');
    var mode = 'block'; //block, select, band
    //CLUE CMD
    function switchMode(m) {
        if (m === mode) {
            return false;
        }
        var bak = mode;
        mode = m;
        events.fire('change.mode', m, bak);
        exports.manager.forEach(function (block) {
            block.switchMode(m);
        });
        return true;
    }
    exports.switchMode = switchMode;
    ;
    function getMode() {
        return mode;
    }
    exports.getMode = getMode;
    ;
    exports.manager.on('select', function (event, type) {
        exports.manager.forEach(function (block) {
            block.$node.removeClass('caleydo-select-' + type);
        });
        exports.manager.selectedObjects(type).forEach(function (block) {
            block.$node.addClass('caleydo-select-' + type);
        });
    });
    function byId(id) {
        return exports.manager.byId(id);
    }
    exports.byId = byId;
    ;
    function areBlocksInLineOfSight(a, b) {
        console.log("check block occlusion");
        var retval = { val: true };
        exports.manager.forEach(function (block) {
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
    exports.areBlocksInLineOfSight = areBlocksInLineOfSight;
    ;
    /**
     * Creates a block at position (x,y) and adds it to the manager
     * @param data
     * @param parent
     * @param board
     * @param pos
     * @returns {Block}
     */
    function createBlockAt(data, parent, board, pos) {
        var block = new Block(data, parent, board);
        block.pos = pos;
        block.id = exports.manager.nextId(block);
        return block;
    }
    exports.createBlockAt = createBlockAt;
    var Block = (function (_super) {
        __extends(Block, _super);
        function Block(data, parent, board) {
            _super.call(this);
            this.actSorting = [];
            events.EventHandler.call(this);
            this._data = data;
            this.parent = parent;
            this.board = board;
            this.$node = $('<div>').appendTo(parent).addClass('block');
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
            this.$node.on({
                mouseenter: function () {
                    exports.manager.select(idtypes.hoverSelectionType, [that.id], idtypes.SelectOperation.ADD);
                },
                mouseleave: function () {
                    exports.manager.select(idtypes.hoverSelectionType, [that.id], idtypes.SelectOperation.REMOVE);
                },
                click: function (event) {
                    if (mode !== 'select') {
                        console.log('select', that.id);
                        exports.manager.select([that.id], idtypes.toSelectOperation(event));
                    }
                    return false;
                }
            });
            this.$node.attr('draggable', true)
                .on('dragstart', function (event) {
                return that.onDragStart(event);
            })
                .on('drag', function (event) {
                //console.log('dragging');
            });
            this.actSorting = [];
            this.switchMode(mode);
            //this.id = manager.nextId(this);
        }
        Block.prototype.destroy = function () {
            if (this.vis) {
                this.vis.destroy();
            }
            this.$node.remove();
            exports.manager.remove(this);
        };
        ;
        Object.defineProperty(Block.prototype, "data", {
            get: function () {
                return this._data;
            },
            enumerable: true,
            configurable: true
        });
        Block.prototype.onDragStart = function (event) {
            var e = event.originalEvent;
            e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
            var data = this._data;
            e.dataTransfer.setData('text/plain', data.desc.name);
            e.dataTransfer.setData('application/json', JSON.stringify(data.desc));
            e.dataTransfer.setData('application/caleydo-domino-dndinfo', JSON.stringify({
                block: this.id,
                offsetX: e.offsetX,
                offsetY: e.offsetY,
                layerX: e.layerX,
                layerY: e.layerY
            }));
            //encode the id in the mime type
            var p = JSON.stringify(data.persist());
            e.dataTransfer.setData('application/caleydo-data-item', p);
            e.dataTransfer.setData('application/caleydo-data-item-' + p, p);
            this.board.currentlyDragged = data;
            //backup the current position
            this.startpos = this.pos;
            this.$node.css('opacity', '0.5');
            this.$node.css('filter', 'alpha(opacity=50)');
        };
        Block.prototype.switchMode = function (m) {
            switch (m) {
                case 'block':
                    this.$content.addClass('mode-block');
                    this.$node.attr('draggable', true);
                    break;
                case 'select':
                    this.$content.removeClass('mode-block');
                    this.$node.attr('draggable', null);
                    break;
            }
        };
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
                return geom.rect(p[0], p[1], s[0], s[1]);
            },
            enumerable: true,
            configurable: true
        });
        Block.prototype.locate = function () {
            var vis = this.vis, that = this;
            if (!vis || !C.isFunction(vis.locate)) {
                return Promise.resolve((arguments.length === 1 ? undefined : new Array(arguments.length)));
            }
            return vis.locate.apply(vis, C.argList(arguments)).then(function (r) {
                var p = that.pos;
                if (Array.isArray(r)) {
                    return r.map(function (loc) {
                        return loc ? geom.wrap(loc).shift(p) : loc;
                    });
                }
                return r ? geom.wrap(r).shift(p) : r;
            });
        };
        Block.prototype.locateById = function () {
            var vis = this.vis, that = this;
            if (!vis || !C.isFunction(vis.locateById)) {
                return Promise.resolve((arguments.length === 1 ? undefined : new Array(arguments.length)));
            }
            return vis.locateById.apply(vis, C.argList(arguments)).then(function (r) {
                var p = that.pos;
                if (Array.isArray(r)) {
                    return r.map(function (loc) {
                        return loc ? geom.wrap(loc).shift(p) : loc;
                    });
                }
                return r ? geom.wrap(r).shift(p) : r;
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
                var p = this.$node.position();
                return [p.left, p.top];
            },
            set: function (value) {
                var bak = this.pos;
                this.$node.css('left', value[0] + 'px');
                this.$node.css('top', value[1] + 'px');
                this.fire('change.pos', value, bak);
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
    var LinearBlockBlock = (function () {
        function LinearBlockBlock(block, idtype) {
            this._block = block;
            this._sorting = NaN;
            this.dim = this._block.idtypes.indexOf(idtype);
        }
        Object.defineProperty(LinearBlockBlock.prototype, "block", {
            get: function () {
                return this.block;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(LinearBlockBlock.prototype, "sorting", {
            get: function () {
                return this._sorting;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(LinearBlockBlock.prototype, "isSorted", {
            get: function () {
                return !isNaN(this._sorting);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(LinearBlockBlock.prototype, "isIncreasing", {
            get: function () {
                return !isNaN(this._sorting) && this._sorting > 0;
            },
            enumerable: true,
            configurable: true
        });
        LinearBlockBlock.prototype.sort = function () {
            return this._block.sort(this.dim, this.isIncreasing ? 'asc' : 'desc');
        };
        LinearBlockBlock.prototype.toCompareFunc = function () {
            return toCompareFunc(this._block.data.desc, this.isIncreasing ? 'asc' : 'desc');
        };
        ;
        Object.defineProperty(LinearBlockBlock.prototype, "range", {
            get: function () {
                return this._block.range.dim(this.dim);
            },
            set: function (value) {
                var r = this._block.range.dims.slice();
                r[this.dim] = value;
                this._block.setRangeImpl(ranges.list(r));
            },
            enumerable: true,
            configurable: true
        });
        return LinearBlockBlock;
    }());
    exports.LinearBlockBlock = LinearBlockBlock;
    var LinearBlock = (function () {
        function LinearBlock(block, idtype) {
            this.blocks = [new LinearBlockBlock(block, idtype)];
            this.idtype = idtype;
            this.update();
        }
        LinearBlock.prototype.push = function (block) {
            this.blocks.push(new LinearBlockBlock(block, this.idtype));
            this.update();
        };
        ;
        LinearBlock.prototype.pushLeft = function (block) {
            this.blocks.unshift(new LinearBlockBlock(block, this.idtype));
            this.update();
        };
        ;
        Object.defineProperty(LinearBlock.prototype, "length", {
            get: function () {
                return this.blocks.length;
            },
            enumerable: true,
            configurable: true
        });
        LinearBlock.prototype.indexOf = function (block) {
            var idx = -1;
            for (var _i = 0, _a = this.blocks; _i < _a.length; _i++) {
                var elem = _a[_i];
                idx++;
                if (elem.block === block) {
                    break;
                }
            }
            return (0 <= idx && idx < this.blocks.length ? idx : -1);
        };
        ;
        LinearBlock.prototype.contains = function (block) {
            return this.indexOf(block) >= 0;
        };
        ;
        LinearBlock.prototype.sortOrder = function () {
            var r = this.blocks.filter(function (b) {
                return !isNaN(b.sorting);
            });
            r = r.sort(function (a, b) {
                return Math.abs(a.sorting) - Math.abs(b.sorting);
            });
            return r;
        };
        ;
        LinearBlock.prototype.sortBy = function (block) {
            var i = this.indexOf(block);
            if (i < 0) {
                return false;
            }
            var b = this.blocks[i];
            var s = this.sortOrder();
            if (isNaN(b.sorting)) {
                b.sorting = 1; //increasing at position 0
                //shift by 1
                s.forEach(shiftSorting(+1));
            }
            else if (b.sorting > 0) {
                b.sorting = -b.sorting; //swap order
            }
            else {
                i = Math.abs(b.sorting) - 1;
                b.sorting = NaN;
                s.slice(i + 1).forEach(shiftSorting(-1)); //shift to the left
            }
            this.update();
            return true;
        };
        LinearBlock.prototype.remove = function (block) {
            var i = this.indexOf(block);
            var b = this.blocks.splice(i, 1)[0];
            if (!isNaN(b.sorting)) {
                var s = this.sortOrder();
                i = Math.abs(b.sorting) - 1;
                //as already removed from sortOrder
                s.slice(i).forEach(shiftSorting(-1));
            }
        };
        LinearBlock.prototype.update = function () {
            var s = this.sortOrder();
            var active = s[0].range;
            var cmps = s.map(function (b) { return b.toCompareFunc(); });
            return Promise.all(s.map(function (b) { return b.block.data(); })).then(function (datas) {
                var sorted = active.sort(function (a, b) {
                    var i, j;
                    for (i = 0; i < cmps.length; ++i) {
                        j = cmps[i](a, b, datas[i]);
                        if (j !== 0) {
                            return j;
                        }
                    }
                    return 0;
                });
                s.forEach(function (b) { b.range = sorted; });
            });
        };
        ;
        return LinearBlock;
    }());
    exports.LinearBlock = LinearBlock;
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