(function(){
/**
 * Content of this file:
 * All Code for handling data structures connected to Xflow including:
 *  - Typed value buffers (e.g float3 buffer)
 *  - Images
 *
 * This file also includes the Xflow.DataChangeNotifier used to react to changes on Xflow data structures
 */

//----------------------------------------------------------------------------------------------------------------------
// Xflow.SamplerConfig
//----------------------------------------------------------------------------------------------------------------------


/**
 * SamplerConfig is used to define sampler properties of an Xflow.TextureEntry or Xflow.ImageDataTextureEntry
 * @constructor
 */
Xflow.SamplerConfig = function(){
    this.minFilter = 0;
    this.magFilter = 0;
    this.mipFilter = 0;
    this.wrapS = 0;
    this.wrapT = 0;
    this.wrapU = 0;
    this.textureType = 0;
    this.colorR = 0;
    this.colorG = 0;
    this.colorB = 0;
    this.generateMipMap = 0;
};
Xflow.SamplerConfig.prototype.setDefaults = function() {
    // FIXME Generate this from the spec ?
    this.minFilter = Xflow.TEX_FILTER_TYPE.LINEAR;
    this.magFilter = Xflow.TEX_FILTER_TYPE.LINEAR;
    this.mipFilter = Xflow.TEX_FILTER_TYPE.NEAREST;
    this.wrapS = Xflow.TEX_WRAP_TYPE.CLAMP;
    this.wrapT = Xflow.TEX_WRAP_TYPE.CLAMP;
    this.wrapU = Xflow.TEX_WRAP_TYPE.CLAMP;
    this.textureType = Xflow.TEX_TYPE.TEXTURE_2D;
    this.colorR = 0;
    this.colorG = 0;
    this.colorB = 0;
    this.generateMipMap = 0;
};
Xflow.SamplerConfig.prototype.set = function(other) {
    this.minFilter = other.minFilter;
    this.magFilter = other.magFilter;
    this.mipFilter = other.mipFilter;
    this.wrapS = other.wrapS;
    this.wrapT = other.wrapT;
    this.wrapU = other.wrapU;
    this.textureType = other.textureType;
    this.colorR = other.colorR;
    this.colorG = other.colorG;
    this.colorB = other.colorB;
    this.generateMipMap = other.generateMipMap;
};
var SamplerConfig = Xflow.SamplerConfig;


//----------------------------------------------------------------------------------------------------------------------
// Xflow.DataEntry
//----------------------------------------------------------------------------------------------------------------------


/**
 * The abstract base class for all DataEntries connected to an xflow graph.
 * @abstract
 * @param {Xflow.DATA_TYPE} type Type of DataEntry
 */
Xflow.DataEntry = function(type){
    this._type = type;
    this._listeners = [];
    this.userData = {};
    this._deferredName="";
};
var DataEntry = Xflow.DataEntry;

Object.defineProperty(DataEntry.prototype, "type", {
    /** @param {Xflow.DATA_TYPE} v */
    set: function(v){
        throw new Error("type is read-only");
    },
    /** @return {Xflow.DATA_TYPE} */
    get: function(){ return this._type; }
});

/**
 * @param {function(Xflow.DataEntry, Xflow.DATA_ENTRY_STATE)} callback
 */
DataEntry.prototype.addListener = function(callback){
    this._listeners.push(callback);
};

/**
 * @param {function(Xflow.DataEntry, Xflow.DATA_ENTRY_STATE)} callback
 */
DataEntry.prototype.removeListener = function(callback){
    Array.erase(this._listeners, callback);
};

DataEntry.prototype._notifyChanged = function(){
    notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_VALUE);
}

//----------------------------------------------------------------------------------------------------------------------
// Xflow.BufferEntry
//----------------------------------------------------------------------------------------------------------------------

/**
 * A typed value buffer basically linking to a typed array.
 * @constructor
 * @extends {Xflow.DataEntry}
 * @param {Xflow.DATA_TYPE} type
 * @param {Object} value A typed array
 */
Xflow.BufferEntry = function(type, value){
    Xflow.DataEntry.call(this, type);
    this._value = value;
    notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_NEW);
};
Xflow.createClass(Xflow.BufferEntry, Xflow.DataEntry);
var BufferEntry = Xflow.BufferEntry;


/** @param {Object} v */
BufferEntry.prototype.setValue = function(v){
    this._setValue(v);
    Xflow._callListedCallback();
}

BufferEntry.prototype._setValue = function(v){
    var newSize = (this._value ? this._value.length : 0) != (v ? v.length : 0);
    this._value = v;
    notifyListeners(this, newSize ? Xflow.DATA_ENTRY_STATE.CHANGED_SIZE : Xflow.DATA_ENTRY_STATE.CHANGED_VALUE);
}

/** @return {Object} */
BufferEntry.prototype.getValue = function(){
    return this._value;
};

/** @return {Object} */
BufferEntry.prototype.getLength = function(){
    return this._value ? this._value.length : 0;
};


BufferEntry.prototype.getTupleSize = function() {
    if (!this._tupleSize) {
        this._tupleSize = Xflow.DATA_TYPE_TUPLE_SIZE[this._type];
    }
    return this._tupleSize;
};

/**
 * @return {number}
 */
BufferEntry.prototype.getIterateCount = function(){
    return this.getLength() / this.getTupleSize();
};

BufferEntry.prototype.isEmpty = function(){
    return !this._value || !this.getLength();
};


//----------------------------------------------------------------------------------------------------------------------
// Xflow.TextureEntry
//----------------------------------------------------------------------------------------------------------------------

var tmpCanvas = null;
var tmpContext = null;

/**
 * Xflow.toImageData converts ImageData-like objects to real ImageData
 * @param imageData
 * @return {*}
 */
Xflow.toImageData = function(imageData) {
    if (imageData instanceof ImageData)
        return imageData;
    if (!imageData.data)
        throw new Error("no data property");
    if (!imageData.width)
        throw new Error("no width property");
    if (!imageData.height)
        throw new Error("no height property");
    if (!tmpContext) {
        tmpCanvas = document.createElement('canvas');
        tmpContext = tmpCanvas.getContext('2d');
    }
    var newImageData = tmpContext.createImageData(imageData.width, imageData.height);
    for (var i = 0; i < imageData.data.length; ++i) {
        var v = imageData.data[i];
        if (v > 255)
            v = 255;
        if (v < 0)
            v = 0;
        newImageData.data[i] = v;
    }
    return newImageData;
};


// TextureEntry data conversion order
// image -> canvas -> context -> -> imageData
// Note: don't use TextureEntry's width and height properties, they are deprecated and cause issues with video loading
// Instead use getWidth and getHeight methods

/**
 * A data entry for a texture.
 * Note: each TextureEntry includes a samplerConfig.
 * @constructor
 * @extends {Xflow.DataEntry}
 * @param {Object} image
 */
Xflow.TextureEntry = function(image){
    Xflow.DataEntry.call(this, Xflow.DATA_TYPE.TEXTURE);
    this._samplerConfig = new SamplerConfig();
    this._formatType = null; // null | 'ImageData' | 'number' | 'float32' | 'float64'
    this._loading = false;
    this._updateImage(image);

    notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_NEW);
};
Xflow.createClass(Xflow.TextureEntry, Xflow.DataEntry);
var TextureEntry = Xflow.TextureEntry;

TextureEntry.prototype.isLoading = function() {
    var image = this._image;
    if (!image)
        return false;
    var nodeName = image.nodeName.toLowerCase();
    if (nodeName == 'img')
        return !image.complete;
    if (nodeName == 'canvas')
        return this._image.width <= 0 || this._image.height <= 0;
    if (nodeName == 'video')
        // readyState == 0 is HAVE_NOTHING
        return image.readyState == 0 || this._image.videoWidth <= 0 || this._image.videoHeight <= 0;
    return false;
};

TextureEntry.prototype._updateImage = function(image) {
    this._image = image;
    this._context = null;
    this._imageData = null;
    if (this._image) {
        var nodeName = this._image.nodeName.toLowerCase();
        if (nodeName == 'video') {
            this.width = this._image.videoWidth;
            this.height = this._image.videoHeight;
        } else {
            this.width = this._image.width;
            this.height = this._image.height;
        }
        if (nodeName == 'canvas') {
            this._canvas = this._image;
            this._copyImageToCtx = false;
        } else {
            this._canvas = null;
            this._copyImageToCtx = true;
        }
    } else {
        this.width = 0;
        this.height = 0;
        this._canvas = null;
    }
};

/** Create new image
 *
 * @param width
 * @param height
 * @param formatType
 * @param samplerConfig
 * @return {Image|Canvas}
 */
TextureEntry.prototype._createImage = function(width, height, formatType, samplerConfig) {
    if (!this._image || this.getWidth() != width || this.getHeight() != height || this._formatType != formatType) {
        if (!width || !height)
            throw new Error("Width or height is not specified");
        // create dummy image
        var img = document.createElement('canvas');
        img.width = width;
        img.height = height;
        img.complete = true;

        this._formatType = formatType;
        if (!samplerConfig) {
            samplerConfig = new Xflow.SamplerConfig();
            samplerConfig.setDefaults();
        }
        this._samplerConfig.set(samplerConfig);
        this._setImage(img);
    } else {
        this._notifyChanged();
    }
    return this._image;
};

/**
 * Change the image of the TextureEntry
 * @param {Object} v
 **/
TextureEntry.prototype.setImage = function(v) {
    this._setImage(v);
    Xflow._callListedCallback();
};

TextureEntry.prototype._setImage = function(v) {
    this._updateImage(v);
    var loading = this.isLoading();
    if(loading){
        this._loading = true;
        notifyListeners(this, Xflow.DATA_ENTRY_STATE.LOAD_START);
    }
    else if(this._loading){
        this._loading = false;
        notifyListeners(this, Xflow.DATA_ENTRY_STATE.LOAD_END);
    }
    else
        notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_VALUE);
}


TextureEntry.prototype.getFormatType = function() {
    return this._formatType;
};

TextureEntry.prototype.getWidth = function() {
    if (!this._image)
        return 0;
    return this._image.videoWidth || this._image.width || 0;
};

TextureEntry.prototype.getHeight = function() {
    if (!this._image)
        return 0;
    return this._image.videoHeight || this._image.height || 0;
};

TextureEntry.prototype._flush = function() {
    if (this._imageData) {
        if (this._imageData instanceof ImageData) {
            this._context.putImageData(this._imageData, 0, 0);
            this._imageData = null;
        } else {
            var imageData = Xflow.toImageData(this._imageData);
            this._context.putImageData(imageData, 0, 0);
            this._imageData = null;
        }
    }
    if (this._canvas) {
        this._canvas.complete = true; // for compatibility with img element
        this._image = this._canvas;
    }
};

/** @return {Object} */
TextureEntry.prototype.getImage = function() {
    this._flush();
    return this._image;
};

TextureEntry.prototype.getCanvas = function() {
    if (!this._canvas) {
        this._canvas = document.createElement('canvas');
        this._canvas.width = this.getWidth();
        this._canvas.height = this.getHeight();
        this._canvas.complete = false; // for compatibility with img element
    } else
        this._flush();
    return this._canvas;
};

TextureEntry.prototype.getFilledCanvas = function() {
    var canvas = this.getCanvas();
    this._context = canvas.getContext("2d");
    if (!this._context)
        throw new Error("Could not create 2D context.");
    if (this._copyImageToCtx) {
        this._context.drawImage(this._image, 0, 0);
        this._copyImageToCtx = false;
    }
    return canvas;
};

TextureEntry.prototype.getContext2D = function() {
    if (!this._context) {
        this.getFilledCanvas(); // will implicitly create context for filled canvas
    } else
        this._flush();
    return this._context;
};




/** @return {ImageData} */
TextureEntry.prototype.getValue = function() {
    if (!this._image)
        return null;
    if (!this._imageData && !this.isLoading()) {
        var ctx = this.getContext2D();
        this._imageData = ctx.getImageData(0, 0, this.getWidth(), this.getHeight());
        if (this._formatType == 'float32') {
            this._imageData = {
                data : new Float32Array(this._imageData.data),
                width : this._imageData.width,
                height : this._imageData.height
            };
        } else if (this._formatType == 'float64') {
            this._imageData = {
                data : new Float64Array(this._imageData.data),
                width : this._imageData.width,
                height : this._imageData.height
            };
        }
    }
    return this._imageData;
};

/** @return {SamplerConfig} */
TextureEntry.prototype.getSamplerConfig = function(){
    return this._samplerConfig;
};

/** @return {number} */
TextureEntry.prototype.getLength = function(){
    return 1;
};
TextureEntry.prototype.isEmpty = function(){
    return !this._image
};

/** @return {number} */
TextureEntry.prototype.getIterateCount = function() {
    return 1;
};

//----------------------------------------------------------------------------------------------------------------------
// Xflow.ImageDataTextureEntry
//----------------------------------------------------------------------------------------------------------------------

/**
 * Same as Xflow.TextureEntry, only based on imageData.
 * This class is used for xflow running inside Web Workers (which don't support HTML images)
 * @param imageData
 * @constructor
 */
Xflow.ImageDataTextureEntry = function(imageData){
    Xflow.DataEntry.call(this, Xflow.DATA_TYPE.TEXTURE);
    this._samplerConfig = new SamplerConfig();
    this._imageData = null;
    this._formatType = null;
    this._updateImageData(imageData);

    notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_NEW);
};
Xflow.createClass(Xflow.ImageDataTextureEntry, Xflow.DataEntry);
var ImageDataTextureEntry = Xflow.ImageDataTextureEntry;

ImageDataTextureEntry.prototype.isLoading = function() {
    return !this._imageData;
};

ImageDataTextureEntry.prototype._updateImageData = function(imageData) {
    this._formatType = null;
    this._imageData = imageData;
};

/** Create new image
 *
 * @param width
 * @param height
 * @param formatType
 * @param samplerConfig
 * @return {Image|Canvas}
 */
ImageDataTextureEntry.prototype._createImage = function(width, height, formatType, samplerConfig) {
    if (!this._image || this.getWidth() != width || this.getHeight() != height || this._formatType != formatType) {
        if (!width || !height)
            throw new Error("Width or height is not specified");
        this._formatType = formatType;
        if (!samplerConfig) {
            samplerConfig = new Xflow.SamplerConfig();
            samplerConfig.setDefaults();
        }
        this._samplerConfig.set(samplerConfig);

        var imageData = {
            width: width,
            height: height,
            data: null
        };
        if(formatType == 'float64'){
            imageData.data = new Float64Array(width*height*4);
        }
        else if(formatType == 'float32'){
            imageData.data = new Float32Array(width*height*4);
        }
        else {
            // FIXME: We should allocate Uint8ClampedArray here instead
            // But Uint8ClampedArray can't be allocated in Chrome inside a Web Worker
            // See bug: http://code.google.com/p/chromium/issues/detail?id=176479
            // As a work around, we allocate Int16Array which results in correct clamping outside of web worker
            if(Uint8Array == Uint8ClampedArray)
                imageData.data = new Int16Array(width*height*4);
            else
                imageData.data = new Uint8ClampedArray(width*height*4);
        }
        this._imageData = imageData;
    }
    this._notifyChanged();
};

/** @param {Object} v */
ImageDataTextureEntry.prototype.setImageData = function(v) {
    this._updateImageData(v);
    notifyListeners(this, Xflow.DATA_ENTRY_STATE.CHANGED_VALUE);
    Xflow._callListedCallback();
};

ImageDataTextureEntry.prototype.getWidth = function() {
    return this._imageData && this._imageData.width || 0;
};

ImageDataTextureEntry.prototype.getHeight = function() {
    return this._imageData && this._imageData.height || 0;
};

/** @return {ImageData} */
ImageDataTextureEntry.prototype.getValue = function() {
    return this._imageData;
};

/** @return {SamplerConfig} */
ImageDataTextureEntry.prototype.getSamplerConfig = function(){
    return this._samplerConfig;
};

/** @return {number} */
ImageDataTextureEntry.prototype.getLength = function(){
    return 1;
};
ImageDataTextureEntry.prototype.isEmpty = function(){
    return !this._imageData
};

ImageDataTextureEntry.prototype.getFormatType = function() {
    return this._formatType;
};


/** @return {number} */
ImageDataTextureEntry.prototype.getIterateCount = function() {
    return 1;
};

//----------------------------------------------------------------------------------------------------------------------
// Xflow.DataChangeNotifier
//----------------------------------------------------------------------------------------------------------------------


/**
 * Used to listen to modifications of any DataEntry connected to an Xflow graph.
 * @global
 */
Xflow.DataChangeNotifier = {
    _listeners: []
}
var DataChangeNotifier = Xflow.DataChangeNotifier;

/**
 * @param {function(Xflow.DataEntry, Xflow.DATA_ENTRY_STATE)} callback
 */
DataChangeNotifier.addListener = function(callback){
    this._listeners.push(callback);
};

/**
 * @param {function(Xflow.DataEntry, Xflow.DATA_ENTRY_STATE)} callback
 */
DataChangeNotifier.removeListener = function(callback){
    Array.erase(this._listeners, callback);
};

/**
 * @param {Xflow.DataEntry} dataEntry
 * @param {Xflow.DATA_ENTRY_STATE} notification
 */
function notifyListeners(dataEntry, notification){
    for(var i = 0; i < DataChangeNotifier._listeners.length; ++i){
        DataChangeNotifier._listeners[i](dataEntry, notification);
    }
    for(var i = 0; i < dataEntry._listeners.length; ++i){
        dataEntry._listeners[i](dataEntry, notification);
    }
}

}());
