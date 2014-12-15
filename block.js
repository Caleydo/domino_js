/**
 * Created by Samuel Gratzl on 15.12.2014.
 */
/** global define */
define(['exports', 'jquery', '../caleydo/main', '../caleydo/range', '../caleydo/event', '../caleydo/multiform'], function (exports, $, C, ranges, events, multiform) {
  "use strict";
  function Block(data, parent) {
    events.EventHandler.call(this);
    this.data = data;
    this.parent = parent;
    this.$node = $('<div>').appendTo(parent).addClass('block');
    this.$content = $('<div>').appendTo(this.$node);
    this.$overlay = $('<div>').appendTo(this.$node);
    this.range = data.desc.type === 'veotor' ? data.groups : ranges.all();
  }
  C.extendClass(Block, events.EventHandler);

  Object.defineProperty(Block.prototype, 'range', {
    get : function () {
      return this.range_;
    },
    set : function (value) {
      var bak = this.range_;
      this.range_ = value || ranges.all();
      this.destroy();
      this.vis = multiform.createGrid(this.data, this.range_, this.$content[0], function (data, range) {
        return data.view(range);
      });
      this.fire('change.range', value, bak);
    }
  });
  Block.prototype.dim = function (dim) {
    return this.range_.dim(dim);
  };
  Block.prototype.destroy = function () {
    if (this.vis) {
      this.vis.destroy();
      this.$content.clear();
    }
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
