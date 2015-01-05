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
      console.log('enter');
      var e = d3.event;
      if (placeholders.hasDnDType(e, 'application/caleydo-data-item') || placeholders.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        that.addPlaceholders();
        return false;
      }
    }).on('dragover', function () {
      var e = d3.event;
      if (placeholders.hasDnDType(e, 'application/caleydo-data-item') || placeholders.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        e.preventDefault();
        placeholders.updateDropEffect(e);
        return false;
      }
    }).on('dragleave', function () {
      if (that.overPlaceholder) { //ignore
        return;
      }
      that.removePlaceholders();
    }).on('drop', function () {
      console.log('drop');
      var e = d3.event;
      e.preventDefault();
      //internal move
      if (placeholders.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
        var info = JSON.parse(e.dataTransfer.getData('application/caleydo-domino-dndinfo'));
        var block = blocks.byId(+info.block);
        if (placeholders.copyDnD(e)) { //create a copy
          block = blocks.create(block.data, that.content, that);
        }
        block.pos = [e.offsetX - info.offsetX, e.offsetY - info.offsetY];
        that.removePlaceholders();
        return false;
      }
      //data move
      if (placeholders.hasDnDType(e, 'application/caleydo-data-item')) {
        var id = e.dataTransfer.getData('application/caleydo-data-item');
        wrapper.data.get(id).then(function (d) {
          var b = blocks.create(d, that.content, that);
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
    //var p = placeholders.create(this.content, [100, 100], this);
  };
  Board.prototype.removePlaceholders = function () {
    console.log('remove placeholders');
    placeholders.removeAll(this.content);
    this.overPlaceholder = false;
  };
  Board.prototype.createPreview = function (data, pos) {
    var b = blocks.create(data, this.content, this);
    b.pos = [pos[0] + 60, pos[1] ];
    return b;
  };
  Board.prototype.persistPreview = function (preview, e) {
    var p = preview.pos;
    if (!placeholders.copyDnD(e) && placeholders.hasDnDType(e, 'application/caleydo-domino-dndinfo')) { //create a copy
      preview.destroy();
      var info = JSON.parse(e.dataTransfer.getData('application/caleydo-domino-dndinfo'));
      preview = blocks.byId(+info.block);
    }
    //TODO
    preview.pos = [p[0] - 60, p[1] ];
    this.removePlaceholders();
  };
  Board.prototype.removePreview = function (preview) {
    preview.destroy();
  };

  exports.create = function (content) {
    return new Board(content);
  };
});
