/**
 * Created by Tobias Appl on 7/29/2016.
 */

import $ = require('jquery');
import d3 = require('d3');
import wrapper = require('../caleydo_core/wrapper');
import multiform = require('../caleydo_core/multiform');
import behaviors = require('../caleydo_core/behavior');
import board = require('./Board');
import datatypes = require('../caleydo_core/datatype');

var idtypes = wrapper.idtypes,
  C = wrapper.C,
  events = wrapper.events,
  ranges  = wrapper.ranges,
  geom = wrapper.geom;

export const manager =  new idtypes.ObjectManager<Block>('block', 'Block');
var mode = 'block'; //block, select, band

//CLUE CMD
export function switchMode (m):any {
  if (m === mode) {
    return false;
  }
  var bak = mode;
  mode = m;
  events.fire('change.mode', m, bak);
  manager.forEach(function (block) {
    block.switchMode(m);
  });
  return true;
};

export function getMode ():any {
  return mode;
};

manager.on('select', function (event, type) {
  manager.forEach(function (block) {
    block.$node.removeClass('caleydo-select-' + type);
  });
  manager.selectedObjects(type).forEach(function (block) {
    block.$node.addClass('caleydo-select-' + type);
  });
});

export function byId(id) {
  return manager.byId(id);
};

/**
 * Creates a block at position (x,y) and adds it to the manager
 * @param data
 * @param parent
 * @param board
 * @param pos
 * @returns {Block}
 */
export function createBlockAt(data, parent:Element, board:board.Board, pos:[number, number]) {
  var block = new Block(data, parent, board);
  block.pos = pos;
  block.id = manager.nextId(block);
  return block;
}

/**
 * Create a block at a certain position without adding it to the block manager
 * @param data The block's data
 * @param pos A number array with 2 elements containing the creation position [x,y]
 * @returns {Block}
 */
export function createPreview(data, pos:[number, number]) {
    var b = new Block(data, this.content, this);
    b.pos = [pos[0] + 60, pos[1] ];
    return b;
}

export class Block extends events.EventHandler {
  public $node;
  public id;

  private _data;
  private parent:Element;
  private board:board.Board;
  private zoom:behaviors.ZoomBehavior;
  private $content;
  private actSorting = [];
  private startpos;
  private rangeUnsorted;

  private _range;
  private vis;
  private visMeta;

  constructor(data, parent:Element, board:board.Board) {
    super();
    events.EventHandler.call(this);
    this._data = data;
    this.parent = parent;
    this.board = board;
    this.$node = $('<div>').appendTo(parent).addClass('block');
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
    this.$node.on({
      mouseenter: () => {
        manager.select(idtypes.hoverSelectionType, [that.id], idtypes.SelectOperation.ADD);
      },
      mouseleave: () => {
        manager.select(idtypes.hoverSelectionType, [that.id], idtypes.SelectOperation.REMOVE);
      },
      click: function (event) {
        if (mode !== 'select') {
          console.log('select', that.id);
          manager.select([that.id], idtypes.toSelectOperation(event));
        }
        return false;
      }
    });
    this.$node.attr('draggable', true)
      .on('dragstart', function (event) {
        return that.onDragStart(event);
      })
      .on('drag', function (event) {
        console.log('dragging');
      });
    this.actSorting = [];
    this.switchMode(mode);
    //this.id = manager.nextId(this);
  }

  public destroy() {
    if (this.vis) {
      this.vis.destroy();
    }
    this.$node.remove();
    manager.remove(this);
  };

  public get data() {
    return this.data;
  }

  public onDragStart(event) {
    var e = event.originalEvent;
    e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
    var data = this._data;
    e.dataTransfer.setData('text/plain', data.desc.name);
    e.dataTransfer.setData('application/json', JSON.stringify(data.desc));
    e.dataTransfer.setData('application/caleydo-domino-dndinfo', JSON.stringify({
      block: this.id,
      offsetX : e.offsetX,
      offsetY : e.offsetY,
      layerX : e.layerX,
      layerY : e.layerY
    }));
    //encode the id in the mime type
    var p = JSON.stringify(data.persist());
    e.dataTransfer.setData('application/caleydo-data-item', p);
    e.dataTransfer.setData('application/caleydo-data-item-' +p, p);
  //    var dragimg = document.createElement('span');
  //    dragimg.setAttribute('style',
  //  'position: absolute; display: none; top: 0; left: 0; width: 0; height: 0;' );
  //    e.dataTransfer.setDragImage(dragimg, 0, 0);
    this.board.currentlyDragged = data;
    //backup the current position
    this.startpos = this.pos;
    this.$node.css('opacity', '0.5');
    this.$node.css('filter', 'alpha(opacity=50)');
  }

  public switchMode(m) {
    switch (m) {
    case 'block':
      this.$content.addClass('mode-block');
      this.$node.attr('draggable', true);
      break;
    case 'select':
      this.$content.removeClass('mode-block');
      this.$node.attr('draggable', null);
      break;
    }
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
    return geom.rect(p[0], p[1], s[0], s[1]);
  }

  public locate() {
    var vis = this.vis, that = this;
    if (!vis || !C.isFunction(vis.locate)) {
      return Promise.resolve((arguments.length === 1 ? undefined : new Array(arguments.length)));
    }
    return vis.locate.apply(vis, C.argList(arguments)).then(function (r) {
      var p = that.pos;
      if (Array.isArray(r)) {
        return r.map(function (loc) {
          return loc ? geom.wrap(loc).shift(p) : loc;
        });
      }
      return r ? geom.wrap(r).shift(p) : r;
    });
  }

  public locateById () {
    var vis = this.vis, that = this;
    if (!vis || !C.isFunction(vis.locateById)) {
      return Promise.resolve((arguments.length === 1 ? undefined : new Array(arguments.length)));
    }
    return vis.locateById.apply(vis, C.argList(arguments)).then(function (r) {
      var p = that.pos;
      if (Array.isArray(r)) {
        return r.map(function (loc) {
          return loc ? geom.wrap(loc).shift(p) : loc;
        });
      }
      return r ? geom.wrap(r).shift(p) : r;
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
    var p = this.$node.position();
    return [p.left, p.top];
  }

  public set pos(value) {
    var bak = this.pos;
    this.$node.css('left', value[0] + 'px');
    this.$node.css('top', value[1] + 'px');
    this.fire('change.pos', value, bak);
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


export class LinearBlockBlock{
  private _block:Block;
  private _sorting:number;
  private dim;

  constructor(block:Block, idtype) {
    this._block = block;
    this._sorting = NaN;
    this.dim = this._block.idtypes.indexOf(idtype);
  }

  public get block():Block {
    return this.block;
  }

  public get sorting():number {
    return this._sorting;
  }

  public get isSorted():boolean {
    return !isNaN(this._sorting);
  }

  public get isIncreasing():boolean {
    return !isNaN(this._sorting) && this._sorting > 0;
  }

  public sort() {
    return this._block.sort(this.dim, this.isIncreasing ? 'asc' : 'desc');
  }

  public toCompareFunc() {
    return toCompareFunc(this._block.data.desc, this.isIncreasing ? 'asc' : 'desc');
  };

  public get range() {
      return this._block.range.dim(this.dim);
  }

  public set range(value) {
      var r = this._block.range.dims.slice();
      r[this.dim] = value;
      this._block.setRangeImpl(ranges.list(r));
  }
}

export class LinearBlock {
  private blocks:LinearBlockBlock[];
  private idtype;

  constructor(block:Block, idtype) {
    this.blocks = [ new LinearBlockBlock(block, idtype) ];
    this.idtype = idtype;
    this.update();
  }

  public push(block:Block):void {
    this.blocks.push(new LinearBlockBlock(block, this.idtype));
    this.update();
  };

  public pushLeft(block:Block):void {
    this.blocks.unshift(new LinearBlockBlock(block, this.idtype));
    this.update();
  };

  public get length():number {
      return this.blocks.length;
  }

  public indexOf(block:Block):number {
    var idx = -1;
    for(var elem of this.blocks) {
      idx++;
      if(elem.block === block) {
        break;
      }
    }
    return (0 <= idx && idx < this.blocks.length ? idx : -1);
  };

  public contains(block):boolean {
    return this.indexOf(block) >= 0;
  };

  public sortOrder():any  {
    var r = this.blocks.filter(function (b) {
      return !isNaN(b.sorting);
    });
    r = r.sort(function (a, b) {
      return Math.abs(a.sorting) - Math.abs(b.sorting);
    });
    return r;
  };

  public sortBy(block:Block):boolean {
    var i = this.indexOf(block);
    if (i < 0) { //not part of sorting
      return false;
    }
    var b = this.blocks[i];
    var s = this.sortOrder();
    if (isNaN(b.sorting)) { //not yet sorted
      b.sorting = 1; //increasing at position 0
      //shift by 1
      s.forEach(shiftSorting(+1));
    } else if (b.sorting > 0) { //already sorted by increasing
      b.sorting = -b.sorting; //swap order
    } else { //already sorting decreasing
      i = Math.abs(b.sorting) - 1;
      b.sorting = NaN;
      s.slice(i + 1).forEach(shiftSorting(-1)); //shift to the left
    }
    this.update();
    return true;
  }

  public remove(block) {
    var i = this.indexOf(block);
    var b = this.blocks.splice(i, 1)[0];
    if (!isNaN(b.sorting)) {
      var s = this.sortOrder();
      i = Math.abs(b.sorting) - 1;
      //as already removed from sortOrder
      s.slice(i).forEach(shiftSorting(-1));
    }
  }

  public update() {
    var s = this.sortOrder();
    var active = s[0].range;
    var cmps = s.map(function (b) { return b.toCompareFunc(); });

    return Promise.all(s.map(function (b) {  return b.block.data(); })).then(function (datas) {
      var sorted = active.sort(function (a, b) {
        var i, j;
        for (i = 0; i < cmps.length; ++i) {
          j = cmps[i](a, b, datas[i]);
          if (j !== 0) {
            return j;
          }
        }
        return 0;
      });
      s.forEach(function (b) {b.range = sorted; });
    });
  };
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
