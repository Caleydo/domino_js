/**
 * Created by Samuel Gratzl on 29.12.2014.
 */
/* global define */

define(['exports', 'd3', '../caleydo/wrapper', '../caleydo-links/link', './block', './placeholder'], function (exports, d3, wrapper, links, blocks, placeholders) {
  "use strict";
  var idtypes = wrapper.idtypes;

  function Board(node) {
    var that = this;
    this.content = node;
    this.links = new links.LinkContainer(node, ['change', 'transform', 'change.pos', 'change.range', 'zoom']);
    blocks.manager.on('add', function (event, id, block) {
      that.links.push(block);
    });
    blocks.manager.on('remove', function (event, id, block) {
      that.links.remove(block);
    });

    this.$node = d3.select(this.links.node);
    //clear on click on background
    this.$node.classed('selection-clearer', true).on('click', function () {
      blocks.manager.clear();
      idtypes.clearSelection();
    });

    //dnd operation
    this.$node.on('dragenter', function () {
      var e = d3.event;
      if (placeholders.hasDnDType(e, 'application/caleydo-data-item') || placeholders.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        that.addPlaceholders();
        return false;
      }
    }).on('dragover', function () {
      var e = d3.event;
      if (placeholders.hasDnDType(e, 'application/caleydo-data-item') || placeholders.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        e.preventDefault();
        return false;
      }
    }).on('dragleave', function () {
      if (that.overPlaceholder) { //ignore
        return;
      }
      that.removePlaceholders();
    }).on('drop', function () {
      var e = d3.event;
      e.preventDefault();
      //internal move
      if (placeholders.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        var info = JSON.parse(e.dataTransfer.getData('application/caleydo-domino-dndinfo'));
        var block = blocks.byId(+info.block);
        block.pos = [e.offsetX - info.offsetX, e.offsetY - info.offsetY];
        that.removePlaceholders();
        return false;
      }
      //data move
      if (placeholders.hasDnDType(e, 'application/caleydo-data-item')) {
        var id = e.dataTransfer.getData('application/caleydo-data-item');
        wrapper.data.get(id).then(function (d) {
          var b = blocks.create(d, that.content);
          b.pos = [e.offsetX, e.offsetY];
        });
        that.removePlaceholders();
        return false;
      }
    });
  }

  Board.prototype.addPlaceholders = function () {
    if (placeholders.anyShown(this.links.node)) {
      return;
    }
    console.log('create placeholders');
    var p = placeholders.create(this.links.node, [100, 100], this);
  };
  Board.prototype.removePlaceholders = function () {
    console.log('remove placeholders');
    placeholders.removeAll(this.content);
  };

  exports.create = function (content) {
    return new Board(content);
  };
});
