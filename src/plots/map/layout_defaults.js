'use strict';

var Lib = require('../../lib');

var handleSubplotDefaults = require('../subplot_defaults');
var handleArrayContainerDefaults = require('../array_container_defaults');
var layoutAttributes = require('./layout_attributes');


module.exports = function supplyLayoutDefaults(layoutIn, layoutOut, fullData) {
    handleSubplotDefaults(layoutIn, layoutOut, fullData, {
        type: 'map',
        attributes: layoutAttributes,
        handleDefaults: handleDefaults,
        partition: 'y',
        fullData
    });
};

function handleDefaults(containerIn, containerOut, coerce, opts) {
    var [{ lon, lat }] = opts.fullData;
    var { minLon, maxLon } = getMinBoundLon(lon);
    var { minLat, maxLat } = getMinBoundLat(lat);
    coerce('style');
    coerce('bearing');
    coerce('pitch');

    // this is for zooming on bounds, this is called bounds in the maplibre ctor
    coerce('fitBounds.west', minLon);
    coerce('fitBounds.east', maxLon);
    coerce('fitBounds.south', minLat);
    coerce('fitBounds.north', maxLat);

    //bounds is really for setting maxBounds
    var west = coerce('bounds.west');
    var east = coerce('bounds.east');
    var south = coerce('bounds.south');
    var north = coerce('bounds.north');
    if(
        west === undefined ||
        east === undefined ||
        south === undefined ||
        north === undefined
    ) {
        delete containerOut.bounds;
    }

    handleArrayContainerDefaults(containerIn, containerOut, {
        name: 'layers',
        handleItemDefaults: handleLayerDefaults
    });

    // copy ref to input container to update 'center' and 'zoom' on map move
    containerOut._input = containerIn;
}

function getMinBoundLon(lon) {
    if (!lon.length) return { minLon: 0, maxLon: 0 };

    // normalize to [0, 360)
    const norm = lon.map(l => ((l % 360) + 360) % 360).sort((a, b) => a - b);

    let maxGap = -1;
    let gapIndex = 0;

    for (let i = 0; i < norm.length; i++) {
        const curr = norm[i];
        const next = norm[(i + 1) % norm.length];
        const gap = (next - curr + 360) % 360;

        if (gap > maxGap) {
            maxGap = gap;
            gapIndex = i;
        }
    }

    // smallest arc is outside the largest gap
    let minLon = norm[(gapIndex + 1) % norm.length];
    let maxLon = norm[gapIndex];

    // convert back to [-180, 180]
    if (minLon > 180) minLon -= 360;
    if (maxLon > 180) maxLon -= 360;

    return { minLon, maxLon };
}

function getMinBoundLat(lat) {
    return {
        minLat: Math.min(...lat),
        maxLat: Math.max(...lat)
    };
}

function handleLayerDefaults(layerIn, layerOut) {
    function coerce(attr, dflt) {
        return Lib.coerce(layerIn, layerOut, layoutAttributes.layers, attr, dflt);
    }

    var visible = coerce('visible');
    if(visible) {
        var sourceType = coerce('sourcetype');
        var mustBeRasterLayer = sourceType === 'raster' || sourceType === 'image';

        coerce('source');
        coerce('sourceattribution');

        if(sourceType === 'vector') {
            coerce('sourcelayer');
        }

        if(sourceType === 'image') {
            coerce('coordinates');
        }

        var typeDflt;
        if(mustBeRasterLayer) typeDflt = 'raster';

        var type = coerce('type', typeDflt);

        if(mustBeRasterLayer && type !== 'raster') {
            type = layerOut.type = 'raster';
            Lib.log('Source types *raster* and *image* must drawn *raster* layer type.');
        }

        coerce('below');
        coerce('color');
        coerce('opacity');
        coerce('minzoom');
        coerce('maxzoom');

        if(type === 'circle') {
            coerce('circle.radius');
        }

        if(type === 'line') {
            coerce('line.width');
            coerce('line.dash');
        }

        if(type === 'fill') {
            coerce('fill.outlinecolor');
        }

        if(type === 'symbol') {
            coerce('symbol.icon');
            coerce('symbol.iconsize');

            coerce('symbol.text');
            Lib.coerceFont(coerce, 'symbol.textfont', undefined, {
                noFontVariant: true,
                noFontShadow: true,
                noFontLineposition: true,
                noFontTextcase: true,
            });
            coerce('symbol.textposition');
            coerce('symbol.placement');
        }
    }
}
