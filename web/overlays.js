// Provides overlay for the source image being pointed at
// Override juxtaCallback for custom behaviour or override createHeader & createFooter
// for smaller tweaks to default behaviour

function createOverlay(juxtaProperties, dragon) {
    // TODO: Switch getElementById to class under a given div
    this.jprops = juxtaProperties;
    this.dragonbox = document.getElementById('zoom-display');
    this.juxta_infobox = document.getElementById('juxta_infobox');
    this.juxta_header = document.getElementById('juxta_header');
    this.juxta_footer = document.getElementById('juxta_footer');
    this.imagePoint = 0;
    this.myDragon = dragon;

    this.metaCacheMax = 10;
    this.metaCache = [];

    // Connect overlay handling to the dragon
    if (myDragon.isOpen()) {
        attachToOpenDragon(juxtaProperties, myDragon);
    } else {
        myDragon.addHandler('open', function() {
            attachToOpenDragon(juxtaProperties, myDragon);
        });
    }

    // If metadata is preloaded, add it to the cache
    if (typeof preloaded !== 'undefined') {
        var preloadEntry = {
            status: 'ready',
            source: '0_0.json',
            meta: preloaded.meta,
            prefix: preloaded.prefix,
            postfix: preloaded.postfix
        }
        metaCache.push(preloadEntry);
    }

    // Expects the dragon to be open
    this.attachToOpenDragon = function() {
        var tracker = new OpenSeadragon.MouseTracker({
            element: myDragon.container,
            moveHandler: focusChanged
        });
        myDragon.addHandler('animation', handleChange);
        myDragon.addHandler('canvas-drag', focusChanged);
        myDragon.addHandler('canvas-click', focusChanged);
        tracker.setTracking(true);  
    }

    this.rawToWeb = function(rawX, rawY) {
        var ip = new OpenSeadragon.Point(rawX * jprops.rawW * jprops.tileSize, rawY * jprops.rawH * jprops.tileSize);
        var wp = myDragon.viewport.imageToViewportCoordinates(ip);
        var rwp = myDragon.viewport.pixelFromPoint(wp);
        return rwp;
    }

    this.currentImageGridX = function() {
        return Math.floor(imagePoint.x / jprops.tileSize / jprops.rawW);
    }
    this.currentImageGridY = function() {
        return Math.floor(imagePoint.y / jprops.tileSize / jprops.rawH);
    }
    
    this.handleChange = function() {
        var rawX = currentImageGridX();
        var rawY = currentImageGridY();
        roundWebPoint = rawToWeb(rawX, rawY);
        roundWebBRPoint = rawToWeb(rawX+1, rawY+1);
        roundWebBRPoint.x = roundWebBRPoint.x-1;
        roundWebBRPoint.y = roundWebBRPoint.y-1;
        var zoom = myDragon.viewport.getZoom(true);
        juxtaExpand(rawX, rawY,
                    Math.floor(roundWebPoint.x), Math.floor(roundWebPoint.y),
                    Math.floor(roundWebBRPoint.x-roundWebPoint.x), Math.floor(roundWebBRPoint.y-roundWebPoint.y));
    }                      

    // https://openseadragon.github.io/examples/viewport-coordinates/
    this.focusChanged = function(event) {
        webPoint = event.position;
        viewportPoint = myDragon.viewport.pointFromPixel(webPoint);
        imagePoint = myDragon.viewport.viewportToImageCoordinates(viewportPoint);
        handleChange();
    }

    this.createJuxtaHeader = function(x, y, image, meta) {
        return image == "" ? '(' + x + ', ' + y + ')' : image;
    }
    this.createJuxtaFooter = function(x, y, image, meta) {
        return meta;
    }

    this.showFullInfo = function(boxWidth, boxHeight) {
        return boxWidth >= 150;
    }
    this.showInfoBox = function(x, y, boxX, boxY, boxWidth, boxHeight, validPos, image, meta) {
        return validPos && "missing" != image;
    }
    this.showJuxtaFooter = function(x, y, image, meta) {
        // No longer valid
        //return (typeof(juxtaMeta) != 'undefined');
        return meta != "";
    }

    this.beforeCallback = function(x, y, boxX, boxY, boxWidth, boxHeight, validPos, image, meta) { }
    this.afterCallback = function(x, y, boxX, boxY, boxWidth, boxHeight, validPos, image, meta) { }

    // Called on mouse-move outside of a valid image
    this.juxtaCallbackNotValid = function() { }

    // Called when the mouse is moved over a valid image
    this.juxtaCallback = function(x, y, boxX, boxY, boxWidth, boxHeight, validPos, image, meta) {
        beforeCallback(x, y, boxX, boxY, boxWidth, boxHeight, validPos, image, meta);
        var sf = showJuxtaFooter(x, y, image, meta);
        if (showInfoBox(x, y, boxX, boxY, boxWidth, boxHeight, validPos, image, meta)) {
            juxta_infobox.style.visibility='visible';

            juxta_infobox.style.left = boxX + 'px';
            juxta_infobox.style.top = boxY + 'px';
            juxta_infobox.style.width = boxWidth + 'px';
            juxta_infobox.style.height = boxHeight + 'px';

            juxta_header.style.width = (boxWidth-16) + 'px';
            juxta_header.style.height = '1em';
            juxta_header.innerHTML= createJuxtaHeader(x, y, image, meta);
            juxta_header.style.left = boxX + 'px';
            juxta_header.style.top = (boxY-juxta_header.clientHeight) + 'px';

            juxta_footer.style.left = boxX + 'px';
            juxta_footer.style.top = (boxY+boxHeight) + 'px';
            juxta_footer.style.width = (boxWidth-32) + 'px';
            juxta_footer.innerHTML = createJuxtaFooter(x, y, image, meta);
            if (sf) {
                juxta_infobox.style.borderBottom = 'none';
                juxta_infobox.borderBottomLeftRadius = '0';
                juxta_infobox.borderBottomRightRadius = '0';
            } else {
                juxta_footer.style.visibility = 'hidden';
                juxta_infobox.style.borderBottom = '3px solid red';
                juxta_infobox.borderBottomLeftRadius = '10px';
                juxta_infobox.borderBottomRightRadius = '10px';
            }
            if ( !showFullInfo(boxWidth, boxHeight) ) {
                //      juxta_header.style.pointerEvents = 'none';
                juxta_header.style.visibility = 'hidden';
                juxta_footer.style.visibility = 'hidden';
                juxta_infobox.style.borderTop = '3px solid red';
                juxta_infobox.style.borderBottom = '3px solid red';
            } else {
                //      juxta_header.style.pointerEvents = 'auto';
                juxta_header.style.visibility = 'visible';
                if (sf) {
                    juxta_footer.style.visibility = 'visible';
                }      
                juxta_infobox.style.borderTop = 'none';
                if (sf) {  
                    juxta_infobox.style.borderBottom = 'none';
                }  
            }
        } else {
            juxta_infobox.style.visibility='hidden';
            juxta_header.style.visibility='hidden';
            juxta_footer.style.visibility='hidden';
        }
        afterCallback(x, y, boxX, boxY, boxWidth, boxHeight, validPos, image, meta);
    };

    this.result = {
        fired: true,
        x: 0, y: 0,
        boxX: 0, boxY: 0,
        boxWidth: 0, boxHeight: 0,
        validPos: true,
        image: '',
        meta: ''
    };
    this.fireResult = function(){
        if (result.fired) {
            return;
        }
        result.fired = true;
        juxtaCallback(result.x, result.y, result.boxX, result.boxY, result.boxWidth, result.boxHeight,
                      result.validPos, result.image, result.meta);
    }

    // Returns false if a new request must be started
    this.tryFire = function() {
        if (result.fired) {
            return true
        }
        var metaSource = Math.floor(result.x/jprops.asyncMetaSide) + '_' + Math.floor(result.y/jprops.asyncMetaSide) + '.json';
        var arrayLength = metaCache.length;

        // Determine the width of the async box (might be on the right edge)
        var aSide = jprops.asyncMetaSide;
        var fullHASyncs = Math.floor(jprops.colCount/jprops.asyncMetaSide);
        if ( jprops.colCount%jprops.asyncMetaSide != 0 && result.x >= fullHASyncs*jprops.asyncMetaSide ) { // On the edge
            aSide = jprops.colCount-fullHASyncs*jprops.asyncMetaSide;
        }
        var origoX=result.x%jprops.asyncMetaSide;
        var origoY=result.y%jprops.asyncMetaSide;
        for (var i = 0; i < arrayLength; i++) {
            if (metaCache[i].source == metaSource) {
                if (metaCache[i].status == 'ready') {
                    var index = origoY*aSide +origoX;
                    var full = metaCache[i].meta[index];
                    if (jprops.metaIncludesOrigin) {
                        // TODO: Move pre- and post-fix to the json metadata files
                        result.image = metaCache[i].prefix + full.split('|')[0] + metaCache[i].postfix;
                        // TODO: Create a better splitter that handles multiple |
                        result.meta = full.split('|')[1];
                    } else {
                        result.meta = full;
                    }
                    if (typeof(result.meta) == 'undefined') { // Happens for single images without metadata
                        result.meta = '';
                    }
                    //                console.log("Firing x=" + result.x + ", y=" + result.y + ", aside=" + aSide + ", index=" + index + ", meta=" + result.meta);
                    fireResult();
                    return true;
                }
                //            console.log("Returning due to pending " + metaSource);
                // In transit, so the async call should return at some point. Note that result is set!
                // TODO: Ensure that timed out requests are handled properly
                return true;
            }
        }
    }


    // If meta-data for the requested image is available, it is updated immediately.
    // If there is a pending request for the block containing the meta, the notifyMeta
    // is updated.
    // If there is no pending request for the block, notifyMeta is updated and a new
    // async request is initiated.
    this.prepareMeta = function(x, y, boxX, boxY, boxWidth, boxHeight, validPos) {
        if (!validPos) {
            // TODO: Set meta to "" and fire event
            juxtaCallbackNotValid();
            return
        };
        //console.log("prepareMeta(" + x + ", " + y + ", ...) called");

        result.fired = false;
        result.x = x;
        result.y = y;
        result.boxX = boxX;
        result.boxY = boxY;
        result.boxWidth = boxWidth;
        result.boxHeight = boxHeight;
        result.validPos = validPos;
        result.image = '';
        result.meta = '';
        result.prefix = '';
        result.postfix = '';
        
        if (tryFire()) {
            return;
        }

        // Create an async call to get the meta data
        var metaSource = Math.floor(x/jprops.asyncMetaSide) + '_' + Math.floor(y/jprops.asyncMetaSide) + '.json';
        //    console.log("x=" + x + ", jprops.asyncMetaSide=" + jprops.asyncMetaSide);
        var cacheEntry = {
            status: 'pending',
            source: metaSource
        };
        metaCache.push(cacheEntry);
        if (metaCache.length > metaCacheMax) {
            //        console.log("Cache full, pruning");
            metaCache.shift();
        }
        
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState != 4) {
                return;
            }
            if (xhttp.status == 200) {
                //        console.log("Got: " + xhttp.responseText);
                var rJSON = JSON.parse(xhttp.responseText);
                xhttp.cacheEntry.meta = rJSON.meta;
                xhttp.cacheEntry.prefix = rJSON.prefix;
                xhttp.cacheEntry.postfix = rJSON.postfix;
                xhttp.cacheEntry.status = 'ready';
                //            console.log("meta: " + xhttp.cacheEntry.meta);
                tryFire();
                //            console.log("Check that result is still covered by this response and if so, fire it");
            } else {
                console.log("Unable to get response for " + cacheEntry.source + " with status " + xhttp.status);
                // TODO: Figure out how to signal the error to the GUI - maybe "N/A" as image & meta?
                var arrayLength = metaCache.length;
                for (var i = 0; i < arrayLength; i++) {
                    if (metaCache[i].source == metaSource) {
                        metaCache.splice(i, 1);
                        break;
                    }
                }
            }
        }
        xhttp.cacheEntry = cacheEntry;
        //    console.log("Requesting meta/" + metaSource);
        // TODO: Add optional meta-folder-prefix here
        xhttp.open("GET", "meta/" + metaSource, true);
        xhttp.send();
    }

    this.juxtaExpand = function(x, y, boxX, boxY, boxWidth, boxHeight) {
        var meta="";
        var image = "";
        var validPos = false;
        imageIndex = y*jprops.colCount+x;
        if (x >= 0 && x < jprops.colCount && y >= 0 && y < jprops.rowCount && imageIndex < jprops.imageCount) {
            validPos = true;
            //    if (typeof(juxtaImages) != 'undefined') {
            //      image = juxtaPrefix + juxtaImages[imageIndex] + juxtaPostfix;
            //    }
            
            //    if (typeof(juxtaMeta) != 'undefined') {
            //      meta = juxtaMeta[imageIndex];
            //    }
        }
        //  juxtaCallback(x, y, boxX, boxY, boxWidth, boxHeight, validPos, image, meta);
        prepareMeta(x, y, boxX, boxY, boxWidth, boxHeight, validPos);
    }

    return this;
}
