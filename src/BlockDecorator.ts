/**
 * Created by Tobias Appl on 8/11/2016.
 */

import * as d3 from 'd3';
import * as multiform from 'phovea_core/src/multiform';
import * as behavior from 'phovea_core/src/behavior';
/**
 * This interface is used to make classes decorable by the BlockDecorator
 */
export interface IDecorableObject {
  $node;
  pos:[number, number];
  dragging:boolean;
  zoom:behavior.ZoomLogic;

  rotateBy(degree:number):void;
  destroy();
}

export interface IObjectDecorator {
  $header:d3.Selection<any>;
  decoratedObject:IDecorableObject;
  decorateHeader(container:JQuery):void;
}

export class BlockDecorator implements IObjectDecorator {
  public $header:d3.Selection<any>;
  public decoratedObject:IDecorableObject;

  public decorateHeader(container:JQuery):void {
    this.$header = d3.select(container[0]).append('div')
      .attr('class', 'toolbar');

    multiform.addIconVisChooser(<Element>this.$header.node());
    this.$header.append('i').attr('class', 'fa fa-close')
      .on('click', ()=> {
        this.decoratedObject.destroy();
      });
    this.$header.append('i').attr('class', 'fa fa-arrows')
      .on('mousedown', () => {
        var e = <MouseEvent> d3.event;
        e.preventDefault();
        this.decoratedObject.dragging = true;
      })
      .on('mouseup', () => {
        var e = <MouseEvent> d3.event;
        e.preventDefault();
        this.decoratedObject.dragging = false;
      });
    this.$header.append('i').attr('class', 'fa fa-plus-square')
      .on('click', () => {
        var e = <MouseEvent> d3.event;
        e.preventDefault();
        var amount = 1;
        this.decoratedObject.zoom.zoom(amount,amount);
      });

    this.$header.append('i').attr('class', 'fa fa-minus-square')
      .on('click', () => {
        var e = <MouseEvent> d3.event;
        e.preventDefault();
        var amount = -1;
        this.decoratedObject.zoom.zoom(amount,amount);
      });
  }

}
