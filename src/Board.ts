/* Created by Tobias Appl on 7/29/2016. */

import * as d3 from 'd3';
import * as wrapper from 'phovea_core/src/wrapper';
import * as idtypes from 'phovea_core/src/idtype';
import * as links from 'phovea_d3/src/link';
import * as blocks from './Block';
import * as blockDecorator from './BlockDecorator';
import * as range from 'phovea_core/src/range';

export class Board {
  private content:Element;
  private links:links.LinkContainer;
  public $node;

  private blocks : {
    currentlyDragged; //untyped because of generic block definition
    manager:idtypes.ObjectManager<blocks.Block<blockDecorator.BlockDecorator>>;
  };

  constructor(node:Element) {
    var that = this;
    this.content = node;
    this.links = new links.LinkContainer(node, ['change', 'transform', 'change.pos', 'change.range', 'zoom'],
      {
        filter: (a: blocks.Block<blockDecorator.BlockDecorator>, b: blocks.Block<blockDecorator.BlockDecorator>) => {
          console.log('check block occlusion');
          var retval = {val: true};

          this.blocks.manager.forEach(function (block) {
            var a = this[0];
            var b = this[1];
            var retval = this[2];

            if (!retval.val) {
              return;
            }

            if (block.id !== a.id && block.id !== b.id) {
              var leftelempos = b.$node[0].offsetLeft;
              var rightelempos = a.$node[0].offsetLeft;
              if (a.$node[0].offsetLeft < b.$node[0].offsetLeft) {
                leftelempos = a.$node[0].offsetLeft;
                rightelempos = b.$node[0].offsetLeft;
              }

              if (leftelempos < block.$node[0].offsetLeft && block.$node[0].offsetLeft < rightelempos) {
                retval.val = false;
              }
            }

          }, [a, b, retval]);
          return retval.val;
        }
      });

    this.blocks = {
      currentlyDragged: null,
      manager: new idtypes.ObjectManager<blocks.Block<blockDecorator.BlockDecorator>>('block', 'Block')
    };

    this.blocks.manager.on('select', function (event, type) {
      that.blocks.manager.forEach(function (block) {
        block.decorator.$header.classed('phovea-select-' + type, false);
        block.$node.removeClass('phovea-select-' + type);
      });
      that.blocks.manager.selectedObjects(type).forEach(function (block) {
        block.decorator.$header.classed('phovea-select-' + type, true);
        block.$node.addClass('phovea-select-' + type);
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
    this.$node.on({
      'drop': () => {
        this.drop();
      },
      'dragenter': () => {
        this.dragEnter();
      },
      'dragover': () => {
        this.dragOver();
      },
      'dragleave': () => {
        this.dragLeave();
      },
      'mousemove': () => {
        this.mouseMove();
      },
      'mouseup': () => {
        this.mouseUp();
      }
    });
  }

  public set currentlyDragged(block) {
    this.blocks.currentlyDragged = block;
  }

  public get currentlyDragged() {
    return this.blocks.currentlyDragged;
  }

  private mouseUp() {
    if(null !== this.blocks.currentlyDragged) {
      this.blocks.currentlyDragged.dragging = false;

    }
  }

  private mouseMove() {
    if(null !== this.blocks.currentlyDragged) {
      var e = <MouseEvent> d3.event;
      var coords = [e.offsetX, e.offsetY];
      var blockOffset = this.blocks.currentlyDragged.dragOffset;
      if(false !== blockOffset) {
        coords[0] -= blockOffset[0];
        coords[1] -= blockOffset[1];
      }
      this.blocks.currentlyDragged.pos = coords;
    }
  }

  private dragEnter() {
    console.log('dragEnter');
    var e = <DragEvent> d3.event;
    if (wrapper.C.hasDnDType(e, 'application/phovea-data-item') || wrapper.C.hasDnDType(e, 'application/phovea-domino-dndinfo')) {
      return false;
    }
  }

  private dragOver() {
    console.log('dragOver');
    var e = <DragEvent> d3.event;
    this.links.update();
    if (wrapper.C.hasDnDType(e, 'application/phovea-data-item') || wrapper.C.hasDnDType(e, 'application/phovea-domino-dndinfo')) {
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
    //data move
    if (wrapper.C.hasDnDType(e, 'application/phovea-data-item')) {
      var id = JSON.parse(e.dataTransfer.getData('application/phovea-data-item'));
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

    var amount = e.ctrlKey ? 15 : 5;

    switch(e.which) {
      case 37: // left
        dxy[0] -= amount;
        break;
      case 38: // up
        dxy[1] -= amount;
        break;
      case 39: // right
        dxy[0] = amount;
        break;
      case 40: // down
        dxy[1] = amount;
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
