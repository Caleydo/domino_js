/**
 * Created by Tobias Appl on 7/29/2016.
 */

import $ = require('jquery');
import d3 = require('d3');
import wrapper = require('../caleydo_core/wrapper');
import multiform = require('../caleydo_core/multiform');
import behaviors = require('../caleydo_core/behavior');
import board = require('./Board');
import blockDecorator = require('./BlockDecorator');
import idtypes = require('../caleydo_core/idtype');

var events = wrapper.events,
  ranges  = wrapper.ranges;

/**
 * Creates a block at position (x,y)
 * @param data
 * @param parent
 * @param board
 * @param pos
 * @returns {Block}
 */
export function createBlockAt(data, parent:Element, board:board.Board, pos:[number, number], manager) {
  var block = createBlock(data, parent, board, manager);
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
export function createBlock(data, parent:Element, board:board.Board, manager) {
  var block = new Block<blockDecorator.BlockDecorator>(data, parent, board, new blockDecorator.BlockDecorator(), manager);
  return block;
}

export class Block<Decorator extends blockDecorator.IObjectDecorator> extends events.EventHandler implements blockDecorator.IDecorableObject {
  public $node:JQuery;
  public $container:JQuery;
  public id;

  private _data;
  private parent:Element;
  private board:board.Board;
  public zoom:behaviors.ZoomBehavior;
  private $content;
  private actSorting = [];
  private rangeUnsorted;

  private _range;
  private vis;
  private visMeta;

  private dragData: {
    startOffset:[number, number];
    currentlyDragged:boolean;
  };

  private rotationAngle:number = 0;

  constructor(data, parent:Element, board:board.Board, public decorator: Decorator, private manager:idtypes.ObjectManager<Block<Decorator>>) {
    super();
    this.dragData = {
      startOffset:[0,0],
      currentlyDragged:false
    };

    events.EventHandler.call(this);
    this.decorator.decoratedObject = this;
    this._data = data;
    this.parent = parent;
    this.board = board;
    this.$container = $('<div>').appendTo(parent).addClass('blockContainer');
    this.decorator.decorateHeader(this.$container);
    this.$node = $('<div>').appendTo(this.$container).addClass('block');

    d3.select(this.$node[0]).datum(data); //magic variable within d3
    //CLUE CMD
    this.zoom = new behaviors.ZoomBehavior(this.$node[0], null, null);
    this.propagate(this.zoom, 'zoom');
    this.$content = $('<div>').appendTo(this.$node);
    var that = this;
    this.rangeUnsorted = undefined;
    if (data.desc.type === 'vector') {
      data.groups().then(function (groups) {
        that.range = ranges.list(groups);
      });
    } else {
      this.range = ranges.all();
    }

    this.$container.on({
      mouseenter: () => {
        manager.select(wrapper.idtypes.hoverSelectionType, [that.id], wrapper.idtypes.SelectOperation.ADD);
      },
      mouseleave: () => {
        manager.select(wrapper.idtypes.hoverSelectionType, [that.id], wrapper.idtypes.SelectOperation.REMOVE);
      },
      click: function (event) {
        console.log('select', that.id);
        manager.select([that.id], wrapper.idtypes.toSelectOperation(event));
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
    if(this.dragData.currentlyDragged) {
      this.dragging = false;
    }
  }

  private mouseMove(event:MouseEvent) {
    if(this.dragData.currentlyDragged) {
      var pos = this.pos;
      pos[0] += (event.offsetX - this.dragData.startOffset[0]);
      pos[1] += (event.offsetY - this.dragData.startOffset[1]);
      this.pos = pos;
      //this.dragData.startOffset = [event.offsetX, event.offsetY];
    }
  }

  public set dragging(isDragging:boolean) {
    if(isDragging) {
      var e = <DragEvent> d3.event;
      this.dragData.startOffset = [e.offsetX, e.offsetY];
      this.board.currentlyDragged = this;
    } else {
      this.board.currentlyDragged = null;
    }
    this.dragData.currentlyDragged = isDragging;
  }

  public get dragOffset(): [number, number] | boolean {
    if(this.dragData.currentlyDragged) {
      return this.dragData.startOffset;
    }
    return false;
  }

  public rotateBy(degree:number):void {

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

  public setRangeImpl (value) {
    var bak = this._range;
    this._range = value || ranges.all();
    var initialVis = guessInitial(this._data.desc);
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
    this.vis = multiform.create(this._data.view(this._range), this.$content[0], {
      initialVis : initialVis
    });
    this.visMeta = this.vis.asMetaData;
    this.zoom.v = this.vis;
    this.zoom.meta = this.visMeta;
    this.fire('change.range', value, bak);
  }

  public get range() {
    return this._range;
  }

  public set range(value) {
    this._range = value || ranges.all();
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
    var p = this.pos;
    var s = this.size;
    return wrapper.geom.rect(p[0], p[1], s[0], s[1]);
  }

  public locate() {
    var vis = this.vis, that = this;
    if (!vis || !wrapper.C.isFunction(vis.locate)) {
      return Promise.resolve((arguments.length === 1 ? undefined : new Array(arguments.length)));
    }
    return vis.locate.apply(vis, wrapper.C.argList(arguments)).then(function (r) {
      var p = that.pos;
      if (Array.isArray(r)) {
        return r.map(function (loc) {
          return loc ? wrapper.geom.wrap(loc).shift(p) : loc;
        });
      }
      return r ? wrapper.geom.wrap(r).shift(p) : r;
    });
  }

  public locateById () {
    var vis = this.vis, that = this;
    if (!vis || !wrapper.C.isFunction(vis.locateById)) {
      return Promise.resolve((arguments.length === 1 ? undefined : new Array(arguments.length)));
    }
    return vis.locateById.apply(vis, wrapper.C.argList(arguments)).then(function (r) {
      var p = that.pos;
      if (Array.isArray(r)) {
        return r.map(function (loc) {
          return loc ? wrapper.geom.wrap(loc).shift(p) : loc;
        });
      }
      return r ? wrapper.geom.wrap(r).shift(p) : r;
    });
  };

  public sort(dim,cmp) {
    if (dim > this.ndim) {
      return Promise.resolve(null);
    }
    var r = this.range.dims.slice(); //work on copy
    var active = r[dim];
    var that = this;

    //special 'next' sorting mode
    if (cmp === 'next') {
      var old = this.actSorting[dim];
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
      this.setRangeImpl(ranges.list(r));
      return Promise.resolve(this.range);
    }

    this.actSorting[dim] = cmp;

    cmp = toCompareFunc(this._data.desc, cmp);

    //get data and sort the range and update the range
    //TODO just the needed data
    return this._data._data().then(function (data_) {
      r[dim] = active.sort(function (a, b) { return cmp(a, b, data_);  });
      console.log(active.toString(), ' -> ', r[dim].toString());
      that.setRangeImpl(ranges.list(r));
      return that.range;
    });
  }

  public get idtypes() {
    return this._data.idtypes;
  }

  public get pos():[number, number] {
    var p = this.$container.position();
    return [p.left, p.top];
  }

  public set pos(value:[number, number]) {
    var bak = this.$node.position();
    this.$container.css('left', value[0] + 'px');
    this.$container.css('top', value[1] + 'px');
    this.fire('change.pos', value, [bak.left, bak.top]);
  }

  public moveBy(xdelta, ydelta) {
    var p = this.pos;
    this.pos = [p[0] + xdelta, p[1] + ydelta];
  }

  public move(xfactor, yfactor) {
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


function guessInitial(desc):any {
  if (desc.type === 'matrix') {
    return 'caleydo-vis-heatmap';
  }
  if (desc.type === 'vector' && desc.value.type === 'categorical') {
    return 'caleydo-vis-mosaic';
  }
  if (desc.type === 'vector' && desc.value.type.match('real|int')) {
    return 'caleydo-vis-axis';
  }
  return -1;
}

function toCompareFunc(desc, cmp) {
  cmp = (cmp === 'asc') ? d3.ascending : (cmp === 'desc' ? d3.descending : cmp);

  switch (desc.value.type) {
  case 'categorical':
    var cats = desc.value.categories;
    return function (a, b, data) {
      var ac = data[a];
      var bc = data[b];
      var ai = cats.indexOf(ac);
      var bi = cats.indexOf(bc);
      return cmp(ai, bi);
    };
  default:
    return function (a, b, data) {
      var ac = data[a];
      var bc = data[b];
      return cmp(ac, bc);
    };
  }
}

function shiftSorting(factor) {
  return function (s) {
    s.sorting += s.sorting < 0 ? -1 * factor : +1 * factor;
  };
}
