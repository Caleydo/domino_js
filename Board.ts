/* Created by Tobias Appl on 7/29/2016. */

import d3 = require('d3');
import wrapper = require('../caleydo_core/wrapper');
import idtypes = require('../caleydo_core/idtype');
import links = require('../caleydo_d3/link');
import blocks = require('./Block');
import blockDecorator = require('./BlockDecorator');
import range = require('../caleydo_core/range');

export class Board {
  private content:Element;
  private links:links.LinkContainer;
  private $node;

  private blocks : {
    currentlyDragged:blocks.Block<blockDecorator.BlockDecorator>;
    manager:idtypes.ObjectManager<blocks.Block<blockDecorator.BlockDecorator>>;
  };

  constructor(node:Element) {
    var that = this;
    this.content = node;
    this.links = new links.LinkContainer(node, ['change', 'transform', 'change.pos', 'change.range', 'zoom'],
      {filter: (a:blocks.Block<blockDecorator.BlockDecorator>, b:blocks.Block<blockDecorator.BlockDecorator>) => {
        console.log("check block occlusion");
        var retval = { val : true};

        this.blocks.manager.forEach(function(block) {
          var a = this[0];
          var b = this[1];
          var retval = this[2];

          if(!retval.val) {
            return;
          }

          if(block.id !== a.id && block.id !== b.id) {
            var leftelempos = b.$node[0].offsetLeft;
            var rightelempos = a.$node[0].offsetLeft;
            if(a.$node[0].offsetLeft < b.$node[0].offsetLeft) {
               leftelempos = a.$node[0].offsetLeft;
               rightelempos = b.$node[0].offsetLeft;
            }

            if(leftelempos < block.$node[0].offsetLeft && block.$node[0].offsetLeft < rightelempos) {
              retval.val = false;
            }
          }

        }, [a,b,retval]);
        return retval.val;
      }});

    this.blocks = {
      currentlyDragged: <blocks.Block<blockDecorator.BlockDecorator>>null,
      manager: new idtypes.ObjectManager<blocks.Block<blockDecorator.BlockDecorator>>('block', 'Block')
    };

    this.blocks.manager.on('select', function (event, type) {
      that.blocks.manager.forEach(function (block) {
        block.$node.removeClass('caleydo-select-' + type);
      });
      that.blocks.manager.selectedObjects(type).forEach(function (block) {
        block.$node.addClass('caleydo-select-' + type);
      });
    });
    this.blocks.manager.on('add', function (event, id, block) {
      that.links.push(block);
    });
    this.blocks.manager.on('remove', function (event, id, block) {
      that.links.remove(block);
    });

    this.$node = d3.select(this.links.node);
    //clear on click on background
    this.$node.classed('selection-clearer', true).on('click', function () {
      that.blocks.manager.clear();
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
      })
      .on('mousemove', () => {
        return this.mouseMove();
      });

  }

  public set currentlyDragged(block: blocks.Block<blockDecorator.BlockDecorator>) {
    this.blocks.currentlyDragged = block;
  }

  public get currentlyDragged(): blocks.Block<blockDecorator.BlockDecorator>  {
    return this.blocks.currentlyDragged;
  }

  private mouseMove() {

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
    this.links.update();
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
      var block = this.blocks.manager.byId(+info.block);
      if (wrapper.C.copyDnD(e)) { //create a copy
        //CLUE CMD
        block = blocks.createBlock(block.data, this.content, this, this.blocks.manager);
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
        blocks.createBlockAt(d, that.content, that, [e.offsetX, e.offsetY], this.blocks.manager);
      });
      this.currentlyDragged = null;
      return false;
    }
  }

  public digestKeyCode(e:KeyboardEvent) {
    e.preventDefault(); // prevent the default action (scroll / move caret)
    var dxy:[number,number] = [0,0];

    switch(e.which) {
      case 37: // left
        dxy[0] = -5;
        break;
      case 38: // up
        dxy[1] = -5;
        break;
      case 39: // right
        dxy[0] = 5;
        break;
      case 40: // down
        dxy[1] = 5;
        break;
      default:
        return; // exit this handler for other keys
    }

    var selected_blocks:range.Range = this.blocks.manager.selections();
    selected_blocks.dim(0).asList().forEach((id) => {
      this.blocks.manager.byId(id).moveBy(dxy[0], dxy[1]);
    });
  }
}
