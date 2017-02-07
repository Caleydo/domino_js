/**
 * Created by Tobias Appl on 7/29/2016.
 */

import * as $ from 'jquery';
import {select, ascending, descending, event as d3event} from 'd3';
import {create as createMultiForm} from 'phovea_core/src/multiform';
import {ZoomBehavior} from 'phovea_core/src/behavior';
import {EventHandler} from 'phovea_core/src/event';
import {Board} from './Board';
import {list as rlist, all, Range} from 'phovea_core/src/range';
import {wrap, rect} from 'phovea_core/src/geom';
import {IObjectDecorator, BlockDecorator, IDecorableObject} from './BlockDecorator';
import {ObjectManager, hoverSelectionType, SelectOperation, toSelectOperation} from 'phovea_core/src/idtype';
import {VALUE_TYPE_CATEGORICAL, IDataDescription, ICategoricalValueTypeDesc} from 'phovea_core/src/datatype';
import {IVectorDataDescription} from 'phovea_core/src/vector';
import {IMatrixDataDescription} from 'phovea_core/src/matrix';

/**
 * Creates a block at position (x,y)
 * @param data
 * @param parent
 * @param board
 * @param pos
 * @returns {Block}
 */
export function createBlockAt(data, parent: Element, board: Board, pos: [number, number], manager) {
  const block = createBlock(data, parent, board, manager);
  block.pos = pos;
  return block;
}

/**
 * Creates a block without positioning, uses the standard block decorator
 * @param data
 * @param parent
 * @param board
 * @param pos
 * @returns {Block}
 */
export function createBlock(data, parent: Element, board: Board, manager) {
  return new Block<BlockDecorator>(data, parent, board, new BlockDecorator(), manager);
}

export class Block<Decorator extends IObjectDecorator> extends EventHandler implements IDecorableObject {
  $node: JQuery;
  $container: JQuery;
  id;

  private _data;
  private parent: Element;
  private board: Board;
  zoom: ZoomBehavior;
  private $content;
  private actSorting = [];
  private rangeUnsorted;

  private _range;
  private vis;
  private visMeta;

  private dragData: {
    startOffset: [number, number];
    currentlyDragged: boolean;
  };

  //private rotationAngle:number = 0;

  constructor(data, parent: Element, board: Board, public readonly decorator: Decorator, private readonly manager: ObjectManager<Block<Decorator>>) {
    super();
    this.dragData = {
      startOffset: [0, 0],
      currentlyDragged: false
    };
    this.decorator.decoratedObject = this;
    this._data = data;
    this.parent = parent;
    this.board = board;
    this.$container = $('<div>').appendTo(parent).addClass('blockContainer');
    this.decorator.decorateHeader(this.$container);
    this.$node = $('<div>').appendTo(this.$container).addClass('block');

    select(this.$node[0]).datum(data); //magic variable within d3
    this.$content = $('<div>').appendTo(this.$node);
    const that = this;
    this.rangeUnsorted = undefined;
    if (data.desc.type === 'vector') {
      data.groups().then((groups) => {
        this.range = rlist(groups);
      });
    } else {
      this.range = all();
    }

    this.$container.on({
      mouseenter: () => {
        manager.select(hoverSelectionType, [that.id], SelectOperation.ADD);
      },
      mouseleave: () => {
        manager.select(hoverSelectionType, [that.id], SelectOperation.REMOVE);
      },
      click: (event) => {
        console.log('select', that.id);
        manager.select([that.id], toSelectOperation(event));
        return false;
      },
      mousemove: (event) => {
        this.mouseMove(event);
      },
      mouseup: () => {
        this.mouseUp();
      }
    });

    this.actSorting = [];
    this.$content.addClass('mode-block');

    this.id = this.manager.nextId(this);
  }

  private mouseUp() {
    if (this.dragData.currentlyDragged) {
      this.dragging = false;
    }
  }

  private mouseMove(event: MouseEvent) {
    if (this.dragData.currentlyDragged) {
      const pos = this.pos;
      pos[0] += (event.offsetX - this.dragData.startOffset[0]);
      pos[1] += (event.offsetY - this.dragData.startOffset[1]);
      this.pos = pos;
      //this.dragData.startOffset = [event.offsetX, event.offsetY];
    }
  }

  public set dragging(isDragging: boolean) {
    if (isDragging) {
      const e = <DragEvent> d3event;
      this.dragData.startOffset = [e.offsetX, e.offsetY];
    }
    this.dragData.currentlyDragged = isDragging;
  }

  public get dragOffset(): [number, number] | boolean {
    if (this.dragData.currentlyDragged) {
      return this.dragData.startOffset;
    }
    return false;
  }

  public rotateBy(degree: number): void {
    // TODO
  }

  public destroy() {
    if (this.vis) {
      this.vis.destroy();
    }
    this.$container.remove();
    this.manager.remove(this);
  };

  public get data() {
    return this._data;
  }

  public setRangeImpl(value: Range) {
    const bak = this._range;
    this._range = value || all();
    let initialVis = guessInitial(this._data.desc);
    if (this.vis) {
      initialVis = this.vis.actDesc;
      this.vis.destroy();
      this.$content.empty();
    }
    /*this.vis = multiform.createGrid(this.data, this.range_, this.$content[0], function (data, range) {
     return data.view(range);
     }, {
     initialVis : initialVis
     });*/
    this.vis = createMultiForm(this._data.view(this._range), this.$content[0], {
      initialVis
    });
    this.visMeta = this.vis.asMetaData;
    this.zoom = new ZoomBehavior(this.$node[0], this.vis, this.visMeta);
    this.propagate(this.zoom, 'zoom');
    this.fire('change.range', value, bak);
  }

  public get range() {
    return this._range;
  }

  public set range(value: Range) {
    this._range = value || all();
    this.rangeUnsorted = value;
    this.setRangeImpl(value);
  }

  public get ndim() {
    return this._range.ndim;
  }

  public dim() {
    return this._range.dim;
  }

  public ids() {
    return this._data.ids(this.range);
  }

  public get location() {
    const p = this.pos;
    const s = this.size;
    return rect(p[0], p[1], s[0], s[1]);
  }

  public locate() {
    const vis = this.vis, that = this;
    if (!vis || typeof vis.locate !== 'function') {
      return Promise.resolve((arguments.length === 1 ? undefined : new Array(arguments.length)));
    }
    return vis.locate.apply(vis, Array.from(arguments)).then((r) => {
      const p = that.pos;
      if (Array.isArray(r)) {
        return r.map(function (loc) {
          return loc ? wrap(loc).shift(p) : loc;
        });
      }
      return r ? wrap(r).shift(p) : r;
    });
  }

  public locateById() {
    const vis = this.vis, that = this;
    if (!vis || typeof vis.locateById !== 'function') {
      return Promise.resolve((arguments.length === 1 ? undefined : new Array(arguments.length)));
    }
    return vis.locateById.apply(vis, Array.from(arguments)).then((r)=> {
      const p = that.pos;
      if (Array.isArray(r)) {
        return r.map(function (loc) {
          return loc ? wrap(loc).shift(p) : loc;
        });
      }
      return r ? wrap(r).shift(p) : r;
    });
  };

  public sort(dim: number, cmp: string) {
    if (dim > this.ndim) {
      return Promise.resolve(null);
    }
    const r = this.range.dims.slice(); //work on copy
    const active = r[dim];
    const that = this;

    //special 'next' sorting mode
    if (cmp === 'next') {
      const old = this.actSorting[dim];
      if (old === 'asc') {
        cmp = 'desc';
      } else if (old === 'desc') {
        cmp = 'none';
      } else { //restore original sorting
        cmp = 'asc';
      }
    }

    if (cmp === 'none') {
      this.actSorting[dim] = undefined;
      r[dim] = this.rangeUnsorted.dim(dim);
      console.log(active.toString(), ' -> ', r[dim].toString());
      this.setRangeImpl(rlist(r));
      return Promise.resolve(this.range);
    }

    this.actSorting[dim] = cmp;

    const cmpF = toCompareFunc(this._data.desc, <'desc'|'asc'>cmp);

    //get data and sort the range and update the range
    //TODO just the needed data
    return this._data._data().then((loadedData)=> {
      r[dim] = active.sort((a, b) => {
        return cmpF(a, b, loadedData);
      });
      console.log(active.toString(), ' -> ', r[dim].toString());
      that.setRangeImpl(rlist(r));
      return that.range;
    });
  }

  public get idtypes() {
    return this._data.idtypes;
  }

  public get pos(): [number, number] {
    const p = this.$container.position();
    return [p.left, p.top];
  }

  public set pos(value: [number, number]) {
    const bak = this.$node.position();
    this.$container.css('left', value[0] + 'px');
    this.$container.css('top', value[1] + 'px');
    this.fire('change.pos', value, [bak.left, bak.top]);
  }

  public moveBy(xdelta: number, ydelta: number) {
    const p = this.pos;
    this.pos = [p[0] + xdelta, p[1] + ydelta];
  }

  public move(xfactor: number, yfactor: number) {
    function toDelta(factor) {
      return factor * 20;
    }

    return this.moveBy(toDelta(xfactor), toDelta(yfactor));
  }

  public get size() {
    return [this.$node.width(), this.$node.height()];
  }

  public set size(val) {
    this.$node.css('width', val[0]);
    this.$node.css('width', val[1]);
  }
}


function guessInitial(desc: IDataDescription): string|number {
  if (desc.type === 'matrix') {
    return 'phovea-vis-heatmap';
  }
  if (desc.type === 'vector' && (<IVectorDataDescription<any>>desc).value.type === VALUE_TYPE_CATEGORICAL) {
    return 'phovea-vis-mosaic';
  }
  if (desc.type === 'vector' && (<IVectorDataDescription<any>>desc).value.type.match('real|int')) {
    return 'phovea-vis-axis';
  }
  return -1;
}

function toCompareFunc(desc: IVectorDataDescription<any>|IMatrixDataDescription<any>, cmp: 'asc'|'desc'|((a: any, b: any)=>number)) {
  const cmpF:(a: any, b: any)=>number = (cmp === 'asc') ? ascending : (cmp === 'desc' ? descending : cmp);

  switch (desc.value.type) {
    case VALUE_TYPE_CATEGORICAL:
      const cats = (<ICategoricalValueTypeDesc>(desc.value)).categories;
      return (a, b, data) => {
        const ac = data[a];
        const bc = data[b];
        const ai = cats.indexOf(ac);
        const bi = cats.indexOf(bc);
        return cmpF(ai, bi);
      };
    default:
      return (a, b, data) => {
        const ac = data[a];
        const bc = data[b];
        return cmpF(ac, bc);
      };
  }
}
