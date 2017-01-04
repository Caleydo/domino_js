/**
 * Created by Tobias Appl on 8/11/2016.
 */

import {select, Selection, event as d3event} from 'd3';
import {} from 'phovea_core/src/multiform';
import {ZoomLogic} from 'phovea_core/src/behavior';
/**
 * This interface is used to make classes decorable by the BlockDecorator
 */
export interface IDecorableObject {
  readonly $node: JQuery;
  pos: [number, number];
  dragging: boolean;
  readonly zoom: ZoomLogic;

  rotateBy(degree: number): void;
  destroy();
}

export interface IObjectDecorator {
  readonly $header: Selection<any>;
  decoratedObject: IDecorableObject;
  decorateHeader(container: JQuery): void;
}

export class BlockDecorator implements IObjectDecorator {
  $header: Selection<any>;
  decoratedObject: IDecorableObject;

  public decorateHeader(container: JQuery): void {
    this.$header = select(container[0]).append('div')
      .attr('class', 'toolbar');

    //addIconVisChooser(<Element>this.$header.node());
    this.$header.append('i').attr('class', 'fa fa-close')
      .on('click', () => {
        this.decoratedObject.destroy();
      });
    this.$header.append('i').attr('class', 'fa fa-arrows')
      .on('mousedown', () => {
        const e = <MouseEvent> d3event;
        e.preventDefault();
        this.decoratedObject.dragging = true;
      })
      .on('mouseup', () => {
        const e = <MouseEvent> d3event;
        e.preventDefault();
        this.decoratedObject.dragging = false;
      });
    this.$header.append('i').attr('class', 'fa fa-plus-square')
      .on('click', () => {
        const e = <MouseEvent> d3event;
        e.preventDefault();
        const amount = 1;
        this.decoratedObject.zoom.zoom(amount, amount);
      });

    this.$header.append('i').attr('class', 'fa fa-minus-square')
      .on('click', () => {
        const e = <MouseEvent> d3event;
        e.preventDefault();
        const amount = -1;
        this.decoratedObject.zoom.zoom(amount, amount);
      });
  }

}
