/* Created by Tobias Appl on 7/29/2016. */

import d3 = require('d3');
import wrapper = require('../caleydo_core/wrapper');
import idtypes = require('../caleydo_core/idtype');
import links = require('../caleydo_d3/link');
import blocks = require('./Block');

export class Board {
  private _currentlyDragged:blocks.Block;
  private content:Element;
  private links:links.LinkContainer;
  private $node;
  private preview:blocks.Block;

  constructor(node:Element) {
    var that = this;
    this.content = node;
    this.links = new links.LinkContainer(node, ['change', 'transform', 'change.pos', 'change.range', 'zoom'], {filter: blocks.areBlocksInLineOfSight});
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
    this.$node
      .on('drop', () => {
        return this.drop();
      })
      .on('dragenter', () => {
        return this.dragEnter();
      })
      .on('dragover', () => {
        return this.dragOver();
      })
      .on('dragleave', () => {
        return this.dragLeave();
      });
  }

  public get currentlyDragged():blocks.Block  {
    return this._currentlyDragged;
  }

  public set currentlyDragged(block:blocks.Block) {
    this._currentlyDragged = block;
  }

  public createPreview(data, pos:[number, number]):void {
      if(this.preview) {
        this.removePreview();
      }
      this.preview = new blocks.Block(data, this.content, this);
      this.preview.pos = [pos[0] + 60, pos[1] ];
  }

  public removePreview():void {
      this.preview.destroy();
  }

  private dragEnter() {
    console.log('dragEnter');
    var e = <DragEvent> d3.event;
    if (wrapper.C.hasDnDType(e, 'application/caleydo-data-item') || wrapper.C.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
      return false;
    }
  }

  private dragOver() {
    console.log('dragOver');
    var e = <DragEvent> d3.event;
    if (wrapper.C.hasDnDType(e, 'application/caleydo-data-item') || wrapper.C.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
      e.preventDefault();
      return false;
    }
  }

  private dragLeave() {
    console.log('dragLeave');
  }

  private drop() {
    console.log('drop');
    var e = <DragEvent> d3.event;
    e.preventDefault();
    //internal move
    if (wrapper.C.hasDnDType(e, 'application/caleydo-domino-dndinfo')) {
      var info = JSON.parse(e.dataTransfer.getData('application/caleydo-domino-dndinfo'));
      var block = blocks.byId(+info.block);
      if (wrapper.C.copyDnD(e)) { //create a copy
        //CLUE CMD
        block = new blocks.Block(block.data, this.content, this);
      }
      //CLUE CMD

      block.pos = [e.offsetX - info.offsetX, e.offsetY - info.offsetY];//[e.layerX, e.layerY];
      block.$node.css('opacity', '1');

      this.currentlyDragged = null;
      return false;
    }
    //data move
    if (wrapper.C.hasDnDType(e, 'application/caleydo-data-item')) {
      var id = JSON.parse(e.dataTransfer.getData('application/caleydo-data-item'));
      var that = this;
      wrapper.data.get(id).then((d) => {
        //CLUE CMD
        blocks.createBlockAt(d, that.content, that, [e.offsetX, e.offsetY]);
      });
      this.currentlyDragged = null;
      return false;
    }
  }
}
