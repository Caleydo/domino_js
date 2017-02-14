/* Created by Tobias Appl on 7/29/2016. */

import {select, event as d3event} from 'd3';
import {ObjectManager, clearSelection} from 'phovea_core/src/idtype';
import {LinkContainer} from 'phovea_d3/src/link';
import {Block, createBlockAt, IDominoDataType} from './Block';
import {hasDnDType} from 'phovea_core/src';
import {get as getData} from 'phovea_core/src/data';

export class Board {
  private content: HTMLElement;
  private links: LinkContainer;
  $node: d3.Selection<any>;

  private blocks: {
    currentlyDragged: Block;
    manager: ObjectManager<Block>;
  };

  constructor(node: HTMLElement) {
    const that = this;
    this.content = node;
    this.links = new LinkContainer(node, ['change', 'transform', 'change.pos', 'change.range', 'zoom'], {
        filter: this.checkBlockCollisions.bind(this)
      });

    this.blocks = {
      currentlyDragged: null,
      manager: new ObjectManager<Block>('block', 'Block')
    };

    this.blocks.manager.on('select', function (event, type: string) {
      that.blocks.manager.forEach(function (block) {
        block.node.classList.remove('phovea-select-' + type);
      });
      that.blocks.manager.selectedObjects(type).forEach(function (block) {
        if (block.node) {
          block.node.classList.add('phovea-select-' + type);
        }
      });
    });
    this.blocks.manager.on('add', function (event, id, block: Block) {
      that.links.push(block);
    });
    this.blocks.manager.on('remove', function (event, id, block: Block) {
      that.links.remove(block);
    });

    this.$node = select(this.links.node);
    //clear on click on background
    this.$node.classed('selection-clearer', true).on('click', function () {
      that.blocks.manager.clear();
      clearSelection();
    });

    //dnd operation
    this.$node.on('drop', () => this.drop())
      .on('dragenter', () => this.dragEnter())
      .on('dragover', () => this.dragOver())
      .on('dragleave', () => this.dragLeave())
      .on('mousemove', () => this.mouseMove())
      .on('mouseup', () => this.mouseUp());
  }

  public set currentlyDragged(block) {
    this.blocks.currentlyDragged = block;
  }

  public get currentlyDragged() {
    return this.blocks.currentlyDragged;
  }

  private mouseUp() {
    if (null !== this.blocks.currentlyDragged) {
      this.blocks.currentlyDragged.dragging = false;

    }
  }

  private mouseMove() {
    if (null !== this.blocks.currentlyDragged) {
      const e = <MouseEvent> d3event;
      const coords = [e.offsetX, e.offsetY];
      const blockOffset = this.blocks.currentlyDragged.dragOffset;
      if (false !== blockOffset) {
        coords[0] -= blockOffset[0];
        coords[1] -= blockOffset[1];
      }
      this.blocks.currentlyDragged.pos = <[number,number]>coords;
    }
  }

  private dragEnter() {
    const e = <DragEvent> d3event;
    if (hasDnDType(e, 'application/phovea-data-item') || hasDnDType(e, 'application/phovea-domino-dndinfo')) {
      return false;
    }
  }

  private dragOver() {
    const e = <DragEvent> d3event;
    this.links.update();
    if (hasDnDType(e, 'application/phovea-data-item') || hasDnDType(e, 'application/phovea-domino-dndinfo')) {
      e.preventDefault();
      return false;
    }
  }

  private dragLeave() {
    //
  }

  private drop() {
    const e = <DragEvent> d3event;
    e.preventDefault();
    //data move
    if (hasDnDType(e, 'application/phovea-data-item')) {
      const id = JSON.parse(e.dataTransfer.getData('application/phovea-data-item'));
      const that = this;
      getData(id).then((d) => {
        //CLUE CMD
        createBlockAt(<IDominoDataType>d, that.content, that, [e.offsetX, e.offsetY], this.blocks.manager);
      });
      this.currentlyDragged = null;
      return false;
    }
  }

  private checkBlockCollisions(a: Block, b: Block) {
    let hasCollision = false;

    this.blocks.manager.forEach((block) => {
      if (hasCollision) {
        return;
      }

      if (block.id !== a.id && block.id !== b.id) {
        let leftelempos = b.node.offsetLeft;
        let rightelempos = a.node.offsetLeft;
        if (a.node.offsetLeft < b.node.offsetLeft) {
          leftelempos = a.node.offsetLeft;
          rightelempos = b.node.offsetLeft;
        }

        if (leftelempos < block.node.offsetLeft && block.node.offsetLeft < rightelempos) {
          hasCollision = true;
        }
      }

    });
    return !hasCollision;
  }

  digestKeyCode(e: KeyboardEvent) {
    const selectedBlocks = this.blocks.manager.selections();
    if (selectedBlocks.isNone) {
      return;
    }


    e.preventDefault(); // prevent the default action (scroll / move caret)
    const dxy: [number, number] = [0, 0];

    const amount = e.ctrlKey ? 15 : 5;

    switch (e.which) {
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

    selectedBlocks.dim(0).forEach((id) => {
      this.blocks.manager.byId(id).moveBy(dxy[0], dxy[1]);
    });
  }
}
