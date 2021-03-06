/**
 * Created by Samuel Gratzl on 16.12.2014.
 */
define(['exports', 'd3', '../caleydo_core/multiform', './block'], function (exports, d3, multiform, blocks) {
  "use strict";
  var $toolbar = d3.select('#block-toolbar');
  var manager = blocks.manager;

  function rebuildBlockToolBar(blocks) {
    var $vistoolbar = $toolbar.select('#block-vis-toolbar').datum(blocks);
    var visses = multiform.toAvailableVisses(blocks.map(function (b) {
      return b.vis;
    }));
    var $visses = $vistoolbar.selectAll('button').data(visses);
    $visses.enter().append('button').attr('type', 'button').attr('class', 'btn btn-default').on('click', function (vis) {
      var l = $vistoolbar.data()[0];
      l.forEach(function (b) { //avoid closure in case of reusing
        //CLUE CMD
        b.vis.switchTo(vis);
      });
      $visses.classed('active', function (d) { return d === vis; });
    }).append('i');
    $visses.exit().remove();
    $visses.select('i').attr('class', null).text('').attr('style', null).each(function (d) {
      d.iconify(this);
    });
    var active = null;
    if (blocks.length === 1) {
      active = blocks[0].vis.actDesc;
    } else if (blocks.length > 1) {
      active = blocks[0].vis.actDesc;
      blocks.forEach(function (b) {
        if (b.vis.actDesc !== active) {
          active = null;
        }
      });
    }
    $visses.classed('active', function (d) { return d === active; });

    if (blocks.length === 1) {

    } else {

    }

    //enable remove button
    d3.select('#block-toolbar').style('visibility', blocks.length > 0 ? null : 'hidden');
  }
  function selectionListener() {
    rebuildBlockToolBar(manager.selectedObjects());
  }
  d3.select('#block-remove').on('click', function () {
    //temporarly disable if we have multiple ones
    manager.off('select-selected', selectionListener);
    manager.selectedObjects().forEach(function (b) {
      //CLUE CMD
      b.destroy();
    });
    rebuildBlockToolBar([]);
    manager.on('select-selected', selectionListener);
  });
  manager.on('select-selected', selectionListener);

  d3.select('#block-sort').on('click', function () {
    manager.selectedObjects().forEach(function (b) {
      //CLUE CMD
      b.sort(0, 'next');
    });
  });
  manager.on('select-selected', selectionListener);


  (function () {
    var $buttons = d3.selectAll('#mode-toolbar button');
    $buttons.on('click', function () {
      var $this = d3.select(this);
      var m = $this.attr('data-mode');
      d3.select('#board').attr('class', 'mode-' + m);
      //CLUE CMD
      blocks.switchMode(m);
      $buttons.classed('active', function (d) {
        return d3.select(this).attr('data-mode') === blocks.mode();
      });
    });
  })();
});
