/**
 * Created by Samuel Gratzl on 29.12.2014.
 */
/* global define */

define(['exports', 'd3', '../caleydo/wrapper', '../caleydo-links/link', './block'], function (exports, d3, wrapper, links, blocks) {
  "use strict";
  var C = wrapper.C,
    idtypes = wrapper.idtypes;

  function hasDnDType(e, type) {
    var types = e.dataTransfer.types;
    if (C.isFunction(types.indexOf)) {
      return types.indexOf(type) >= 0;
    }
    if (C.isFunction(types.includes)) {
      return types.includes(type);
    }
    return false;
  }

  function Board(node) {
    var that = this;
    this.links = new links.LinkContainer(node, ['change', 'transform', 'change.pos', 'change.range', 'zoom']);
    blocks.manager.on('add', function (event, id, block) {
      that.links.push(block);
    });
    blocks.manager.on('remove', function (event, id, block) {
      that.links.remove(block);
    });
    this.$node = d3.select(this.links.node);
    this.$node.classed('selection-clearer', true).on('click', function () {
      blocks.manager.clear();
      idtypes.clearSelection();
    });
    this.$node.on('dragenter', function () {
      var e = d3.event;
      if (hasDnDType(e, 'application/caleydo-data-item') || hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        that.addPlaceholders();
        return false;
      }
    }).on('dragover', function () {
      var e = d3.event;
      if (hasDnDType(e, 'application/caleydo-data-item') || hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        e.preventDefault();
        return false;
      }
    }).on('dragleave', function () {
      that.removePlaceholders();
    }).on('drop', function () {
      var e = d3.event;
      e.preventDefault();
      if (hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        var info = JSON.parse(e.dataTransfer.getData('application/caleydo-domino-dndinfo'));
        var block = blocks.byId(+info.block);
        block.pos = [e.offsetX - info.offsetX, e.offsetY - info.offsetY];
        return false;
      }
      if (hasDnDType(e, 'application/caleydo-data-item')) {
        var id = e.dataTransfer.getData('application/caleydo-data-item');
        wrapper.data.get(id).then(function (d) {
          var b = blocks.create(d, node);
          b.pos = [e.offsetX, e.offsetY];
        });
        return false;
      }
    });
  }

  Board.prototype.addPlaceholders = function () {

  };
  Board.prototype.removePlaceholders = function () {

  };

  exports.create = function (content) {
    return new Board(content);
  };
});
