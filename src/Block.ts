/**
 * Created by Tobias Appl on 7/29/2016.
 */

import {select, ascending, descending, event as d3event} from 'd3';
import {create as createMultiForm, MultiForm} from 'phovea_core/src/multiform';
import {IVisMetaData, IVisPluginDesc} from 'phovea_core/src/vis';
import {ZoomBehavior} from 'phovea_core/src/behavior';
import {EventHandler} from 'phovea_core/src/event';
import {Board} from './Board';
import {list as rlist, all, Range} from 'phovea_core/src/range';
import {wrap, rect} from 'phovea_core/src/geom';
import {ObjectManager, hoverSelectionType, SelectOperation, toSelectOperation} from 'phovea_core/src/idtype';
import {VALUE_TYPE_CATEGORICAL, IDataDescription, ICategoricalValueTypeDesc} from 'phovea_core/src/datatype';
import {IVectorDataDescription, IAnyVector} from 'phovea_core/src/vector';
import {IMatrixDataDescription, IAnyMatrix} from 'phovea_core/src/matrix';

export declare type BlockManager = ObjectManager<Block>;
export declare type IDominoDataTypeDescription = IVectorDataDescription<any>|IMatrixDataDescription<any>;
export declare type IDominoDataType = IAnyVector|IAnyMatrix;

/**
 * Creates a block at position (x,y)
 * @param data
 * @param parent
 * @param board
 * @param pos
 * @returns {Block}
 */
export function createBlockAt(data: IDominoDataType, parent: Element, board: Board, pos: [number, number], manager: BlockManager) {
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
export function createBlock(data: IDominoDataType, parent: Element, board: Board, manager: BlockManager) {
  return new Block(data, parent, board, manager);
}

export class Block extends EventHandler {
  readonly node: HTMLElement;
  readonly container: HTMLElement;
  readonly id: number;

  private zoom: ZoomBehavior;
  private actSorting = [];
  private rangeUnsorted: Range;

  private _range: Range;
  private vis: MultiForm;
  private visMeta: IVisMetaData;

  private dragData: {
    startOffset: [number, number];
    currentlyDragged: boolean;
  };

  //private rotationAngle:number = 0;

  constructor(public readonly data: IDominoDataType, parent: Element, private readonly board: Board, private readonly manager: ObjectManager<Block>) {
    super();
    this.dragData = {
      startOffset: [0, 0],
      currentlyDragged: false
    };
    this.board = board;
    this.container = parent.ownerDocument.createElement('div');
    this.container.classList.add('blockContainer');
    parent.appendChild(this.container);
    this.container.innerHTML = `
      <div class="toolbar"></div>
      <div class="block">
        <div class="content mode-block"></div>
      </div>`;
    const $container = select(this.container);
    this.createHeader($container.select('div.toolbar'));

    this.node = <HTMLElement>this.container.querySelector('div.block');
    const that = this;
    this.rangeUnsorted = undefined;
    if (data.desc.type === 'vector') {
      (<IAnyVector>data).groups().then((groups) => {
        this.range = rlist(groups);
      });
    } else {
      this.range = all();
    }

    $container.on('mouseenter', () => manager.select(hoverSelectionType, [that.id], SelectOperation.ADD))
      .on('mouseleave', () => manager.select(hoverSelectionType, [that.id], SelectOperation.REMOVE))
      .on('click', () => {
        console.log('select', that.id);
        manager.select([that.id], toSelectOperation(<MouseEvent>d3event));
        (<MouseEvent>d3event).preventDefault();
      })
      .on('mousemove', () => this.mouseMove(<MouseEvent>d3event))
      .on('mouseup', () => this.mouseUp());

    this.actSorting = [];

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

  set dragging(isDragging: boolean) {
    if (isDragging) {
      const e = <DragEvent> d3event;
      this.dragData.startOffset = [e.offsetX, e.offsetY];
    }
    this.dragData.currentlyDragged = isDragging;
  }

  get dragOffset(): [number, number] | boolean {
    if (this.dragData.currentlyDragged) {
      return this.dragData.startOffset;
    }
    return false;
  }

  rotateBy(degree: number): void {
    // TODO
  }

  destroy() {
    if (this.vis) {
      this.vis.destroy();
    }
    this.container.remove();
    this.manager.remove(this);
  };

  setRangeImpl(value?: Range) {
    const bak = this._range;
    this._range = value || all();
    let initialVis : number|string|IVisPluginDesc = guessInitial(this.data.desc);
    const content = <HTMLElement>this.node.querySelector('div.content');
    if (this.vis) {
      initialVis = this.vis.act;
      this.vis.destroy();
      content.innerHTML = '';
    }
    /*this.vis = multiform.createGrid(this.data, this.range_, this.$content[0], function (data, range) {
     return data.view(range);
     }, {
     initialVis : initialVis
     });*/
    this.vis = createMultiForm(this.data.view(this._range), content, {
      initialVis
    });
    this.visMeta = this.vis.asMetaData;

    const toolbar = <HTMLElement>this.container.querySelector('div.visses');
    toolbar.innerHTML = `<i class="fa fa-image"></i>`;
    this.vis.addIconVisChooser(toolbar);

    this.zoom = new ZoomBehavior(this.node, this.vis, this.visMeta);
    this.propagate(this.zoom, 'zoom');
    this.fire('change.range', value, bak);
  }

  get range() {
    return this._range;
  }

  set range(value: Range|null) {
    this._range = value || all();
    this.rangeUnsorted = value;
    this.setRangeImpl(value);
  }

  get ndim() {
    return this._range.ndim;
  }

  dim() {
    return this._range.dim;
  }

  ids() {
    return this.data.ids(this.range);
  }

  get location() {
    const p = this.pos;
    const s = this.size;
    return rect(p[0], p[1], s[0], s[1]);
  }

  locate() {
    const vis = this.vis, that = this;
    if (!vis || typeof vis.locate !== 'function') {
      return Promise.resolve((arguments.length === 1 ? undefined : new Array(arguments.length)));
    }
    return vis.locate.apply(vis, Array.from(arguments)).then((r) => {
      const p = that.pos;
      if (Array.isArray(r)) {
        return r.map((loc) => loc ? wrap(loc).shift(p) : loc);
      }
      return r ? wrap(r).shift(p) : r;
    });
  }

  locateById() {
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

  sort(dim: number, cmp: string) {
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

    const cmpF = toCompareFunc(this.data.desc, <'desc'|'asc'>cmp);

    //get data and sort the range and update the range
    //TODO just the needed data
    return this.data.data().then((loadedData)=> {
      r[dim] = active.sort((a, b) => {
        return cmpF(a, b, loadedData);
      });
      console.log(active.toString(), ' -> ', r[dim].toString());
      that.setRangeImpl(rlist(r));
      return that.range;
    });
  }

  get idtypes() {
    return this.data.idtypes;
  }

  get pos(): [number, number] {
    return [parseInt(this.container.style.left, 10), parseInt(this.container.style.top, 10)];
  }

  set pos(value: [number, number]) {
    const bak = this.pos;
    this.container.style.left = value[0] + 'px';
    this.container.style.top = value[1] + 'px';
    this.fire('change.pos', value, bak);
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

  get size() {
    const bb = this.node.getBoundingClientRect();
    return [bb.width, bb.height];
  }

  set size(val: [number, number]) {
    this.node.style.width = val[0]+'px';
    this.node.style.height = val[1]+'px';
  }

  private createHeader($header: d3.Selection<any>) {
    $header.append('i').attr('class', 'fa fa-arrows').on('mousedown', () => {
      const e = <MouseEvent> d3event;
      e.preventDefault();
      this.dragging = true;
    }).on('mouseup', () => {
      const e = <MouseEvent> d3event;
      e.preventDefault();
      this.dragging = false;
    });
    $header.append('i').attr('class', 'fa fa-plus-square').on('click', () => {
      const e = <MouseEvent> d3event;
      e.preventDefault();
      const amount = 1;
      this.zoom.zoom(amount, amount);
    });

    $header.append('i').attr('class', 'fa fa-minus-square').on('click', () => {
      const e = <MouseEvent> d3event;
      e.preventDefault();
      const amount = -1;
      this.zoom.zoom(amount, amount);
    });

    $header.append('div').attr('class','visses');

    //addIconVisChooser(<Element>this.$header.node());
    $header.append('i').attr('class', 'fa fa-close').on('click', () => {
      this.destroy();
    });
  }
}


function guessInitial(desc: IDominoDataTypeDescription): string|number {
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

function toCompareFunc(desc: IDominoDataTypeDescription, cmp: 'asc'|'desc'|((a: any, b: any)=>number)) {
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
