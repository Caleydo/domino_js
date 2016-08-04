/**
 * Created by Tobias Appl on 7/29/2016.
 */

import $ = require('jquery');
import d3 = require('d3');

export class Blockbrowser {
  private elemTemplate = `
    <table class="table table-striped table-hover table-condensed">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>ID Types</th>
          <th>Dim</th>
        </tr>
      </thead>
      <tbody>

      </tbody>
    </table>
  `;

  private items:BlockbrowserItem[] = [];
  private $node:d3.Selection<any>;
  private $content:d3.Selection<any>;

  constructor(parent:Element) {
    this.$node = d3.select(parent).html(this.elemTemplate);
    this.$node = this.$node.select('table');
    this.$content = this.$node.select('tbody');
  }

  public addItem(item:BlockbrowserItem):void {
    item.parentBrowser = this;
    this.items.push(item);
  }

  public addItems(items:BlockbrowserItem[]):void {
    items.forEach((item) => {
      this.addItem(item);
    });
  }

  public render():void {
    var data = this.$content.selectAll('tr').data(this.items);
    var dataenter = data.enter().append('tr');
    dataenter.each(function(ditem:BlockbrowserItem) {
        ditem.buildItemElement(this);
      })
      .attr('draggable', true)
      .on('dragstart', (d) => {
        d.onDragStart();
      });
    data.exit().remove();
  }

}

export class BlockbrowserItem {
  private _parentBrowser:Blockbrowser;
  private $node:d3.Selection<any>;
  private name:string;
  private type:string;
  private idTypes:string[] = [];
  private dimensions:string;
  private item;

  constructor(name:string, type:string, idTypes:string[], dimensions:string, item) {
    this.name = name;
    this.type = type;
    this.idTypes = idTypes;
    this.dimensions = dimensions;
    this.item = item;
  }

  public set parentBrowser(parentBrowser:Blockbrowser) {
    this._parentBrowser = parentBrowser;
  }

  public get parentBrowser():Blockbrowser {
    return this._parentBrowser;
  }

  public buildItemElement(itemNode):void {
    $('<td>').appendTo(itemNode).text(this.name);
    $('<td>').appendTo(itemNode).text(this.type);
    $('<td>').appendTo(itemNode).text(this.idTypes.join(', '));
    $('<td>').appendTo(itemNode).text(this.dimensions);
  }

  public onDragStart():void {
    var e = <DragEvent> d3.event;
    e.dataTransfer.effectAllowed = 'copy'; //none, copy, copyLink, copyMove, link, linkMove, move, all
    e.dataTransfer.setData('text/plain', this.item.desc.name);
    e.dataTransfer.setData('application/json', JSON.stringify(this.item.desc));
    var p = JSON.stringify(this.item.persist());
    e.dataTransfer.setData('application/caleydo-data-item', p);
    //encode the id in the mime type
    e.dataTransfer.setData('application/caleydo-data-item-' + p, p);
  }
}

function splitTables(items) {
  var r = [];
  items.forEach(function (entry) {
    if (entry.desc.type === 'table') {
      r.push.apply(r, entry.cols());
    }
  });
  return r;
}

function toType(desc) {
  if (desc.type === 'vector') {
    return desc.value.type === 'categorical' ? 'stratification' : 'numerical';
  }
  return desc.type;
}

export function convertToBlockbrowserItems(ditems):BlockbrowserItem[] {
  ditems = ditems.concat(splitTables(ditems));
  ditems = ditems.filter(function (d) {
    return d.desc.type !== 'table' && d.desc.type !== 'stratification';
  });
  var browserItems:BlockbrowserItem[] = [];
  ditems.forEach(function(item) {
    browserItems.push(new BlockbrowserItem(item.desc.name, toType(item.desc), item.idtypes.map(function (d) { return d.name; }), item.dim.join(' x '), item));
  });

  return browserItems;
}

