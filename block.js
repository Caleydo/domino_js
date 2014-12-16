/**
 * Created by Samuel Gratzl on 15.12.2014.
 */
/** global define */
define(['exports', 'jquery', '../caleydo/main', '../caleydo/range', '../caleydo/event', '../caleydo/multiform', '../caleydo/idtype', '../caleydo/behavior', 'jquery-ui'], function (exports, $, C, ranges, events, multiform, idtypes, behaviors) {
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
    var id = this.id = manager.nextId(this);
    this.data = data;
    this.parent = parent;
    this.$node = $('<div>').appendTo(parent).addClass('block');
    this.zoom = new behaviors.ZoomBehavior(this.$node[0], null, null);
    this.propagate(this.zoom, 'zoom');
    this.$content = $('<div>').appendTo(this.$node);
    var that = this;
    if (data.desc.type === 'vector') {
      data.groups().then(function (groups) {
        that.range = ranges.list(groups);
      });
    } else {
      this.range = ranges.all();
    }
    this.$node.on({
      mouseenter : function () {
        manager.select(idtypes.hoverSelectionType, [id], idtypes.SelectOperation.ADD);
      },
      mouseleave : function () {
        manager.select(idtypes.hoverSelectionType, [id], idtypes.SelectOperation.REMOVE);
      },
      click : function (event) {
        if (mode !== 'select') {
          console.log('select', id);
          manager.select([id], idtypes.toSelectOperation(event));
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
    this.switchMode(mode);
  }
  C.extendClass(Block, events.EventHandler);

  Object.defineProperty(Block.prototype, 'range', {
    get : function () {
      return this.range_;
    },
    set : function (value) {
      var bak = this.range_;
      this.range_ = value || ranges.all();
      if (this.vis) {
        this.vis.destroy();
        this.$content.clear();
      }
      this.vis = multiform.createGrid(this.data, this.range_, this.$content[0], function (data, range) {
        return data.view(range);
      });
      this.visMeta = multiform.asMetaData;
      this.zoom.v = this.vis;
      this.zoom.meta = this.visMeta;
      this.fire('change.range', value, bak);
    }
  });
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
  Block.prototype.dim = function (dim) {
    return this.range_.dim(dim);
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
