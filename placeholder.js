/**
 * Created by Samuel Gratzl on 29.12.2014.
 */
/* global define */

define(['exports', 'd3', '../caleydo/wrapper', '../caleydo-links/link'], function (exports, d3, wrapper, links) {
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

  function Placeholder(parent, pos, board) {
    var that = this;
    this.$node = d3.select(parent).append('div').classed('placeholder', true).style({
      left : pos[0] + 'px',
      top : pos[1] + 'px'
    });
    //dnd operation
    this.$node.on('dragenter', function () {
      var e = d3.event;
      if (hasDnDType(e, 'application/caleydo-data-item') || hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        that.$node.classed('over', true);
        e.stopPropagation();
        board.overPlaceholder = true;
        e.preventDefault();
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
      that.$node.classed('over', false);
      var e = d3.event;
      e.stopPropagation();
      e.preventDefault();
      board.overPlaceholder = false;
      return false;
    }).on('drop', function () {
      var e = d3.event;
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
  }

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
