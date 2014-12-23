/**
 * Created by Samuel Gratzl on 15.12.2014.
 */
require(['../caleydo/data', 'd3', '../caleydo/event', '../caleydo-selectioninfo/main', './block', '../caleydo/idtype', '../caleydo-links/link', './toolbar', 'bootstrap', 'font-awesome'], function (data, d3, events, selectionInfo, blocks, idtypes, links) {
  'use strict';
  selectionInfo.create(document.getElementById('selectioninfo'));
  var content = document.getElementById('board');

  var c = new links.LinkContainer(content, ['change', 'transform', 'change.pos', 'change.range', 'zoom']);
  blocks.manager.on('add', function (event, id, block) {
    c.push(block);
  });
  blocks.manager.on('remove', function (event, id, block) {
    c.remove(block);
  });
  d3.select(c.node).classed('selection-clearer', true).on('click', function () {
    blocks.manager.clear();
    idtypes.clearSelection();
  });

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
      return '<td><button class="btn btn-link"><i class="fa fa-plus-circle"></i></button></td><th>' + d.desc.name + '</th><td>' + toType(d.desc) + '</td><td>' +
        d.idtypes.map(function (d) { return d.name; }).join(', ') + '</td><td>' + d.dim.join(' x ') + '</td>';
    }).select('button').on('click', function (dataset) {
      blocks.create(dataset, content);
    });
  });
});
