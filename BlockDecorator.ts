/**
 * Created by Tobias Appl on 8/11/2016.
 */

import d3 = require('d3');
import multiform = require('../caleydo_core/multiform');
import behavior = require('../caleydo_core/behavior');
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
  decoratedObject:IDecorableObject;
  decorateHeader(container:JQuery):void;
}

export class BlockDecorator implements IObjectDecorator {
  private style:string = 'display:block; width: 20px; height: 20px; margin-left: 5px; float:left; font-align:center; cursor: pointer;';

  private $header:d3.Selection<any>;
  public decoratedObject:IDecorableObject;

  public decorateHeader(container:JQuery):void {
    this.$header = d3.select(container[0]).append('div')
      .attr('class', 'toolbar')
      .attr('style', 'height: 10px;');

    multiform.addIconVisChooser(<Element>this.$header.node());
    this.$header.append('i').attr('class', 'fa fa-close')
      .on('click', ()=> {
        this.decoratedObject.destroy();
      })
      .attr('style', this.style)
      .text("X");
    this.$header.append('i').attr('class', 'fa fa-move')
      .on('mousedown', () => {
        var e = <MouseEvent> d3.event;
        e.preventDefault();
        this.decoratedObject.dragging = true;
      })
      .on('mouseup', () => {
        var e = <MouseEvent> d3.event;
        e.preventDefault();
        this.decoratedObject.dragging = false;
      })
      .attr('style', this.style + "cursor: move;")
      .text("M");
    this.$header.append('i').attr('class', 'fa fa-zoom-in')
      .on('click', () => {
        var e = <MouseEvent> d3.event;
        e.preventDefault();
        var amount = 1;
        this.decoratedObject.zoom.zoom(amount,amount);
      })
      .attr('style', this.style)
      .text('+');

    this.$header.append('i').attr('class', 'fa fa-zoom-out')
      .on('click', () => {
        var e = <MouseEvent> d3.event;
        e.preventDefault();
        var amount = -1;
        this.decoratedObject.zoom.zoom(amount,amount);
      })
      .attr('style', this.style)
      .text('-');
  }

}
