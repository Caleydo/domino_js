/**
 * Created by Samuel Gratzl on 16.12.2014.
 */
define(['exports', 'd3', '../caleydo/multiform', './block'], function (exports, d3, multiform, blocks) {
  "use strict";
  var $toolbar = d3.select('#block-toolbar');
  var manager = blocks.manager;

  function rebuildBlockToolBar(blocks) {
    //wrap as array for d3
    var $vistoolbar = $toolbar.select('#block-vis-toolbar').data([blocks]);
    var visses = multiform.toAvailableVisses(blocks.map(function (b) {
      return b.vis;
    }));
    var $visses = $vistoolbar.selectAll('button').data(visses);
    $visses.enter().append('button').attr('type', 'button').attr('class', 'btn btn-default').on('click', function (vis) {
      var l = $vistoolbar.data()[0];
      l.forEach(function (b) { //avoid closure in case of reusing
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

    //enable remove button
    d3.select('#block-remove').attr('disabled', blocks.length > 0 ? null : 'disabled');
  }
  function selectionListener() {
    rebuildBlockToolBar(manager.selectedObjects());
  }
  d3.select('#block-remove').on('click', function () {
    //temporarly disable if we have multiple ones
    manager.off('select-selected', selectionListener);
    manager.selectedObjects().forEach(function (b) {
      b.destroy();
    });
    rebuildBlockToolBar([]);
    manager.on('select-selected', selectionListener);
  });

  manager.on('select-selected', selectionListener);
});
