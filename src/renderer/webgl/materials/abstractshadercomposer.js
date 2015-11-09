var GLScene = require("../scene/glscene.js");
var GLLights = require("../scene/gllights.js");
var MaterialEvents = require("../materials/events.js");
var EventEmitter = require("events").EventEmitter;
var ComputeRequest = require("../../../xflow/interface/request.js").ComputeRequest;
var XC = require("../../../xflow/interface/constants.js");

/**
 * @interface
 */
var IShaderComposer = function () {
};

/**
 * @enum
 */
IShaderComposer.UpdateState = {
    SHADER_UPDATED: 1, SHADER_COMPILED: 2, SHADER_UNCHANGED: 3
};

IShaderComposer.State = {
    OK: 1, NO_SCRIPT: 2, NO_PROGRAM: 3
};

/**
 * @param {scene} scene
 * @param {{}=} opt
 */
IShaderComposer.prototype.update = function (scene, opt) {
};

/**
 *
 * @returns AbstractShaderClosure|null
 */
IShaderComposer.prototype.getShaderClosure = function (scene) {
    return null;
};

/**
 * @returns {Array.<string>}
 */
IShaderComposer.prototype.getRequestFields = function () {
    return [];
};

/**
 * @returns {{}}
 */
IShaderComposer.prototype.getShaderAttributes = function () {
    return {};
};

/**
 * @constructor
 */
var AbstractShaderComposer = function (context, shaderInfo) {
    EventEmitter.call(this);
    this.context = context;
    this.shaderClosures = [];
    this.dataChanged = false;
    this.updateLightValues = false;
    this.request = null;
};

XML3D.createClass(AbstractShaderComposer, EventEmitter, {

    // Implemented by subclass
    setShaderInfo: null,


    updateRequest: function (xflowDataNode) {
        if (this.request) this.request.clear();

        this.request = new ComputeRequest(xflowDataNode, this.getRequestFields(), this.onShaderRequestChange.bind(this));
        this.setShaderRecompile();
    },

    onShaderInfoChanged: function (shaderInfo) {
        this.setShaderInfo(shaderInfo);
        this.setShaderRecompile();
        this.context.requestRedraw("Shader script changed");
    },

    onShaderRequestChange: function (request, changeType) {
        this.dataChanged = true;
        if (changeType == XC.RESULT_STATE.CHANGED_STRUCTURE)
            this.setShaderRecompile();
        this.context.requestRedraw("Shader data changed");
    },

    /**
     * @param {Scene} scene
     * @param {{}=} opt
     */
    update: function (scene, opt) {
        opt = opt || {};
        var that = this;

        // Clean up shaderClosures that are not used!
        var i = this.shaderClosures.length;
        while (i--) {
            if (this.shaderClosures[i].obsolete) this.shaderClosures.splice(i, 1);
        }

        if (!this.shaderClosures.length)
            return;

        if (this.dataChanged) {
            var result = this.getShaderDataResult();
            this.shaderClosures.forEach(function (shader) {
                that.updateClosureFromComputeResult(shader, result);
            });
            this.dataChanged = false;
        }

        if (this.updateLightValues) {
            this.shaderClosures.forEach(function (shader) {
                that.updateClosureFromLightParameters(shader, scene);
            });
        }
    },

    /**
     * @param {AbstractShaderClosure} shaderClosure
     * @param {Xflow.ComputeResult} result
     */
    updateClosureFromComputeResult: function (shaderClosure, result) {
        if (!result || !result.getOutputMap) {
            return;
        }
        shaderClosure.bind();
        shaderClosure.updateUniformsFromComputeResult(result);
    },

    updateClosureFromLightParameters: function (shaderClosure, scene) {
        shaderClosure.bind();
        shaderClosure.setSystemUniformVariables(GLLights.ALL_PARAMETERS, scene.systemUniforms);
    },

    updateSystemUniforms: function (names, scene) {
        this.shaderClosures.forEach(function (shader) {
            shader.bind();
            shader.setSystemUniformVariables(names, scene.systemUniforms);
        });
    },


    createShaderClosure: function () {
        throw new Error("AbstractComposer::createShaderClosure needs to be overridden");
    },

    createObjectDataRequest: function (objectDataNode, callback) {
        throw new Error("AbstractComposer::createObjectDataRequest needs to be overridden");
    },

    distributeObjectShaderData: function (objectRequest, attributeCallback, uniformCallback) {
        throw new Error("AbstractComposer::distributeObjectShaderData needs to be overridden");
    },

    getShaderClosure: function (scene, vsRequest) {
        var shader = this.createShaderClosure();

        try {
            shader.createSources(scene, this.getShaderDataResult(), vsRequest)
        } catch (e) {
            throw new Error("Shader: " + e.message)
        }

        for (var i = 0; i < this.shaderClosures.length; i++) {
            if (this.shaderClosures[i].equals(shader)) {
                this.shaderClosures[i].obsolete = false;
                return this.shaderClosures[i];
            }
        }

        this.initializeShaderClosure(shader, scene);
        return shader;
    },

    initializeShaderClosure: function (shaderClosure, scene) {
        shaderClosure.compile();

        scene.emit(MaterialEvents.MATERIAL_INITIALIZED);
        this.updateClosureFromComputeResult(shaderClosure, this.getShaderDataResult());
        this.updateClosureFromLightParameters(shaderClosure, scene);
        this.shaderClosures.push(shaderClosure);
    },

    setShaderRecompile: function () {

        for (var i = 0; i < this.shaderClosures.length; ++i) {
            this.shaderClosures[i].obsolete = true;
        }
        this.emit(MaterialEvents.MATERIAL_STRUCTURE_CHANGED);
        this.dataChanged = true;
        this.updateLightValues = true;
    },


    /**
     * @returns {Xflow.ComputeResult|null}
     */
    getShaderDataResult: function () {
        return this.request ? this.request.getResult() : null;
    }


});


/**
 * @implements IShaderComposer
 * @constructor
 */
var DefaultComposer = function (context) {
    this.context = context;
};
XML3D.createClass(DefaultComposer, AbstractShaderComposer, {
    update: function () {
    },

    getShaderClosure: function (scene, vsRequest) {
        return this.context.programFactory.getFallbackProgram();
    },

    getShaderAttributes: function () {
        return {color: null, normal: null /* for picking */};
    },

    getRequestFields: function () {
        return ["diffuseColor", "useVertexColor"];
    },

    createObjectDataRequest: function (objectDataNode, callback) {
        return new ComputeRequest(objectDataNode, ["position", "color", "normal", "diffuseColor", "useVertexColor"], callback);
    },

    distributeObjectShaderData: function (objectRequest, attributeCallback, uniformCallback) {
        var result = objectRequest.getResult();

        var dataMap = result.getOutputMap(), requestFields = this.getRequestFields();
        for (var name in dataMap) {
            if (requestFields.indexOf(name) != -1)
                uniformCallback(name, dataMap[name]); else
                attributeCallback(name, dataMap[name]);
        }
    }
});


module.exports = {
    AbstractShaderComposer: AbstractShaderComposer,
    DefaultComposer: DefaultComposer
}

