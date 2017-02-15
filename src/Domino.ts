/**
 * Created by Tobias Appl on 7/29/2016.
 */

import {list} from 'phovea_core/src/data';
import {Board} from './Board';
import {Blockbrowser, convertToBlockbrowserItems} from './Blockbrowser';
import {create as createHeader, AppHeader, AppHeaderLink} from 'phovea_ui/src/header';


class Domino {
  private readonly board: Board;
  private readonly browser: Blockbrowser;
  private readonly header: AppHeader;

  constructor() {
    this.header = createHeader(document.body, {
      appLink: new AppHeaderLink('Domino')
    });
    this.board = new Board(document.getElementById('board'));
    this.browser = new Blockbrowser(document.getElementById('blockbrowser'));
    document.addEventListener('keydown', this.board.digestKeyCode.bind(this.board));
  }


  async execute() {
    this.header.wait();
    const items = await list();
    const listItems = convertToBlockbrowserItems(items);
    this.browser.addItems(listItems);
    this.browser.render();
    this.header.ready();
  }
}

export function create() {
  return new Domino();
}
