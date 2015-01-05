/**
 * Created by Samuel Gratzl on 15.12.2014.
 */
/** global define */
define(['exports', 'jquery', 'd3', '../caleydo/wrapper', '../caleydo/multiform', '../caleydo/behavior'], function (exports, $, d3, wrapper, multiform, behaviors) {
  "use strict";
  var idtypes = wrapper.idtypes,
    C = wrapper.C,
    events = wrapper.events,
    ranges  = wrapper.ranges,
    geom = wrapper.geom;

  var manager = exports.manager = new idtypes.ObjectManager('block', 'Block');
  var mode = 'block'; //block, select, band

  exports.switchMode = function (m) {
    if (m === mode) {
      return false;
    }
    var bak = mode;
    mode = m;
    events.fire('change.mode', m, bak);
    manager.forEach(function (block) {
      block.switchMode(m);
    });
    return true;
  };
  exports.mode = function () {
    return mode;
  };

  manager.on('select', function (event, type) {
    manager.forEach(function (block) {
      block.$node.removeClass('select-' + type);
    });
    manager.selectedObjects(type).forEach(function (block) {
      block.$node.addClass('select-' + type);
    });
  });
  exports.byId = function (id) {
    return manager.byId(id);
  };

  function Block(data, parent, board) {
    events.EventHandler.call(this);
    this.data = data;
    this.parent = parent;
    this.board = board;
    this.$node = $('<div>').appendTo(parent).addClass('block');
    d3.select(this.$node[0]).datum(data); //magic variable within d3
    this.zoom = new behaviors.ZoomBehavior(this.$node[0], null, null);
    this.propagate(this.zoom, 'zoom');
    this.$content = $('<div>').appendTo(this.$node);
    var that = this;
    this.rangeUnsorted = undefined;
    if (data.desc.type === 'vector') {
      data.groups().then(function (groups) {
        that.range = ranges.list(groups);
      });
    } else {
      this.range = ranges.all();
    }
    this.$node.on({
      mouseenter : function () {
        manager.select(idtypes.hoverSelectionType, [that.id], idtypes.SelectOperation.ADD);
      },
      mouseleave : function () {
        manager.select(idtypes.hoverSelectionType, [that.id], idtypes.SelectOperation.REMOVE);
      },
      click : function (event) {
        if (mode !== 'select') {
          console.log('select', that.id);
          manager.select([that.id], idtypes.toSelectOperation(event));
        }
        return false;
      }
    });
    this.$node.attr('draggable', true)
      .on('dragstart', function (event) { return that.onDragStart(event); });
    this.actSorting = [];
    this.switchMode(mode);
    this.id = manager.nextId(this);
  }
  C.extendClass(Block, events.EventHandler);

  Block.prototype.onDragStart = function (event) {
    var e = event.originalEvent;
    e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
    var data = this.data;
    e.dataTransfer.setData('text/plain', data.desc.name);
    e.dataTransfer.setData('application/json', JSON.stringify(data.desc));
    e.dataTransfer.setData('application/caleydo-domino-dndinfo', JSON.stringify({
      block: this.id,
      offsetX : e.offsetX,
      offsetY : e.offsetY
    }));
    //encode the id in the mime type
    e.dataTransfer.setData('application/caleydo-data-item-' + data.desc.id, data.desc.id);
    this.board.currentlyDragged = data;
    e.dataTransfer.setData('application/caleydo-data-item', data);
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

  Block.prototype.setRangeImpl = function (value) {
    var bak = this.range_;
    this.range_ = value || ranges.all();
    var initialVis = guessInitial(this.data.desc);
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
    this.vis = multiform.create(this.data.view(this.range_), this.$content[0], {
      initialVis : initialVis
    });
    this.visMeta = this.vis.asMetaData;
    this.zoom.v = this.vis;
    this.zoom.meta = this.visMeta;
    this.fire('change.range', value, bak);
  };
  Object.defineProperty(Block.prototype, 'range', {
    get : function () {
      return this.range_;
    },
    set : function (value) {
      value = value || ranges.all();
      this.rangeUnsorted = value;
      this.setRangeImpl(value);
    }
  });
  Object.defineProperty(Block.prototype, 'ndim', {
    get : function () {
      return this.range_.ndim;
    }
  });
  Block.prototype.dim = function (dim) {
    return this.range_.dim(dim);
  };

  Block.prototype.ids = function () {
    return this.data.ids(this.range);
  };

  Object.defineProperty(Block.prototype, 'location', {
    get : function () {
      var p = this.pos;
      var s = this.size;
      return geom.rect(p[0], p[1], s[0], s[1]);
    }
  });

  Block.prototype.locate = function () {
    var vis = this.vis, that = this;
    if (!vis || !C.isFunction(vis.locate)) {
      return C.resolved((arguments.length === 1 ? undefined : new Array(arguments.length)));
    }
    return vis.locate.apply(vis, C.argList(arguments)).then(function (r) {
      var p = that.pos;
      if (C.isArray(r)) {
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
      return C.resolved((arguments.length === 1 ? undefined : new Array(arguments.length)));
    }
    return vis.locateById.apply(vis, C.argList(arguments)).then(function (r) {
      var p = that.pos;
      if (C.isArray(r)) {
        return r.map(function (loc) {
          return loc ? geom.wrap(loc).shift(p) : loc;
        });
      }
      return r ? geom.wrap(r).shift(p) : r;
    });
  };

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

  Block.prototype.sort = function (dim, cmp) {
    if (dim > this.ndim) {
      return C.resolved(null);
    }
    var r = this.range.dims.slice(); //work on copy
    var active = r[dim];
    var that = this;

    //special 'next' sorting mode
    if (cmp === 'next') {
      var old = this.actSorting[dim];
      if (old === 'asc') {
        cmp = 'desc';
      } else if (old === 'desc') {
        cmp = 'none';
      } else { //restore original sorting
        cmp = 'asc';
      }
    }

    if (cmp === 'none') {
      this.actSorting[dim] = undefined;
      r[dim] = this.rangeUnsorted.dim(dim);
      console.log(active.toString(), ' -> ', r[dim].toString());
      this.setRangeImpl(ranges.list(r));
      return C.resolved(this.range);
    }

    this.actSorting[dim] = cmp;

    cmp = toCompareFunc(this.data.desc, cmp);

    //get data and sort the range and update the range
    //TODO just the needed data
    return this.data.data().then(function (data_) {
      r[dim] = active.sort(function (a, b) { return cmp(a, b, data_);  });
      console.log(active.toString(), ' -> ', r[dim].toString());
      that.setRangeImpl(ranges.list(r));
      return that.range;
    });
  };

  Object.defineProperty(Block.prototype, 'idtypes', {
    get : function () {
      return this.data.idtypes;
    },
    enumerable: true
  });
  Block.prototype.ids = function () {
    return this.data.ids(this.range);
  };
  Block.prototype.destroy = function () {
    if (this.vis) {
      this.vis.destroy();
    }
    this.$node.remove();
    manager.remove(this);
  };
  Object.defineProperty(Block.prototype, 'pos', {
    get : function () {
      var p = this.$node.position();
      return [p.left, p.top];
    },
    set : function (value) {
      var bak = this.pos;
      this.$node.css('left', value[0] + 'px');
      this.$node.css('top', value[1] + 'px');
      this.fire('change.pos', value, bak);
    }
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
  Object.defineProperty(Block.prototype, 'size', {
    get: function () {
      return [this.$node.width(), this.$node.height()];
    },
    set: function (val) {
      this.$node.css('width', val[0]);
      this.$node.css('height', val[1]);
    },
    enumerable: true
  });

  function LinearBlockBlock(block, idtype) {
    this.block = block;
    this.sorting = NaN;
    this.dim = this.block.idtypes.indexOf(idtype);
  }
  Object.defineProperty(LinearBlockBlock.prototype, 'isSorted', {
    get : function () {
      return !isNaN(this.sorting);
    }
  });
  Object.defineProperty(LinearBlockBlock.prototype, 'isIncreasing', {
    get : function () {
      return !isNaN(this.sorting) && this.sorting > 0;
    }
  });
  LinearBlockBlock.prototype.sort = function () {
    return this.block.sort(this.dim, this.isIncreasing ? 'asc' : 'desc');
  };
  LinearBlockBlock.prototype.toCompareFunc = function () {
    return toCompareFunc(this.block.data.desc, this.isIncreasing ? 'asc' : 'desc');
  };
  Object.defineProperty(LinearBlockBlock.prototype, 'range', {
    get : function () {
      return this.block.range.dim(this.dim);
    },
    set : function (value) {
      var r = this.block.range.dims.slice();
      r[this.dim] = value;
      this.block.setRangeImpl(ranges.list(r));
    }
  });
  function isBlock(block) {
    return function (entry) {
      return entry.block === block;
    };
  }
  function shiftSorting(factor) {
    return function (s) {
      s.sorting += s.sorting < 0 ? -1 * factor : +1 * factor;
    };
  }
  function LinearBlock(block, idtype) {
    this.blocks = [ new LinearBlockBlock(block, idtype) ];
    this.idtype = idtype;
    this.update();
  }
  LinearBlock.prototype.push = function (block) {
    this.blocks.push(new LinearBlockBlock(block, this.idtype));
    this.update();
  };
  LinearBlock.prototype.pushLeft = function (block) {
    this.blocks.unshift(new LinearBlockBlock(block, this.idtype));
    this.update();
  };
  Object.defineProperty(LinearBlock.prototype, 'length', {
    get : function () {
      return this.blocks.length;
    },
    enumerable: true
  });
  LinearBlock.prototype.indexOf = function (block) {
    return this.blocks.indexOf(isBlock(block));
  };
  LinearBlock.prototype.contains = function (block) {
    return this.indexOf(block) >= 0;
  };
  LinearBlock.prototype.sortOrder = function () {
    var r = this.blocks.filter(function (b) {
      return !isNaN(b.sorting);
    });
    r = r.sort(function (a, b) {
      return Math.abs(a.sorting) - Math.abs(b.sorting);
    });
    return r;
  };
  LinearBlock.prototype.sortBy = function (block) {
    var i = this.indexOf(block);
    if (i < 0) { //not part of sorting
      return false;
    }
    var b = this.blocks[i];
    var s = this.sortOrder();
    if (isNaN(b.sorting)) { //not yet sorted
      b.sorting = 1; //increasing at position 0
      //shift by 1
      s.forEach(shiftSorting(+1));
    } else if (b.sorting > 0) { //already sorted by increasing
      b.sorting = -b.sorting; //swap order
    } else { //already sorting decreasing
      i = Math.abs(b.sorting) - 1;
      b.sorting = NaN;
      s.slice(i + 1).forEach(shiftSorting(-1)); //shift to the left
    }
    this.update();
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

    return C.all(s.map(function (b) {  return b.block.data(); })).then(function (datas) {
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
      s.forEach(function (b) {b.range = sorted; });
    });
  };

  exports.Block = Block;

  exports.create = function (data, parent, board) {
    return new Block(data, parent, board);
  };
});
