/**
 * Created by Samuel Gratzl on 16.12.2014.
 */
define(['exports', 'd3', './block'], function (exports, d3, blocks) {
  "use strict";
  exports.createLayer = function (parent) {
    var $div = d3.select(parent).append('div');

    function update() {

    }

    function added() {

    }

    function removed() {

    }

    blocks.manager.on('add', added);
    blocks.manager.on('remove', removed);
    blocks.manager.on('select-selected', update);

    return $div;
  };
});
