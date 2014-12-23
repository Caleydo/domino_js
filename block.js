/**
 * Created by Samuel Gratzl on 15.12.2014.
 */
/** global define */
define(['exports', 'jquery', 'd3', '../caleydo/main', '../caleydo/range', '../caleydo/event', '../caleydo/multiform', '../caleydo/idtype', '../caleydo/behavior', '../caleydo/geom', 'jquery-ui'], function (exports, $, d3, C, ranges, events, multiform, idtypes, behaviors, geom) {
  "use strict";
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

  function Block(data, parent) {
    events.EventHandler.call(this);
    this.data = data;
    this.parent = parent;
    this.$node = $('<div>').appendTo(parent).addClass('block');
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
    this.$node.draggable({
      appendTo: parent,
      containment: 'parent',
      cursor: 'pointer',
      delay: 150,
      grid: [5, 5],
      helper: function () {
        var s = that.size;
        return $('<div class="block_dragger">').css({
          width: s[0],
          height: s[1]
        });
      },
      snap: true,
      snapMode: 'outer',
      stop: function (event, ui) {
        that.pos = [ui.position.left, ui.position.top];
      }
    });
    this.actSorting = [];
    this.switchMode(mode);
    this.id = manager.nextId(this);
  }
  C.extendClass(Block, events.EventHandler);


  Block.prototype.switchMode = function (m) {
    switch (m) {
    case 'block':
      this.$content.addClass('mode-block');
      this.$node.draggable('enable');
      break;
    case 'select':
      this.$content.removeClass('mode-block');
      this.$node.draggable('disable');
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
      } else {
        return r ? geom.wrap(r).shift(p) : r;
      }
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
      } else {
        return r ? geom.wrap(r).shift(p) : r;
      }
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

  function LinearBlock() {
    this.blocks = [];
  }
  LinearBlock.prototype.push = function (block) {
    this.blocks.push(block);
  };

  exports.Block = Block;

  exports.create = function (data, parent) {
    return new Block(data, parent);
  };
});
