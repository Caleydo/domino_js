/* Created by Tobias Appl on 7/29/2016. */

import d3 = require('d3');
import wrapper = require('../caleydo_core/wrapper');
import idtypes = require('../caleydo_core/idtype');
import links = require('../caleydo_d3/link');
import blocks = require('./Block');

export class Board {
  private _currentlyDragged:blocks.Block;

  public get currentlyDragged():blocks.Block  {
    return this._currentlyDragged;
  }

  public set currentlyDragged(block:blocks.Block) {
    this._currentlyDragged = block;
  }
}
