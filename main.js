/**
 * Created by Samuel Gratzl on 15.12.2014.
 */
require(['../caleydo/data', 'd3', '../caleydo/event', '../caleydo-selectioninfo/main', './block', 'bootstrap'], function (data, d3, events, selectionInfo, blocks) {
  'use strict';
  selectionInfo.create(document.getElementById('selectioninfo'));
  selectionInfo.createFor(blocks.manager, document.getElementById('selectioninfo'));
  var content = document.getElementById('board');
  var b = [];

  function splitTables(items) {
    var r = [];
    items.forEach(function (entry) {
      if (entry.desc.type === 'table') {
        r.push.apply(r, entry.cols());
      }
    });
    return r;
  }

  function toType(desc) {
    if (desc.type === 'vector') {
      return desc.value.type === 'categorical' ? 'partition' : 'numerical';
    }
    return desc.type;
  }

  data.list().then(function (items) {
    items = items.concat(splitTables(items));
    items = items.filter(function (d) {
      return d.desc.type !== 'table';
    });
    var $base = d3.select('#blockbrowser table tbody');
    var $rows = $base.selectAll('tr').data(items);
    $rows.enter().append('tr').html(function (d) {
      return '<th>' + d.desc.name + '</th><td>' + toType(d.desc) + '</td><td>' + d.dim.join(' x ') + '</td>';
    }).on('click', function (dataset) {
      b.push(blocks.create(dataset, content));
    });
  });
});
