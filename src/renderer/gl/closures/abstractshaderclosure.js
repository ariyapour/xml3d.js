(function (webgl) {

    /**
     * A ShaderClosure connects a mesh-specific GLProgram with it's Xflow data
     * @param {GLContext} context
     * @constructor
     */
    var AbstractShaderClosure = function(context) {
        /**
         * @private
         * @type {GLProgramObject|null}
         */
        this.program = null;
        this.context = context;
        /**
         * A flag used by shadercomposer to sort out obsolete shaderclosures
         * @type {boolean}
         */
        this.obsolete = false;
        this.id = "";

        this.uniformCollection = {
            envBase: {},
            envOverride: null,
            sysBase: null
        };

        /**
         * Stores, if the underlying shader has semi-transparencies
         * and thus needs to considered for alpha-blending
         * @type {boolean}
         */
        this.isTransparent = false;

        /**
         * The source of a shader
         * @private
         * @type {{vertex: string, fragment: string}}
         */
        this.source = {
            vertex: "",
            fragment: ""
        }
    };

    Object.defineProperties(AbstractShaderClosure.prototype, {
            attributes: {
                writeable: false,
                get: function() {
                    return this.program ? this.program.attributes : {}
                }
            },
            uniforms: {
                writeable: false,
                get: function() {
                    return this.program ? this.program.uniforms : {}
                }
            },
            samplers: {
                writeable: false,
                get: function() {
                    return this.program ? this.program.samplers : {}
                }
            }
        }
    );
    XML3D.createClass(AbstractShaderClosure, null, {

        equals: function(that) {
            return this.source.vertex === that.source.vertex && this.source.fragment === that.source.fragment;
        },

        hasTransparency: function() {
            return this.isTransparent;
        },

        compile: function () {
            if (!this.source.fragment || !this.source.vertex) {
                XML3D.debug.logError("No source found for shader", this);
                return;
            }

            var programObject = new XML3D.webgl.GLProgramObject(this.context.gl, this.source);
            this.program = programObject;
            this.id = programObject.id;
        },

        bind: function() {
            this.program.bind();
        },

        unbind: function() {
            this.program.unbind();
        },

        isValid: function() {
            return this.program.isValid();
        },

        /**
         * @param {Xflow.ComputeResult} xflowResult
         */
        updateUniformsFromComputeResult: function (xflowResult) {
            var map = xflowResult.getOutputMap();

            var envBase = this.uniformCollection.envBase = {};
            this.setDefaultUniforms(this.uniformCollection.envBase);

            for(var name in map){
            	if (!map[name]._deferredName){
            		var value = webgl.getGLUniformValueFromXflowDataEntry(map[name], this.context);
                	envBase[name] = value;
            	}
            }
            var names = Object.keys(envBase);
            this.setUniformVariables(names, null, this.uniformCollection);

            this.isTransparent = this.getTransparencyFromInputData(map);
        },

        setUniformVariables: function(envNames, sysNames, uniformCollection){
            this.program.setUniformVariables(envNames, sysNames, uniformCollection);
        },

        setSystemUniformVariables: function(sysNames, sysValues){
            this.uniformCollection.sysBase = sysValues;
            this.setUniformVariables(null, sysNames, this.uniformCollection);
        },

        changeUniformVariableOverride: function(prevOverride, newOverride){
            var overrideNames = prevOverride ? Object.keys(prevOverride) : [];
            if(newOverride) overrideNames.push.apply(overrideNames, Object.keys(newOverride));
            this.uniformCollection.envOverride = newOverride;
            this.setUniformVariables(overrideNames, null, this.uniformCollection);
        }
    });

    webgl.AbstractShaderClosure = AbstractShaderClosure;

}(XML3D.webgl));
