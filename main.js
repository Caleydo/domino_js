/**
 * Created by Samuel Gratzl on 15.12.2014.
 */
require(['../caleydo/data', '../caleydo/vis', 'bootstrap'], function (data, visPlugins) {
  'use strict';
  var vis;

  data.create({
    type: 'genomeDataLink',
    name: 'GenomeBrowser',
    serveradress: 'http://localhost:5000/bam'
  }).then(function (genome) {
    var visses = visPlugins.list(genome);

    visses[0].load().then(function (plugin) {
      vis = plugin.factory(genome, document.getElementsByName('body')[0]);
    });
  });
});
