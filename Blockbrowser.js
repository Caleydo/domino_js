/**
 * Created by Tobias Appl on 7/29/2016.
 */
define(["require", "exports", 'jquery', 'd3'], function (require, exports, $, d3) {
    "use strict";
    var Blockbrowser = (function () {
        function Blockbrowser(parent) {
            this.elemTemplate = "\n    <table class=\"table table-striped table-hover table-condensed\">\n      <thead>\n        <tr>\n          <th>Name</th>\n          <th>Type</th>\n          <th>ID Types</th>\n          <th>Dim</th>\n        </tr>\n      </thead>\n      <tbody>\n\n      </tbody>\n    </table>\n  ";
            this.items = [];
            this.$node = d3.select(parent).html(this.elemTemplate);
            this.$node = this.$node.select('table');
            this.$content = this.$node.select('tbody');
        }
        Blockbrowser.prototype.addItem = function (item) {
            item.parentBrowser = this;
            this.items.push(item);
        };
        Blockbrowser.prototype.addItems = function (items) {
            var _this = this;
            items.forEach(function (item) {
                _this.addItem(item);
            });
        };
        Blockbrowser.prototype.render = function () {
            var data = this.$content.selectAll('tr').data(this.items);
            var dataenter = data.enter().append('tr');
            dataenter.each(function (ditem) {
                ditem.buildItemElement(this);
            })
                .attr('draggable', true)
                .on('dragstart', function (d) {
                d.onDragStart();
            });
            data.exit().remove();
        };
        return Blockbrowser;
    }());
    exports.Blockbrowser = Blockbrowser;
    var BlockbrowserItem = (function () {
        function BlockbrowserItem(name, type, idTypes, dimensions, item) {
            this.idTypes = [];
            this.name = name;
            this.type = type;
            this.idTypes = idTypes;
            this.dimensions = dimensions;
            this.item = item;
        }
        Object.defineProperty(BlockbrowserItem.prototype, "parentBrowser", {
            get: function () {
                return this._parentBrowser;
            },
            set: function (parentBrowser) {
                this._parentBrowser = parentBrowser;
            },
            enumerable: true,
            configurable: true
        });
        BlockbrowserItem.prototype.buildItemElement = function (itemNode) {
            $('<td>').appendTo(itemNode).text(this.name);
            $('<td>').appendTo(itemNode).text(this.type);
            $('<td>').appendTo(itemNode).text(this.idTypes.join(', '));
            $('<td>').appendTo(itemNode).text(this.dimensions);
        };
        BlockbrowserItem.prototype.onDragStart = function () {
            var e = d3.event;
            e.dataTransfer.effectAllowed = 'copy'; //none, copy, copyLink, copyMove, link, linkMove, move, all
            e.dataTransfer.setData('text/plain', this.item.desc.name);
            e.dataTransfer.setData('application/json', JSON.stringify(this.item.desc));
            var p = JSON.stringify(this.item.persist());
            e.dataTransfer.setData('application/caleydo-data-item', p);
            //encode the id in the mime type
            e.dataTransfer.setData('application/caleydo-data-item-' + p, p);
        };
        return BlockbrowserItem;
    }());
    exports.BlockbrowserItem = BlockbrowserItem;
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
            return desc.value.type === 'categorical' ? 'stratification' : 'numerical';
        }
        return desc.type;
    }
    function convertToBlockbrowserItems(ditems) {
        ditems = ditems.concat(splitTables(ditems));
        ditems = ditems.filter(function (d) {
            return d.desc.type !== 'table' && d.desc.type !== 'stratification';
        });
        var browserItems = [];
        ditems.forEach(function (item) {
            browserItems.push(new BlockbrowserItem(item.desc.name, toType(item.desc), item.idtypes.map(function (d) { return d.name; }), item.dim.join(' x '), item));
        });
        return browserItems;
    }
    exports.convertToBlockbrowserItems = convertToBlockbrowserItems;
});
//# sourceMappingURL=Blockbrowser.js.map