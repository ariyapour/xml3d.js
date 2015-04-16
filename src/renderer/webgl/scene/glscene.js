var Scene = require("./../../renderer/scene/scene.js");
var DrawableFactory = require("./drawable-factory.js");
var C = require("./../../renderer/scene/constants.js");
var FrustumTest = require("./../../renderer/tools/frustum").FrustumTest;
var ShaderComposerFactory = require("../materials/shadercomposerfactory");

var OPTION_FRUSTUM_CULLING = "renderer-frustumCulling";
var OPTION_SHADEJS_EXTRACT_UNIFORMS = "shadejs-extractUniformExpressions";
var OPTION_SHADEJS_TRANSFORM_SPACES = "shadejs-transformSpaces";
var OPTION_SHADEJS_CACHE = "shadejs-cache";


// All the shader flags
var FLAGS = {};
FLAGS[OPTION_SHADEJS_EXTRACT_UNIFORMS] = {defaultValue: false, recompileOnChange: true};
FLAGS[OPTION_SHADEJS_TRANSFORM_SPACES] = {defaultValue: true, recompileOnChange: true};
FLAGS[OPTION_FRUSTUM_CULLING] = {defaultValue: true, recompileOnChange: false};
FLAGS[OPTION_SHADEJS_CACHE] = {defaultValue: true, recompileOnChange: false};

for (var flag in FLAGS) {
    XML3D.options.register(flag, FLAGS[flag].defaultValue);
}


/**
 *
 * @param {GLContext} context
 * @extends {Scene}
 * @constructor
 */
var GLScene = function (context) {
    Scene.call(this);
    this.context = context;
    this.shaderFactory = new ShaderComposerFactory(context);
    this.drawableFactory = new DrawableFactory();
    this.firstOpaqueIndex = 0;

    /**
     * @type {Array.<RenderObject>}
     */
    this.ready = [];
    this.queue = [];
    this.lightsNeedUpdate = true;
    this.systemUniforms = {};
    this.deferred = window['XML3D_DEFERRED'] || false;
    this.colorClosureSignatures = [];
    this.doFrustumCulling = !!XML3D.options.getValue(OPTION_FRUSTUM_CULLING);
    this.addListeners();
};

XML3D.createClass(GLScene, Scene);



XML3D.extend(GLScene.prototype, {
    remove: function (obj) {
        var index = this.queue.indexOf(obj);
        if (index != -1) {
            this.queue.splice(index, 1);
        }
        index = this.ready.indexOf(obj);
        if (index != -1) {
            this.ready.splice(index, 1);
            if (index < this.firstOpaqueIndex)
                this.firstOpaqueIndex--;
        }
    },

    clear: function () {
        this.ready = [];
        this.queue = [];
    },

    moveFromQueueToReady: function (obj) {
        var index = this.queue.indexOf(obj);
        if (index != -1) {
            this.queue.splice(index, 1);
            if (obj.hasTransparency()) {
                this.ready.unshift(obj);
                this.firstOpaqueIndex++;
            } else {
                this.ready.push(obj);
            }
        }
    },

    moveFromReadyToQueue: function (obj) {
        var index = this.ready.indexOf(obj);
        if (index != -1) {
            this.ready.splice(index, 1);
            if (index < this.firstOpaqueIndex)
                this.firstOpaqueIndex--;
            this.queue.push(obj);
        }
    },

    update: function () {
        if (this.lightsNeedUpdate) {
            this.lightsNeedUpdate = false;
            this.updateLightParameters();
        }

        this.updateObjectsForRendering();
        // Make sure that shaders are updates AFTER objects
        // Because unused shader closures are cleared on update
        this.updateShaders();
    }, updateLightParameters: function () {
        var parameters = this.systemUniforms, lights = this.lights;

        var pointLightData = {
            position: [],
            attenuation: [],
            intensity: [],
            on: [],
            castShadow: [],
            lightMatrix: [],
            shadowBias: [],
            lightNearFar: []
        };
        lights.point.forEach(function (light, index) {
            light.getLightData(pointLightData, index);
        });
        parameters["pointLightPosition"] = pointLightData.position;
        parameters["pointLightAttenuation"] = pointLightData.attenuation;
        parameters["pointLightIntensity"] = pointLightData.intensity;
        parameters["pointLightOn"] = pointLightData.on;
        parameters["pointLightCastShadow"] = pointLightData.castShadow;
        parameters["pointLightMatrix"] = pointLightData.lightMatrix;
        parameters["pointLightShadowBias"] = pointLightData.shadowBias;
        parameters["pointLightNearFar"] = pointLightData.lightNearFar;

        var directionalLightData = {
            direction: [], intensity: [], on: [], castShadow: [], lightMatrix: [], shadowBias: []
        };
        lights.directional.forEach(function (light, index) {
            light.getLightData(directionalLightData, index);
        });
        parameters["directionalLightDirection"] = directionalLightData.direction;
        parameters["directionalLightIntensity"] = directionalLightData.intensity;
        parameters["directionalLightOn"] = directionalLightData.on;
        parameters["directionalLightCastShadow"] = directionalLightData.castShadow;
        parameters["directionalLightMatrix"] = directionalLightData.lightMatrix;
        parameters["directionalLightShadowBias"] = directionalLightData.shadowBias;

        var spotLightData = {
            position: [],
            attenuation: [],
            direction: [],
            intensity: [],
            on: [],
            softness: [],
            falloffAngle: [],
            castShadow: [],
            lightMatrix: [],
            shadowBias: []
        };
        lights.spot.forEach(function (light, index) {
            light.getLightData(spotLightData, index);
        });
        parameters["spotLightAttenuation"] = spotLightData.attenuation;
        parameters["spotLightPosition"] = spotLightData.position;
        parameters["spotLightIntensity"] = spotLightData.intensity;
        parameters["spotLightDirection"] = spotLightData.direction;
        parameters["spotLightOn"] = spotLightData.on;
        parameters["spotLightSoftness"] = spotLightData.softness;
        parameters["spotLightCastShadow"] = spotLightData.castShadow;
        parameters["spotLightMatrix"] = spotLightData.lightMatrix;
        parameters["spotLightShadowBias"] = spotLightData.shadowBias;

        var softFalloffAngle = [];
        for (var i = 0; i < lights.spot.length; i++) {
            softFalloffAngle[i] = spotLightData.falloffAngle[i] * (1.0 - spotLightData.softness[i]);
        }
        // Map both parameters into cosinus space
        parameters["spotLightCosFalloffAngle"] = spotLightData.falloffAngle.map(Math.cos);
        parameters["spotLightCosSoftFalloffAngle"] = softFalloffAngle.map(Math.cos);
    },

    updateSystemUniforms: function (names) {
        this.shaderFactory.updateSystemUniforms(names, this);
    },

    updateShaders: function () {
        this.shaderFactory.update(this);
    },

    updateObjectsForRendering: function () {
        this.forEach(function (obj) {
            obj.updateForRendering();
        });
    },

    forEach: function (func, that) {
        this.queue.slice().forEach(func, that);
        this.ready.slice().forEach(func, that);
    },

    updateReadyObjectsFromActiveView: (function () {
        var c_worldToViewMatrix = XML3D.math.mat4.create();
        var c_viewToWorldMatrix = XML3D.math.mat4.create();
        var c_projMat_tmp = XML3D.math.mat4.create();
        var c_bbox = XML3D.math.bbox.create();
        var c_frustumTest = new FrustumTest();

        return function (aspectRatio) {
            var activeView = this.getActiveView(), readyObjects = this.ready;

            // Update all MV matrices
            activeView.getWorldToViewMatrix(c_worldToViewMatrix);
            readyObjects.forEach(function (obj) {
                obj.updateModelViewMatrix(c_worldToViewMatrix);
                obj.updateModelMatrixN();
                obj.updateModelViewMatrixN();
            });

            this.updateBoundingBox();


            activeView.getProjectionMatrix(c_projMat_tmp, aspectRatio);
            activeView.getViewToWorldMatrix(c_viewToWorldMatrix);

            var frustum = activeView.getFrustum();
            c_frustumTest.set(frustum, c_viewToWorldMatrix);

            for (var i = 0, l = readyObjects.length; i < l; i++) {
                var obj = readyObjects[i];
                obj.updateModelViewProjectionMatrix(c_projMat_tmp);
                obj.getWorldSpaceBoundingBox(c_bbox);
                obj.inFrustum = this.doFrustumCulling ? c_frustumTest.isBoxVisible(c_bbox) : true;
            }
        }
    }()),
    updateReadyObjectsFromMatrices: function (worldToViewMatrix, projectionMatrix) {
        var readyObjects = this.ready;
        for (var i = 0, l = readyObjects.length; i < l; i++) {
            var obj = readyObjects[i];
            obj.updateModelViewMatrix(worldToViewMatrix);
            obj.updateModelMatrixN();
            obj.updateModelViewProjectionMatrix(projectionMatrix);
        }
    },
    addListeners: function () {
        this.addEventListener(C.EVENT_TYPE.SCENE_STRUCTURE_CHANGED, function (event) {
            if (event.newChild !== undefined) {
                this.addChildEvent(event.newChild);
            } else if (event.removedChild !== undefined) {
                this.removeChildEvent(event.removedChild);
            }
        });
        this.addEventListener(C.EVENT_TYPE.VIEW_CHANGED, function (/*event*/) {
            this.context.requestRedraw("Active view changed.");
        });
        this.addEventListener(C.EVENT_TYPE.LIGHT_STRUCTURE_CHANGED, function (/*event*/) {
            this.lightsNeedUpdate = true;
            this.shaderFactory.setLightStructureDirty();
            this.context.requestRedraw("Light structure changed.");
        });
        this.addEventListener(C.EVENT_TYPE.LIGHT_VALUE_CHANGED, function (/*event*/) {
            this.lightsNeedUpdate = true;
            this.shaderFactory.setLightValueChanged();
            this.context.requestRedraw("Light value changed.");
        });
        XML3D.options.addObserver(this.onFlagsChange.bind(this));
    },

    addChildEvent: function (child) {
        if (child.type == C.NODE_TYPE.OBJECT) {
            this.queue.push(child);
            this.context.requestRedraw("Object was added to scene.");
        }
    },

    removeChildEvent: function (child) {
        if (child.type == C.NODE_TYPE.OBJECT) {
            this.remove(child);
            child.dispose();
            this.context.requestRedraw("Object was removed from scene.");
        }
    },

    handleResizeEvent: function (/*width, height*/) {
        this.getActiveView().setProjectionDirty();
    },

    createDrawable: function (obj) {
        return this.drawableFactory.createDrawable(obj, this.context);
    },

    requestRedraw: function (reason) {
        return this.context.requestRedraw(reason);
    },

    onFlagsChange: function (key, value) {
        if (FLAGS[key] && FLAGS[key].recompileOnChange)
            this.shaderFactory.setShaderRecompile();
        if (key == OPTION_FRUSTUM_CULLING) {
            this.doFrustumCulling = !!value;
        }
    }
});
module.exports = GLScene;

