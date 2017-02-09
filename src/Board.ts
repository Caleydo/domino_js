/* Created by Tobias Appl on 7/29/2016. */

import {select, event as d3event} from 'd3';
import {ObjectManager, clearSelection} from 'phovea_core/src/idtype';
import {LinkContainer} from 'phovea_d3/src/link';
import {Block, createBlockAt} from './Block';
import {BlockDecorator} from './BlockDecorator';
import {hasDnDType} from 'phovea_core/src';
import {get as getData} from 'phovea_core/src/data';

export class Board {
  private content:Element;
  private links:LinkContainer;
  public $node;

  private blocks : {
    currentlyDragged; //untyped because of generic block definition
    manager:ObjectManager<Block<BlockDecorator>>;
  };

  constructor(node:Element) {
    const that = this;
    this.content = node;
    this.links = new LinkContainer(node, ['change', 'transform', 'change.pos', 'change.range', 'zoom'],
      {
        filter: (a: Block<BlockDecorator>, b: Block<BlockDecorator>) => {
          console.log('check block occlusion');
          const retval = {val: true};

          this.blocks.manager.forEach(function (block) {
            const a = this[0];
            const b = this[1];
            const retval = this[2];

            if (!retval.val) {
              return;
            }

            if (block.id !== a.id && block.id !== b.id) {
              let leftelempos = b.$node[0].offsetLeft;
              let rightelempos = a.$node[0].offsetLeft;
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
      manager: new ObjectManager<Block<BlockDecorator>>('block', 'Block')
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

    this.$node = select(this.links.node);
    //clear on click on background
    this.$node.classed('selection-clearer', true).on('click', function () {
      that.blocks.manager.clear();
      clearSelection();
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
      const e = <MouseEvent> d3event;
      const coords = [e.offsetX, e.offsetY];
      const blockOffset = this.blocks.currentlyDragged.dragOffset;
      if(false !== blockOffset) {
        coords[0] -= blockOffset[0];
        coords[1] -= blockOffset[1];
      }
      this.blocks.currentlyDragged.pos = coords;
    }
  }

  private dragEnter() {
    console.log('dragEnter');
    const e = <DragEvent> d3event;
    if (hasDnDType(e, 'application/phovea-data-item') || hasDnDType(e, 'application/phovea-domino-dndinfo')) {
      return false;
    }
  }

  private dragOver() {
    console.log('dragOver');
    const e = <DragEvent> d3event;
    this.links.update();
    if (hasDnDType(e, 'application/phovea-data-item') || hasDnDType(e, 'application/phovea-domino-dndinfo')) {
      e.preventDefault();
      return false;
    }
  }

  private dragLeave() {
    console.log('dragLeave');
  }

  private drop() {
    console.log('drop');
    const e = <DragEvent> d3event;
    e.preventDefault();
    //data move
    if (hasDnDType(e, 'application/phovea-data-item')) {
      const id = JSON.parse(e.dataTransfer.getData('application/phovea-data-item'));
      const that = this;
      getData(id).then((d) => {
        //CLUE CMD
        createBlockAt(d, that.content, that, [e.offsetX, e.offsetY], this.blocks.manager);
      });
      this.currentlyDragged = null;
      return false;
    }
  }

  digestKeyCode(e:KeyboardEvent) {
    e.preventDefault(); // prevent the default action (scroll / move caret)
    const dxy:[number,number] = [0,0];

    const amount = e.ctrlKey ? 15 : 5;

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

    const selectedBlocks = this.blocks.manager.selections();
    selectedBlocks.dim(0).forEach((id) => {
      this.blocks.manager.byId(id).moveBy(dxy[0], dxy[1]);
    });
  }
}
