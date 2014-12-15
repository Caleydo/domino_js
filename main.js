/**
 * Created by Samuel Gratzl on 15.12.2014.
 */
require(['../caleydo/data', 'd3', '../caleydo/event', '../caleydo-selectioninfo/main', '../caleydo-window/main', '../caleydo/vis', 'bootstrap'], function (data, d3, events, selectionInfo, windows, vis) {
  'use strict';
  selectionInfo.create(document.getElementById('selectioninfo'));
  var content = document.getElementById('board');

  data.list().then(function (items) {
    var $base = d3.select('#blockbrowser table tbody');
    var $rows = $base.selectAll('tr').data(items);
    $rows.enter().append('tr').html(function (d) {
      return '<th>' + d.desc.name + '</th><td>' + d.desc.type + '</td><td>' + d.dim.join(' x ') + '</td>';
    }).on('click', function (dataset) {
      var visses = vis.list(dataset);
      var w = windows.createVisWindow(content);
      visses[0].load().then(function (plugin) {
        w.attachVis(plugin.factory(dataset, w.node), plugin);
      });
    });
  });
});
