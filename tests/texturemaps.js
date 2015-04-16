
// Scene: texturemaps.xhtml
module("Texture Maps", {
    setup : function() {
        stop();
        var that = this;
        this.cb = function(e) {
            ok(true, "Scene loaded");
            that.doc = document.getElementById("xml3dframe").contentDocument;
            start();
        };
        loadDocument("scenes/texturemaps.xhtml"+window.location.search, this.cb);
    },
    teardown : function() {
        var v = document.getElementById("xml3dframe");
        v.removeEventListener("load", this.cb, true);
    }
});

test("Phong diffuse texture", 3, function() {
    var xTest = this.doc.getElementById("xml3dTest"), hTest = getHandler(xTest);
    var xRef = this.doc.getElementById("xml3dReference"), hRef = getHandler(xRef);

    this.doc.getElementById("diffuseTexture").visible = true;
    this.doc.getElementById("diffuseColor").visible = true;
    hTest.draw();
    hRef.draw();

    var docu = this.doc;
    testFunc = function(n) {
        XML3DUnit.loadSceneTestImages(docu, "xml3dReference", "xml3dTest", function(refImage, testImage){
            QUnit.imageEqual(refImage, testImage, "Diffuse texture matches");

            start();
        });
    };
    // TODO: Remove this disgusting hack once the 'loaded' events are in
    setTimeout(testFunc, 100);

    stop();

});

test("Phong specular texture", 3, function() {
    var xTest = this.doc.getElementById("xml3dTest"), hTest = getHandler(xTest);
    var xRef = this.doc.getElementById("xml3dReference"), hRef = getHandler(xRef);

    this.doc.getElementById("specularTexture").visible = true;
    this.doc.getElementById("specularColor").visible = true;
    hTest.draw();
    hRef.draw();

    var docu = this.doc;
    testFunc = function(n) {
        XML3DUnit.loadSceneTestImages(docu, "xml3dReference", "xml3dTest", function(refImage, testImage){
            QUnit.imageClose(refImage, testImage, 1, "Specular texture matches");

            start();
        });
    };

    setTimeout(testFunc, 100);
    stop();

});

test("Phong emissive texture", 3, function() {
    var xTest = this.doc.getElementById("xml3dTest"), hTest = getHandler(xTest);
    var xRef = this.doc.getElementById("xml3dReference"), hRef = getHandler(xRef);

    this.doc.getElementById("emissiveTexture").visible = true;
    this.doc.getElementById("emissiveColor").visible = true;
    hTest.draw();
    hRef.draw();

    var docu = this.doc;
    testFunc = function(n) {
        XML3DUnit.loadSceneTestImages(docu, "xml3dReference", "xml3dTest", function(refImage, testImage){
            QUnit.imageEqual(refImage, testImage, "Emissive texture matches");

            start();
        });
    };

    setTimeout(testFunc, 100);

    stop();

});

test("Diffuse emissive texture", 3, function() {
    var xTest = this.doc.getElementById("xml3dTest"), hTest = getHandler(xTest);
    var xRef = this.doc.getElementById("xml3dReference"), hRef = getHandler(xRef);

    this.doc.getElementById("diffuseEmissiveTexture").visible = true;
    this.doc.getElementById("diffuseEmissiveColor").visible = true;
    hTest.draw();
    hRef.draw();

    var docu = this.doc;
    testFunc = function(n) {
        XML3DUnit.loadSceneTestImages(docu, "xml3dReference", "xml3dTest", function(refImage, testImage){
            QUnit.imageEqual(refImage, testImage, "Emissive texture matches");

            start();
        });
    };

    setTimeout(testFunc, 100);
    stop();

});
