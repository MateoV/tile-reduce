var VectorTile = require('vector-tile').VectorTile;
var Pbf = require('pbf');
var request = require('request');
var turf = require('turf');
var queue = require('queue-async');

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
          //console.log(message);
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
    encoding: null,
    method: 'HEAD'
  };
  request(requestOpts, function(err, res, body) {
    //console.log(res.statusCode);
    if (res.statusCode == 200) {
      //console.log(parseInt(res.headers['content-length']));
      if (parseInt(res.headers['content-length']) == 2125) {
        xTile = tile;
      }
    }

    done(null, xTile);
  });
}