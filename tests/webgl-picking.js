module("WebGL Picking tests", {
    setup : function() {
        stop();
        var that = this;
        this.cb = function(e) {
            ok(true, "Scene loaded");
            that.doc = document.getElementById("xml3dframe").contentDocument;
            start();
        };
        loadDocument("scenes/webgl-picking.xhtml"+window.location.search, this.cb);
    },
    teardown : function() {
        var v = document.getElementById("xml3dframe");
        v.removeEventListener("load", this.cb, true);
    },
    dispatchMouseEvent : function(handler, type, data, target) {
        handler._mouseHandler.dispatchMouseEvent(handler._mouseHandler.createMouseEvent(type, data), target);
    }

});


test("Check current pick object (internal)", function() {
    var xml3dElement = this.doc.getElementById("xml3DElem");
    var h = getHandler(xml3dElement);
    var picked = h.getPickObjectByPoint(88,60);
    ok(h.renderer.pickedObject, "Object picked");
    strictEqual(h.renderer.pickedObject, picked, "Return value matches");
    strictEqual(h.renderer.pickedObject.node, this.doc.getElementById("pickingMesh1"), "Picked object 'pickingMesh1'");

    picked = h.getPickObjectByPoint(5,5);
    strictEqual(h.renderer.pickedObject, null, "Nothing picked");
    strictEqual(h.renderer.pickedObject, picked, "Return value matches");

    var picked = h.getPickObjectByPoint(88,60);
    ok(h.renderer.pickedObject, "Object picked");
    strictEqual(h.renderer.pickedObject, picked, "Return value matches");
    strictEqual(h.renderer.pickedObject.node, this.doc.getElementById("pickingMesh1"), "Picked object 'pickingMesh1'");

});

test("Pick with large object ids", function() {
    var xml3dElement = this.doc.getElementById("xml3DElem");
    var renderer = getRenderer(xml3dElement);
    var target = this.doc.getElementById("pickingMesh6");

    var drawables = renderer.scene.ready;
    var objId = -1;
    for ( var i = 0; i < drawables.length; i++) {
        if (drawables[i].node === target) {
            objId = i;
            break;
        }
    }
    notEqual(objId, -1, "Found Drawable");
    ok(objId > 255, "Object id larger than 255");

    var picked = renderer.getRenderObjectFromPickingBuffer(220, 150);
    ok(renderer.pickedObject, "Object picked");
    strictEqual(renderer.pickedObject, picked, "Return value matches");
    strictEqual(renderer.pickedObject.node, this.doc.getElementById("pickingMesh6"), "Picked object 'pickingMesh1'");

});

test("xml3d Apadater getElementByPoint test", function() {
    var xml3dElement = this.doc.getElementById("xml3DElem");

    var position = new XML3DVec3(), normal = new XML3DVec3();
    var element = xml3dElement.getElementByPoint(88,60, position , normal);
    ok(element, "Object picked");
    strictEqual(element, this.doc.getElementById("pickingMesh1"));
    QUnit.closeVector(normal, new XML3DVec3(0,0,1), EPSILON, "Picked correct normal");

    element = xml3dElement.getElementByPoint(5,5, position, normal);
    strictEqual(element, null, "Nothing picked");
    ok(isNaN(position.x) && isNaN(position.y) && isNaN(position.z), "Picked correct position");
    ok(isNaN(normal.x) && isNaN(normal.y) && isNaN(normal.z), "Picked correct normal");

    element = xml3dElement.getElementByPoint(88,60, position , normal);
    ok(element, "Object picked");
    strictEqual(element, this.doc.getElementById("pickingMesh1"));
    QUnit.closeVector(normal, new XML3DVec3(0,0,1), EPSILON, "Picked correct normal");

});


test("Object picking test", 3, function() {
    var xml3dElement = this.doc.getElementById("xml3DElem");
    var h = getHandler(xml3dElement);
    var target = this.doc.getElementById("pickingMesh1");

    target.addEventListener("click", function(evt) {
        start();
        strictEqual(evt.target, target);
    }, false);

    h.getPickObjectByPoint(88,60);
    stop();
    this.dispatchMouseEvent(h, "click", { clientX: 88, clientY: 60 }, target);

});

test("Position picking test", 4, function() {
    var xml3dElement = this.doc.getElementById("xml3DElem");
    var h = getHandler(xml3dElement);
    var target = this.doc.getElementById("pickingMesh1");

    target.addEventListener("click", function(evt) {
        start();
        ok(evt.position);
        QUnit.closeVector(evt.position, new XML3DVec3(-2.503,2.01,-10), EPSILON, "Picked position is correct");
    }, false);

    h.getPickObjectByPoint(89,51);
    stop();
    this.dispatchMouseEvent(h, "click", { clientX: 89, clientY: 51 }, target);
});

test("Normal picking test", 4, function() {
    var xml3dElement = this.doc.getElementById("xml3DElem");
    var h = getHandler(xml3dElement);
    var target = this.doc.getElementById("pickingMesh1");

    target.addEventListener("click", function(evt) {
        var normal = evt.normal;
        ok(normal);
        QUnit.closeVector(evt.normal, new XML3DVec3(0,0,1), EPSILON, "Picked correct normal");
        start();
    }, false);

    h.getPickObjectByPoint(88,60);
    stop();
    this.dispatchMouseEvent(h, "click", { clientX: 88, clientY: 60 }, target);
});

test("Don't pick invisible objects", 3, function() {
    var xml3dElement = this.doc.getElementById("xml3DElem");
    var expected = this.doc.getElementById("pickingMesh_back");
    var actual = xml3dElement.getElementByPoint(215,60);
    equal(actual, expected, "Pick object behind 'pickingMesh3'");
});

test("Resizing xml3d element reinitializes buffers", 5, function() {
    var xml3dElement = this.doc.getElementById("xml3DElem");
    var expected = this.doc.getElementById("pickingMesh7");
    var h = getHandler(xml3dElement);

    var actual = xml3dElement.getElementByPoint(299,199);
    equal(actual, expected, "Pick object 'pickingMesh7'");

    xml3dElement.style.width = "500px";
    h.tick();

    equal(h.renderer.width / h.renderer.height, 500/200, "Renderer has the right aspect ratio");

    actual = xml3dElement.getElementByPoint(416,199);
    equal(actual, expected, "Pick object 'pickingMesh7'");
});

test("Touch", function() {
    var xml3dElement = this.doc.getElementById("xml3DElem");
    var h = getHandler(xml3dElement);

    if('ontouchstart' in window) {
        ok(h.hasTouchEvents(), "Handler has touch events");
        notEqual(h._touchHandler, null, "Touch handler set");
    } else {
        ok(!h.hasTouchEvents(), "Handler has no touch events");
        equal(h._touchHandler, null, "Touch handler not set");
    }


});

test("Simple picking with getElementByRay", 5, function() {
    var xml3dElement = this.doc.getElementById("xml3DElem");
    var h = getHandler(xml3dElement);
    var target = this.doc.getElementById("pickingMesh8");
    var target2 = this.doc.getElementById("pickingMesh9");

    var ray = new XML3DRay();
    ray.origin.set(new XML3DVec3(10, -0.1, -10));
    ray.direction.set(new XML3DVec3(-1, 0, 0));

    var obj = xml3dElement.getElementByRay(ray);
    equal(obj, target, "Ray orthogonal to camera returned the first intersected mesh");

    ray.direction.set(new XML3DVec3(1, 0, 0));
    obj = xml3dElement.getElementByRay(ray);
    equal(obj, null, "The same ray with inverted direction returned null");

    ray.origin.set(new XML3DVec3(-10, -0.1, -10));
    obj = xml3dElement.getElementByRay(ray);
    equal(obj, target2, "The inverted ray shot from the other side returns the right mesh");
});

test("Position and normal with getElementByRay", 6, function() {
    var xml3dElement = this.doc.getElementById("xml3DElem");
    var h = getHandler(xml3dElement);

    var ray = new XML3DRay();
    ray.origin.set(new XML3DVec3(-10, 0, -10));
    ray.direction.set(new XML3DVec3(1, 0, 0));

    var foundNormal = new XML3DVec3();
    var foundPosition = new XML3DVec3();

    var obj = xml3dElement.getElementByRay(ray, foundPosition, foundNormal);
    QUnit.closeVector(foundPosition, new XML3DVec3(-1,0.02,-9.98), EPSILON, "Found correct position");
    QUnit.closeVector(foundNormal, new XML3DVec3(1, 0, 0), EPSILON, "Found correct normal");

    ray.origin.set(new XML3DVec3(10, 0, -10));
    obj = xml3dElement.getElementByRay(ray, foundPosition, foundNormal);
    ok(isNaN(foundPosition.x) && isNaN(foundPosition.y) && isNaN(foundPosition.z), "Position returns NaN for no hit object");
    ok(isNaN(foundNormal.x) && isNaN(foundNormal.y) && isNaN(foundNormal.z), "Normal returns NaN for no hit object");
});

test("Overlapping objects with getElementByRay", 6, function() {
	var xml3dElement = this.doc.getElementById("xml3DElem");
	var h = getHandler(xml3dElement);
	var target = this.doc.getElementById("pickingMesh11");
	var target2 = this.doc.getElementById("pickingMesh10");

	var ray = new XML3DRay();
	ray.origin.set(new XML3DVec3(-5, 0, 100));
	ray.direction.set(new XML3DVec3(0, 0, -1));

	var foundNormal = new XML3DVec3();
	var foundPosition = new XML3DVec3();

	var obj = xml3dElement.getElementByRay(ray, foundPosition, foundNormal);
	equal(obj, target, "Returned the correct object");
	QUnit.closeVector(foundPosition, new XML3DVec3(-4.77, 0.23, -10), EPSILON, "Found correct position");
	QUnit.closeVector(foundNormal, new XML3DVec3(0, 0, 1), EPSILON, "Found correct normal");

	ray.origin.set(new XML3DVec3(-4, 0, 100));
	obj = xml3dElement.getElementByRay(ray);
	equal(obj, target2, "Returned the square donut object");
});

test("Ray parallel to an object", 4, function() {
	var xml3dElement = this.doc.getElementById("xml3DElem");
	var h = getHandler(xml3dElement);
	var target = this.doc.getElementById("pickingMesh2");

	var ray = new XML3DRay();
	ray.origin.set(new XML3DVec3(0, 0, -9));
	ray.direction.set(new XML3DVec3(0, 1, -0.5));

	var obj = xml3dElement.getElementByRay(ray);
	equal(obj, target, "Slightly downward angle returns the plane");

	ray.origin.set(new XML3DVec3(0, 0, -10));
	ray.direction.set(new XML3DVec3(0, 1, 0));

	obj = xml3dElement.getElementByRay(ray);
	equal(obj, null, "Ray parallel to plane returns null");

});


