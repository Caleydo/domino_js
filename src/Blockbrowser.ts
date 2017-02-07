/**
 * Created by Tobias Appl on 7/29/2016.
 */

import {Selection, select, event as d3event} from 'd3';
import {IDataType, VALUE_TYPE_CATEGORICAL, IDataDescription} from 'phovea_core/src/datatype';
import {ITable} from 'phovea_core/src/table';
import {IVectorDataDescription} from 'phovea_core/src/vector';

export class Blockbrowser {
  static readonly TEMPLATE = `
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

  private items: BlockbrowserItem[] = [];
  private $node: Selection<any>;
  private $content: Selection<any>;

  constructor(parent: HTMLElement) {
    this.$node = select(parent).html(Blockbrowser.TEMPLATE);
    this.$node = this.$node.select('table');
    this.$content = this.$node.select('tbody');
  }

  public addItem(item: BlockbrowserItem) {
    item.parentBrowser = this;
    this.items.push(item);
  }

  public addItems(items: BlockbrowserItem[]) {
    items.forEach((item) => {
      this.addItem(item);
    });
  }

  public render() {
    const data = this.$content.selectAll('tr').data(this.items);
    const dataenter = data.enter().append('tr');
    dataenter.each(function (ditem: BlockbrowserItem) {
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
  parentBrowser: Blockbrowser;
  //private $node:d3.Selection<any>;

  constructor(private readonly name: string, private readonly type: string, private readonly idTypes: string[], private readonly dimensions: string, private item: IDataType) {
    this.item = item;
  }

  public buildItemElement(itemNode: HTMLElement) {
    itemNode.innerHTML = `<td>${this.name}</td><td>${this.type}</td><td>${this.idTypes.join(', ')}</td><td>${this.dimensions}</td>`;
  }

  public onDragStart() {
    const e = <DragEvent> d3event;
    e.dataTransfer.effectAllowed = 'copy'; //none, copy, copyLink, copyMove, link, linkMove, move, all
    e.dataTransfer.setData('text/plain', this.item.desc.name);
    e.dataTransfer.setData('application/json', JSON.stringify(this.item.desc));
    const p = JSON.stringify(this.item.persist());
    e.dataTransfer.setData('application/phovea-data-item', p);
    //encode the id in the mime type
    e.dataTransfer.setData('application/phovea-data-item-' + p, p);
  }
}

function splitTables(items: IDataType[]) {
  const r = [];
  items.forEach((entry) => {
    if (entry.desc.type === 'table') {
      r.push(...(<ITable>entry).cols());
    }
  });
  return r;
}

function toType(desc: IDataDescription) {
  if (desc.type === 'vector') {
    return (<IVectorDataDescription<any>>desc).value.type === VALUE_TYPE_CATEGORICAL ? 'stratification' : 'numerical';
  }
  return desc.type;
}

export function convertToBlockbrowserItems(ditems: IDataType[]): BlockbrowserItem[] {
  ditems = ditems.concat(splitTables(ditems));
  ditems = ditems.filter((d) => d.desc.type !== 'table' && d.desc.type !== 'stratification');
  return ditems.map((item) => new BlockbrowserItem(item.desc.name, toType(item.desc), item.idtypes.map((d) => d.name), item.dim.join(' x '), item));
}

