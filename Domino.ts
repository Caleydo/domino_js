/**
 * Created by Tobias Appl on 7/29/2016.
 */

import views = require('../caleydo_core/layout_view');
import data = require('../caleydo_core/data');
import d3 = require('d3');
import $ = require('jquery');
import events = require('../caleydo_core/event');
import range = require('../caleydo_core/range');
import selectionInfo = require('../caleydo_d3/selectioninfo');
import boards = require('./Board');
import blockbrowser = require('./Blockbrowser');
import blocks = require('./Block');

class Domino extends views.AView {
  private board:boards.Board;
  private browser:blockbrowser.Blockbrowser;
  private info:selectionInfo.SelectionInfo;

  constructor() {
    super();
    $(document).keydown((e:KeyboardEvent) => {this.digestKeyCode(e)});

    this.board = new boards.Board(document.getElementById('board'));
    this.info = selectionInfo.create(document.getElementById('selectioninfo'));
    this.browser = new blockbrowser.Blockbrowser(document.getElementById('blockbrowser'));

  }

  public execute():void {
    data.list().then((items) => {
      var listItems:blockbrowser.BlockbrowserItem[] = blockbrowser.convertToBlockbrowserItems(items);
      this.browser.addItems(listItems);
      this.browser.render();
    });
  }

  private digestKeyCode(e:KeyboardEvent) {
    function moveSelectedBlock(x, y) {
      var selected_blocks:range.Range = blocks.manager.selections();
      selected_blocks.dim(0).asList().forEach((id) => {
        var block:blocks.Block = blocks.manager.byId(id);
        block.moveBy(x, y);
      });
    };

    switch(e.which) {
      case 37: // left
        moveSelectedBlock(-5,  0);
        break;
      case 38: // up
        moveSelectedBlock(0, -5);
        break;
      case 39: // right
        moveSelectedBlock(5,  0);
        break;
      case 40: // down
        moveSelectedBlock(0, 5);
        break;
      default:
        return; // exit this handler for other keys
    }
    e.preventDefault(); // prevent the default action (scroll / move caret)
  }

}

export function create() {
    return new Domino();
}
