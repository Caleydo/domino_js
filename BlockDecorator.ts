/**
 * Created by Tobias Appl on 8/11/2016.
 */

import d3 = require('d3');
import multiform = require('../caleydo_core/multiform');

/**
 * This interface is used to make classes decorable by the BlockDecorator
 */
export interface IDecorableObject {
  $node;
  pos:[number, number];

  switchStickToMousePosition():void;
  rotateBy(degree:number):void;
  destroy();
}

export interface IObjectDecorator {
  decoratedObject:IDecorableObject;
  decorateHeader():void;
}

export class BlockDecorator implements IObjectDecorator {
  private $header:d3.Selection<any>;
  public decoratedObject:IDecorableObject;

  public decorateHeader():void {
    this.$header = d3.select(this.decoratedObject.$node[0]).append('div').attr('class', 'toolbar');
    multiform.addIconVisChooser(<Element>this.$header.node());
    this.$header.append('i').attr('class', 'fa fa-close')
      .on('click', ()=> {
        this.decoratedObject.destroy();
      })
      .attr('style', 'cursor: pointer;')
      .text("X");
    this.$header.append('i').attr('class', 'fa fa-move')
      .on('mousedown', (event:MouseEvent)=> {
        event.preventDefault();
        this.decoratedObject.switchStickToMousePosition();
      })
      .on('mouseup', (event:MouseEvent)=> {
        event.preventDefault();
        this.decoratedObject.switchStickToMousePosition();
      })
      .attr('style', 'margin-left: 5px; cursor: move;')
      .text("M");
  }

}
