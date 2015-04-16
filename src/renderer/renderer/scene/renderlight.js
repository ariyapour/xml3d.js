var RenderNode = require("./rendernode.js");
var Constants = require("./constants.js");
var Frustum = require("../tools/frustum.js").Frustum;

var NODE_TYPE = Constants.NODE_TYPE;
var EVENT_TYPE = Constants.EVENT_TYPE;

/** @const */
var XML3D_DIRECTIONALLIGHT_DEFAULT_DIRECTION = XML3D.math.vec3.fromValues(0, 0, -1);
/** @const */
var XML3D_SPOTLIGHT_DEFAULT_DIRECTION = XML3D.math.vec3.fromValues(0, 0, 1);

/** @const */
var LIGHT_DEFAULT_INTENSITY = XML3D.math.vec3.fromValues(1, 1, 1);
/** @const */
var LIGHT_DEFAULT_ATTENUATION = XML3D.math.vec3.fromValues(0, 0, 1);
/** @const */
var POINT_LIGHT_DEFAULT_SHADOW_BIAS = 0.0001;
var SPOT_LIGHT_DEFAULT_SHADOW_BIAS = 0.001;
var DIRECTIONAL_LIGHT_DEFAULT_SHADOW_BIAS = 0.0045;
/** @const */
var SPOTLIGHT_DEFAULT_FALLOFFANGLE = Math.PI / 4.0;
/** @const */
var SPOTLIGHT_DEFAULT_SOFTNESS = 0.0;

/** @const */
var LIGHT_PARAMETERS = ["intensity", "attenuation", "softness", "falloffAngle", "direction", "position", "castShadow", "shadowBias"];

var SHADOWMAP_OFFSET_MATRIX = new Float32Array([0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.5, 0.5, 0.5, 1.0]);

/** @const */
var CLIPPLANE_NEAR_MIN = 1.0;

/** @const */
var ENTRY_SIZE = 16;

/**
 * @constructor
 * @param {Scene} scene
 * @param {Object} pageEntry
 * @param {Object} opt
 * @extends {RenderNode}
 */
var RenderLight = function (scene, pageEntry, opt) {
    RenderNode.call(this, NODE_TYPE.LIGHT, scene, pageEntry, opt);
    opt = opt || {};
    var light = opt.light || {};
    this.light = {
        type: light.type || "directional", data: light.data
    };

    this.intensity = XML3D.math.vec3.clone(LIGHT_DEFAULT_INTENSITY);
    this.srcPosition = XML3D.math.vec3.fromValues(0, 0, 0);
    this.srcDirection = XML3D.math.vec3.clone(XML3D_DIRECTIONALLIGHT_DEFAULT_DIRECTION);
    this.position = XML3D.math.vec3.fromValues(0, 0, 0);
    this.direction = XML3D.math.vec3.clone(XML3D_DIRECTIONALLIGHT_DEFAULT_DIRECTION);
    this.attenuation = XML3D.math.vec3.clone(LIGHT_DEFAULT_ATTENUATION);
    this.castShadow = false;
    this.fallOffAngle = SPOTLIGHT_DEFAULT_FALLOFFANGLE;
    this.userData = null;

    if (this.light.data) {
        // Bounding Box annotated
        this.lightParameterRequest = new Xflow.ComputeRequest(this.light.data, LIGHT_PARAMETERS, this.lightParametersChanged.bind(this));
        this.lightParametersChanged(this.lightParameterRequest, null);
    } else {
        XML3D.debug.logWarning("External light shaders not supported yet"); // TODO
    }

    this.localIntensity = opt.localIntensity !== undefined ? opt.localIntensity : 1.0;
    this.addLightToScene();
};
RenderLight.ENTRY_SIZE = ENTRY_SIZE;

XML3D.createClass(RenderLight, RenderNode);
XML3D.extend(RenderLight.prototype, {

    getFrustum: function (aspect) {
        var orthogonal = this.light.type == "directional";
        var t_mat = XML3D.math.mat4.create();
        var bb = new XML3D.math.bbox.create();
        this.scene.getBoundingBox(bb);

        if (XML3D.math.bbox.isEmpty(bb)) {
            return new Frustum(1.0, 110.0, 0, this.fallOffAngle * 2, aspect, orthogonal)
        }
        this.getWorldToLightMatrix(t_mat);

        XML3D.math.bbox.transform(bb, t_mat, bb);

        var near = 1.0, far = 2.0;
        if (this.light.type == "point") {
            //TODO optimise near ?
            near = 1.0;
            far = Math.max(Math.abs(bb[0]), Math.abs(bb[1]), Math.abs(bb[2]), Math.abs(bb[3]), Math.abs(bb[4]), Math.abs(bb[5]));
        } else {
            near = -bb[5];
            far = -bb[2];
        }
        var expand = Math.max((far - near) * 0.30, 0.05);

        // Expand the view frustum a bit to ensure 2D objects parallel to the camera are rendered
        far += expand;
        near -= expand;
        return new Frustum(1.0, far, 0, this.fallOffAngle * 2, aspect, orthogonal);
    },

    addLightToScene: function () {
        var lightEntry = this.scene.lights[this.light.type];
        if (Array.isArray(lightEntry)) {
            lightEntry.push(this);
            this.lightStructureChanged(false);
        } else {
            XML3D.debug.logError("Unsupported light shader script: urn:xml3d:lightshader:" + this.light.type);
        }
    }, removeLightFromScene: function () {
        var container = this.scene.lights[this.light.type];
        if (Array.isArray(container)) {
            var index = container.indexOf(this);
            if (index > -1) {
                container.splice(container.indexOf(this), 1);
            }
            this.lightStructureChanged(true);
        }
    }, lightParametersChanged: function (request, changeType) {
        // console.log("Light parameters have changed", arguments);
        var result = request.getResult();
        if (result) {
            var entry = result.getOutputData("intensity");
            entry && XML3D.math.vec3.copy(this.intensity, entry.getValue());
            entry = result.getOutputData("attenuation");
            entry && XML3D.math.vec3.copy(this.attenuation, entry.getValue());
            entry = result.getOutputData("position");
            entry && XML3D.math.vec3.copy(this.srcPosition, entry.getValue());
            entry = result.getOutputData("direction");
            entry && XML3D.math.vec3.copy(this.srcDirection, entry.getValue());
            this.updateWorldMatrix();
            entry = result.getOutputData("castShadow");
            if (entry)
                this.castShadow = entry.getValue()[0];
            changeType && this.lightValueChanged();
        }
    }, lightValueChanged: function () {
        this.scene.dispatchEvent({type: EVENT_TYPE.LIGHT_VALUE_CHANGED, light: this});
    }, lightStructureChanged: function (removed) {
        this.scene.dispatchEvent({type: EVENT_TYPE.LIGHT_STRUCTURE_CHANGED, light: this, removed: removed});
    }, getLightData: function (target, offset) {
        var off3 = offset * 3;
        ["position", "direction", "attenuation"].forEach(function (name) {
            if (target[name]) {
                target[name][off3 + 0] = this[name][0];
                target[name][off3 + 1] = this[name][1];
                target[name][off3 + 2] = this[name][2];
            }
        }, this);
        if (target["intensity"]) {
            target["intensity"][off3 + 0] = this.intensity[0] * this.localIntensity;
            target["intensity"][off3 + 1] = this.intensity[1] * this.localIntensity;
            target["intensity"][off3 + 2] = this.intensity[2] * this.localIntensity;
        }
        if (target["on"]) {
            target["on"][offset] = this.visible;
        }
        var result = this.light.data ? this.lightParameterRequest.getResult() : null;
        var data;
        if (target["softness"]) {
            data = result ? result.getOutputData("softness") : null;
            target["softness"][offset] = data ? data.getValue()[0] : SPOTLIGHT_DEFAULT_SOFTNESS;
        }
        if (target["falloffAngle"]) {
            data = result ? result.getOutputData("falloffAngle") : null;
            var fallOffAngle = data ? data.getValue()[0] : SPOTLIGHT_DEFAULT_FALLOFFANGLE;
            target["falloffAngle"][offset] = fallOffAngle;
            this.fallOffAngle = fallOffAngle;
        }
        if (target["castShadow"]) {
            target["castShadow"][offset] = this.castShadow;
            if (this.castShadow) {
                if (target["shadowBias"]) {
                    data = result.getOutputData("shadowBias");
                    if (this.light.type == "point")
                        target["shadowBias"][offset] = data ? data.getValue()[0] : POINT_LIGHT_DEFAULT_SHADOW_BIAS; else if (this.light.type == "spot")
                        target["shadowBias"][offset] = data ? data.getValue()[0] : SPOT_LIGHT_DEFAULT_SHADOW_BIAS; else if (this.light.type == "directional")
                        target["shadowBias"][offset] = data ? data.getValue()[0] : DIRECTIONAL_LIGHT_DEFAULT_SHADOW_BIAS;
                }
                if (target["lightMatrix"]) {
                    var tmp = XML3D.math.mat4.create();
                    this.getShadowMapLightMatrix(tmp);
                    var off16 = offset * 16;
                    for (var i = 0; i < 16; i++) {
                        target["lightMatrix"][off16 + i] = tmp[i];
                    }
                }
                if (target["lightNearFar"]) {
                    var tmpFrustum = this.getFrustum(1);
                    var tmp = XML3D.math.vec2.fromValues(tmpFrustum.nearPlane, tmpFrustum.farPlane);
                    var off2 = offset * 2;
                    for (var i = 0; i < 2; i++) {
                        target["lightNearFar"][off2 + i] = tmp[i];
                    }
                }
            } else {
                target["shadowBias"][offset] = 0;
                var off16 = offset * 16;
                for (var i = 0; i < 16; i++) {
                    target["lightMatrix"][off16 + i] = 0;
                }
            }
        }
    },

    setTransformDirty: function () {
        this.updateWorldMatrix();
    },

    getShadowMapLightMatrix: function (target) {
        var L = XML3D.math.mat4.create();
        this.getWorldToLightMatrix(L);
        var lightProjectionMatrix = XML3D.math.mat4.create();
        this.getFrustum(1).getProjectionMatrix(lightProjectionMatrix);
        XML3D.math.mat4.multiply(target, lightProjectionMatrix, L);
    },

    updateWorldMatrix: (function () {
        var tmp_mat = XML3D.math.mat4.create();
        return function () {
            if (this.parent) {
                this.parent.getWorldMatrix(tmp_mat);
                this.setWorldMatrix(tmp_mat);
                this.updateLightTransformData(tmp_mat);
            }
        }
    })(),

    getWorldToLightMatrix: function (mat4) {
        this.getWorldMatrix(mat4);

        //calculate parameters for corresp. light type
        if (this.light.type == "directional") {
            var bb = new XML3D.math.bbox.create();
            this.scene.getBoundingBox(bb);
            var bbSize = XML3D.math.vec3.create();
            var bbCenter = XML3D.math.vec3.create();
            var off = XML3D.math.vec3.create();
            XML3D.math.bbox.center(bbCenter, bb);
            XML3D.math.bbox.size(bbSize, bb);
            var d = XML3D.math.vec3.len(bbSize); //diameter of bounding sphere of the scene
            XML3D.math.vec3.scale(off, this.direction, -0.55 * d); //enlarge a bit on the radius of the scene
            this.position = XML3D.math.vec3.add(this.position, bbCenter, off);
            this.fallOffAngle = 1.568;// set to a default of PI/2, recalculated later

        } else if (this.light.type == "spot") {
            //nothing to do
        } else if (this.light.type == "point") {
            //this.fallOffAngle = Math.PI/4.0;  //calculated on initialization of renderlight
        } else {
            XML3D.debug.logWarning("Light transformation not yet implemented for light type: " + this.light.type);
        }

        //create new transformation matrix depending on the updated parameters
        XML3D.math.mat4.identity(mat4);
        var lookat_mat = XML3D.math.mat4.create();
        var top_vec = XML3D.math.vec3.fromValues(0.0, 1.0, 0.0);
        if ((this.direction[0] == 0.0) && (this.direction[2] == 0.0)) //check if top_vec colinear with direction
            top_vec = XML3D.math.vec3.fromValues(0.0, 0.0, 1.0);
        var up_vec = XML3D.math.vec3.create();
        var dir_len = XML3D.math.vec3.len(this.direction);
        XML3D.math.vec3.scale(up_vec, this.direction, -XML3D.math.vec3.dot(top_vec, this.direction) / (dir_len * dir_len));
        XML3D.math.vec3.add(up_vec, up_vec, top_vec);
        XML3D.math.vec3.normalize(up_vec, up_vec);
        XML3D.math.mat4.lookAt(lookat_mat, XML3D.math.vec3.fromValues(0.0, 0.0, 0.0), this.direction, up_vec);
        XML3D.math.mat4.invert(lookat_mat, lookat_mat);
        XML3D.math.mat4.translate(mat4, mat4, this.position);
        XML3D.math.mat4.multiply(mat4, mat4, lookat_mat);
        // this.setWorldMatrix(mat4);


        if (this.light.type == "directional") { //adjust foa for directional light - needs world Matrix
            var bb = new XML3D.math.bbox.create();
            this.scene.getBoundingBox(bb);
            XML3D.math.bbox.transform(bb, mat4, bb);
            var bbSize = XML3D.math.vec3.create();
            XML3D.math.bbox.size(bbSize, bb);
            var max = (bbSize[0] > bbSize[1]) ? bbSize[0] : bbSize[1];
            max = 0.55 * (max);//enlarge 10percent to make sure nothing gets cut off
            this.fallOffAngle = Math.atan(max);
        }

        XML3D.math.mat4.invert(mat4, mat4);
    },

    updateLightTransformData: function (transform) {
        switch (this.light.type) {
            case "directional":
                XML3D.math.vec3.copy(this.direction, this.applyTransformDir(this.srcDirection, transform));
                XML3D.math.vec3.copy(this.position, this.applyTransform(this.srcPosition, transform));

                break;
            case "spot":
                XML3D.math.vec3.copy(this.direction, this.applyTransformDir(this.srcDirection, transform));
                XML3D.math.vec3.copy(this.position, this.applyTransform(this.srcPosition, transform));

                break;
            case "point":
                XML3D.math.vec3.copy(this.position, this.applyTransform(this.srcPosition, transform));
        }
        this.lightValueChanged();
    },

    applyTransform: function (vec, transform) { // TODO: closure
        var newVec = XML3D.math.vec4.transformMat4(XML3D.math.vec4.create(), [vec[0], vec[1], vec[2], 1], transform);
        return [newVec[0] / newVec[3], newVec[1] / newVec[3], newVec[2] / newVec[3]];
    },

    applyTransformDir: function (vec, transform) { // TODO: closure
        var newVec = XML3D.math.vec4.transformMat4(XML3D.math.vec4.create(), [vec[0], vec[1], vec[2], 0], transform);
        return [newVec[0], newVec[1], newVec[2]];
    },

    setVisible: function (newVal) {
        var visible = (this.localVisible && newVal);
        if (this.visible != visible) {
            this.visible = visible;
            this.lightValueChanged();
        }
    },

    setLocalIntensity: function (intensity) {
        this.localIntensity = intensity;
        this.lightValueChanged();
    },

    setLightType: function (type) {
        type = type || "directional";
        if (type != this.light.type) {
            this.removeLightFromScene();
            this.light.type = type;
            this.addLightToScene();
        }
    }, remove: function () {
        this.parent.removeChild(this);
        this.removeLightFromScene();
    },


    getWorldSpaceBoundingBox: function (bbox) {
        XML3D.math.bbox.empty(bbox);
    }

});

module.exports = RenderLight;


