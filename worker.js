var VectorTile = require('vector-tile').VectorTile;
var Pbf = require('pbf');
var request = require('request');
var turf = require('turf');
var queue = require('queue-async');
var gm = require('gm');
var fs = require('fs');

process.on('message', function(data) {
  var mapOperation = require(data.opts.map);
  data.tiles.forEach(function(tile){
    var layerCollection = {};
    var q = queue(4);
    data.opts.tileLayers.forEach(function(tileLayer){
      q.defer(getVectorTile, tile, tileLayer);
    });
    q.awaitAll(function(err, res){
      if(res[0]){
        mapOperation(tile, function(err, message){
          process.send(message);
        });
      } else {
        process.send(0);
      }
    });
  });
});

function getVectorTile(tile, tileLayer, done){
  var layers = {
    name:tileLayer.name,
    layers:tileLayer.layers
  };

  var xTile;

  var url = tileLayer.url.split('{x}').join(tile[0]);
  url = url.split('{y}').join(tile[1]);
  url = url.split('{z}').join(tile[2]);

  var requestOpts = {
    url: url,
    gzip: true,
    encoding: 'binary'
  };

  request(requestOpts, function(error, res, body) {
    if (res.statusCode == 200) {
      var filename = tile[0] + '_' + tile[1] + '.png';
      fs.writeFile(filename, body, 'binary', function (err) {
        if (!err) {
          gm(filename).identify(function(err, value) {
            if (value.Type == 'grayscale' && value['Channel Statistics'].Gray.Mean != '32.10 (0.1259)') {
              xTile = tile;
            }
            fs.unlink(filename, function(err) {
              if (!err) done(null, xTile);
            });
          });
        }
      });
    }
  });
}