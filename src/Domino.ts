/**
 * Created by Tobias Appl on 7/29/2016.
 */

import {AView} from 'phovea_core/src/layout_view';
import {Rect} from 'phovea_core/src/geom';
import {list} from 'phovea_core/src/data';
import {Board} from './Board';
import {Blockbrowser, convertToBlockbrowserItems} from './Blockbrowser';


class Domino extends AView {
  private readonly board: Board;
  private readonly browser: Blockbrowser;
  private bounds = new Rect(0, 0, 0, 0);

  constructor() {
    super();

    this.board = new Board(document.getElementById('board'));
    //this.info = selectionInfo.create(document.getElementById('selectioninfo'));
    this.browser = new Blockbrowser(document.getElementById('blockbrowser'));

    document.addEventListener('keydown', this.board.digestKeyCode.bind(this.board));
  }

  getBounds() {
    return this.bounds;
  }

  setBounds(x: number, y: number, w: number, h: number) {
    this.bounds = new Rect(x, y, w, h);
  }

  get data() {
    return [];
  };

  get idtypes() {
    return [];
  }

  public execute(): void {
    list().then((items) => {
      const listItems = convertToBlockbrowserItems(items);
      this.browser.addItems(listItems);
      this.browser.render();
    });
  }
}

export function create() {
  return new Domino();
}
