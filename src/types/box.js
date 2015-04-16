
/**
 * Creates an instance of XML3DBox. XML3DBox represents an axis-aligned box,
 * described by two vectors min and max.
 * @constructor
 * @param {XML3DVec3=} min The smaller point of the box. Default: (0,0,0)
 * @param {XML3DVec3=} max The biggest point of the box. Default: (0,0,0)
 */
var XML3DBox = function(min, max, cb) {
    var that = this;

    /** anonymous callback to inform this instance * */
    var vec_cb = function() {
        if (that._callback)
            that._callback(that);
    };

    /**
     * @private
     * @type {XML3DVec3}
     */
    this._min = new window.XML3DVec3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, vec_cb);
    /**
     * @private
     * @type {XML3DVec3}
     */
    this._max = new window.XML3DVec3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, vec_cb);

    // Copy constructor
    if (min && min.min) {
        this._min.set(min.min);
        this._max.set(min.max);
    } else {
        if (min)
            this._min.set(min);
        if (max)
            this._max.set(max);
    }

    /** @private * */
    this._callback = typeof cb == 'function' ? cb : 0;

};

/** @type {XML3DVec3} */
Object.defineProperty(XML3DBox.prototype, "min", {
    /** @this {XML3DBox} **/
    get : function() { return this._min; },
    set : function() { throw Error("XML3DBox::min is readonly."); },
    configurable : false,
    enumerable : false
});

/** @type {XML3DVec3} */
Object.defineProperty(XML3DBox.prototype, "max", {
    /** @this {XML3DBox} **/
    get : function() { return this._max; },
    set : function() { throw Error("XML3DBox::max is readonly."); },
    configurable : false,
    enumerable : false
});

/**
 * Calculates the size of the Box in each dimension
 * @return {XML3DVec3} Size of the Box
 */
XML3DBox.prototype.size = function() {
    var v = this._max.subtract(this._min);
    if (v.x < 0)
        v.x = 0;
    if (v.y < 0)
        v.y = 0;
    if (v.z < 0)
        v.z = 0;

    return v;
};

/**
 * Calculates the center of the Box
 * @returns {XML3DVec3} that is the center of the box
 */
XML3DBox.prototype.center = function() {
    return this._min.add(this._max).scale(0.5);
};

/**
 * Set Box empty Sets min's components to Number.MAX_VALUE and max'
 * components to -Number.MAX_VALUE.
 */
XML3DBox.prototype.makeEmpty = function() {
    this._min = new window.XML3DVec3(Number.MAX_VALUE, Number.MAX_VALUE,
            Number.MAX_VALUE);
    this._max = new window.XML3DVec3(-Number.MAX_VALUE, -Number.MAX_VALUE,
            -Number.MAX_VALUE);
    if (this._callback)
        this._callback(this);
};

/**
 * Test, if this Box is empty
 * @returns {boolean} 'true', if box is empty
 */
XML3DBox.prototype.isEmpty = function() {
    return (this._min.x > this._max.x || this._min.y > this._max.y || this._min.z > this._max.z);
};

/**
 * String representation of the XML3DBox.
 * @override
 * @return {string} Human-readable representation of this XML3DBox.
 */
XML3DBox.prototype.toString = function() {
    return "[object XML3DBox]";
};

/**
 * The set method copies the values from other.
 * @param {XML3DBox} other The other box
 */
XML3DBox.prototype.set = function(other) {
    this._min.set(other.min);
    this._max.set(other.max);
    if (this._callback)
        this._callback(this);
};

/** updates the min or max accoring to the given point or bounding box.
*
* @param that the object used for extension, which can be a XML3DVec3 or XML3DBox
*/
XML3DBox.prototype.extend = function(that)
{
    if (!that)
        return;

    var min, max;
    if(that.constructor === window.XML3DBox)
    {
        min = that.min;
        max = that.max;
    }
    else if(that.constructor === window.XML3DVec3)
    {
        min = that;
        max = that;
    }
    else
        return;

    if(min.x < this._min.x)
        this._min.x = min.x;
    if(min.y < this._min.y)
        this._min.y = min.y;
    if(min.z < this._min.z)
        this._min.z = min.z;

    if(max.x > this._max.x)
        this._max.x = max.x;
    if(max.y > this._max.y)
        this._max.y = max.y;
    if(max.z > this._max.z)
        this._max.z = max.z;
};

window.XML3DBox = XML3DBox;

module.exports = {
    XML3DBox: XML3DBox
};
