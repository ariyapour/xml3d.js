module("system parameters tests", {

});

test("Change user defined system node", 5, function() {
  stop();

  var frameLoaded = Q.fcall(promiseIFrameLoaded, "scenes/system-parameters.html");

  var changeFunction = function(f) {
    return function(scene) {
      scene.ownerDocument.defaultView[f]();
      return scene;
    }
  };

  var checkInit = frameLoaded.then(function(doc) { return doc.querySelector("xml3d") }).then(promiseSceneRendered).then(function (s) {
    var pick = XML3DUnit.getPixelValue(getContextForXml3DElement(s),256,256);
    QUnit.closeArray(pick, [0, 255, 0, 255], PIXEL_EPSILON, "Green");
    return s;
  });

  var setSysXml3d = checkInit.then(changeFunction("setSysXml3d")).then(promiseSceneRendered).then(function (s) {
    var pick = XML3DUnit.getPixelValue(getContextForXml3DElement(s), 256, 256);
    QUnit.closeArray(pick, [255, 0, 0, 255], PIXEL_EPSILON, "Changed user defined node. Should be red now.");
    return s;
  });

  var removeSysNode = setSysXml3d.then(changeFunction("removeSysNode")).then(promiseSceneRendered).then(function (s) {
    var pick = XML3DUnit.getPixelValue(getContextForXml3DElement(s), 256, 256);
    QUnit.closeArray(pick, [0, 255, 0, 255], PIXEL_EPSILON, "Removed sys flag from input node. Should be green now.");
    return s;
  });

  var setSysNode = removeSysNode.then(changeFunction("setSysNode")).then(promiseSceneRendered).then(function (s) {
    var pick = XML3DUnit.getPixelValue(getContextForXml3DElement(s), 256, 256);
    QUnit.closeArray(pick, [255, 0, 0, 255], PIXEL_EPSILON, "Set sys flag from input node. Should be red now.");
    return s;
  });

  //How do I check if the collor is changing?
  var removeSysXml3d = setSysNode.then(changeFunction("removeSysXml3d")).then(promiseSceneRendered).then(function (s) {
    return s;
  });
  removeSysXml3d.fin(QUnit.start).done();

});
