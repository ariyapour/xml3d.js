/**
 *
 * @param {Element} defaultTarget
 * @param {AbstractCanvasHandler} canvasHandler
 * @constructor
 */
var TouchEventHandler = function (defaultTarget, canvasHandler) {
    this._defaultTarget = defaultTarget;
    this._canvasHandler = canvasHandler;
};


var EVENTS = ["touchstart", "touchmove", "touchend", "touchcancel"];

TouchEventHandler.prototype = {

    copyTouchEvent: function (event, options) {
        var touchEventData = this.copyTouchEventData(event, options);
        return this.createTouchEvent(touchEventData);
    },


    copyTouchEventData: function (event, options) {
        return {
            type: options.type || event.type,
            timeStamp: Date.now(),
            bubbles: event.bubbles,
            cancelable: event.cancelable,
            detail: event.detail,
            screenX: event.screenX,
            screenY: event.screenY,
            pageX: event.pageX,
            pageY: event.pageY,
            clientX: event.clientX,
            clientY: event.clientY,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            scale: event.scale,
            rotation: event.rotation,
            view: event.view,
            touches: event.touches,
            changedTouches: event.changedTouches,
            targetTouches: event.targetTouches
        };
    },

    createTouchEvent: function (data) {
        var touchEvent;

        try {
            touchEvent = document.createEvent('TouchEvent');
        } catch (e) {
            XML3D.debug.logWarning("Create Touch Event failed, creating UI instead");
            touchEvent = document.createEvent('UIEvent');
        }

        if (touchEvent && touchEvent.initTouchEvent) {
            if (touchEvent.initTouchEvent.length == 0) { //chrome
                touchEvent.initTouchEvent(data.touches, data.targetTouches, data.changedTouches, data.type, data.view, data.screenX, data.screenY, data.clientX, data.clientY);
            } else if (touchEvent.initTouchEvent.length == 12) { //firefox
                touchEvent.initTouchEvent(data.type, data.bubbles, data.cancelable, data.view, data.detail, data.ctrlKey, data.altKey, data.shiftKey, data.metaKey, data.touches, data.targetTouches, data.changedTouches);
            } else { //iOS length = 18
                touchEvent.initTouchEvent(data.type, data.bubbles, data.cancelable, data.view, data.detail, data.screenX, data.screenY, data.pageX, data.pageY, data.ctrlKey, data.altKey, data.shiftKey, data.metaKey, data.touches, data.targetTouches, data.changedTouches, data.scale, data.rotation);
            }
        }
        return touchEvent;
    },

    /**
     * @param {Event} evt
     * @param {object?} opt
     */
    dispatchTouchEventOnPickedObject: function (evt, opt) {
        opt = opt || {};
        var touchEvent = this.copyTouchEvent(evt, opt);
        touchEvent.preventDefault = function () {
            evt.preventDefault();
        };
        this._defaultTarget.dispatchEvent(touchEvent);
    },

    touchstart: function (evt) {
        this.dispatchTouchEventOnPickedObject(evt);
    },

    touchend: function (evt) {
        this.dispatchTouchEventOnPickedObject(evt);
    },

    touchmove: function (evt) {
        this.dispatchTouchEventOnPickedObject(evt);
    },

    touchcancel: function (evt) {
        this.dispatchTouchEventOnPickedObject(evt);
    }

};


module.exports = {
    EVENTS: EVENTS, TouchEventHandler: TouchEventHandler
};
