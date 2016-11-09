/**
 * Created by Tobias Appl on 7/29/2016.
 */

import * as views from 'phovea_core/src/layout_view';
import * as data from 'phovea_core/src/data';
import * as $ from 'jquery';
import * as boards from './Board';
import * as blockBrowser from './Blockbrowser';

class Domino extends views.AView {
  private board:boards.Board;
  private browser:blockBrowser.Blockbrowser;
  //private info:selectionInfo.SelectionInfo;

  constructor() {
    super();

    this.board = new boards.Board(document.getElementById('board'));
    //this.info = selectionInfo.create(document.getElementById('selectioninfo'));
    this.browser = new blockBrowser.Blockbrowser(document.getElementById('blockbrowser'));

    $(document).keydown((e:KeyboardEvent) => { this.board.digestKeyCode(e); });
  }

  public execute():void {
    data.list().then((items) => {
      var listItems:blockBrowser.BlockbrowserItem[] = blockBrowser.convertToBlockbrowserItems(items);
      this.browser.addItems(listItems);
      this.browser.render();
    });
  }
}

export function create() {
    return new Domino();
}
