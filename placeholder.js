/**
 * Created by Samuel Gratzl on 29.12.2014.
 */
/* global define */

define(['exports', 'd3', '../caleydo_core/wrapper', '../caleydo_core/vis'], function (exports, d3, wrapper, vis) {
  "use strict";
  //helper function since there are inconsistencies
  function hasDnDType(e, type) {
    var types = e.dataTransfer.types;
    if (wrapper.C.isFunction(types.indexOf)) {
      return types.indexOf(type) >= 0;
    }
    if (wrapper.C.isFunction(types.includes)) {
      return types.includes(type);
    }
    return false;
  }

  exports.hasDnDType = hasDnDType;

  exports.copyDnD = function (e) {
    var dT = e.dataTransfer;
    return (e.ctrlKey && dT.effectAllowed.match(/copy/gi)) || (!dT.effectAllowed.match(/move/gi));
  };
  exports.updateDropEffect = function (e) {
    var dT = e.dataTransfer;
    if (exports.copyDnD(e)) {
      dT.dropEffect = 'copy';
    } else {
      dT.dropEffect = 'move';
    }
  };

  function Placeholder(parent, pos, board) {
    var that = this;
    this.board = board;
    this.pos = pos;
    this.$node = d3.select(parent).append('div').classed('placeholder', true).style({
      left : pos[0] + 'px',
      top : pos[1] + 'px'
    }).datum(this);
    //dnd operation
    this.$node.on('dragenter', function () {
      console.log('enter place');
      if (!that.$node.selectAll('i').empty()) {
        return;
      }
      var e = d3.event;
      if (hasDnDType(e, 'application/caleydo-data-item') || hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        e.stopPropagation();
        board.overPlaceholder = true;
        e.preventDefault();

        //create selection dialog
        that.$node.classed('over', true);
        that.createPreview(board.currentlyDragged);
        that.createSelection(board.currentlyDragged);
        return false;
      }
    }).on('dragover', function () {
      var e = d3.event;
      if (hasDnDType(e, 'application/caleydo-data-item') || hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
    }).on('dragleave', function () {
      if (that.overOption) {
        return;
      }
      that.$node.classed('over', false);
      var e = d3.event;
      board.overPlaceholder = false;
      that.$node.selectAll('i').remove();

      if (that.previewed) {
        that.board.removePreview(that.previewed);
        that.previewed = null;
      }
    }).on('drop', function () {
      that.persistPreview(d3.event);
    });
  }
  Placeholder.prototype.createPreview = function (data) {
    this.previewed = this.board.createPreview(data, this.pos);
  };
  Placeholder.prototype.persistPreview = function (e) {
    this.board.overPlaceholder = false;
    if (this.previewed) {
      this.board.persistPreview(this.previewed, e);
      this.previewed = null;
    }
  };
  Placeholder.prototype.setOption = function (vis) {
    this.overOption = vis !== null;
    //update preview
    if (this.previewed && vis) {
      this.previewed.vis.switchTo(vis);
    }
  };
  Placeholder.prototype.createSelection = function (data) {
    var that = this;
    var visses = vis.list(data);
    this.$node.selectAll('i').data(visses)
      .enter()
      .append('i')
      .each(function (d) {
        d.iconify(this);
      })
      .attr('draggable', true)
      .on('dragenter', function (d) {
        console.log('enter ' + d.name);
        that.setOption(d);
        d3.select(this).classed('over', true);
        d3.event.stopPropagation();
        d3.event.preventDefault();
        return false;
      }).on('dragover', function () {
        exports.updateDropEffect(d3.event);
        d3.event.stopPropagation();
        d3.event.preventDefault();
        return false;
      }).on('dragleave', function () {
        that.setOption(null);
        d3.select(this).classed('over', false);
        d3.event.stopPropagation();
        d3.event.preventDefault();
        return false;
      }).on('drop', function () {
        that.persistPreview(d3.event);
        return false;
      });
  };

  exports.create = function (parent, pos, board) {
    return new Placeholder(parent, pos, board);
  };
  exports.anyShown = function (parent) {
    return parent.querySelectorAll('div.placeholder').length > 0;
  };
  exports.removeAll = function (parent) {
    d3.select(parent).selectAll('div.placeholder').remove();
  };
});
