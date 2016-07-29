/**
 * Created by Tobias Appl on 7/29/2016.
 */

import data = require('../caleydo_core/data');
import d3 = require('d3');
import $ = require('jquery');
import events = require('../caleydo_core/event');
import selectionInfo = require('../caleydo_d3/selectioninfo');
import boards = require('./Board');


class Domino {


  constructor(parent: Element) {

  }
}

export function create(parent: Element) {
    return new Domino(parent);
}
