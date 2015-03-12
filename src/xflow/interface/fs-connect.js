(function(){



/**
 * The output configuration of a FragmentShader generated by Xflow.
 * @constructor
 */
Xflow.FSConfig = function(shaderCode){
    this._shaderSourceCode = shaderCode;
};



Xflow.FSConfig.prototype.getKey = function(){
    return this._shaderSourceCode;
}

var c_fs_operator_cache = {};

Xflow.FSConfig.prototype.getOperator = function(xflowNode){
    var key = this.getKey();
    if(c_fs_operator_cache[key])
    return c_fs_operator_cache[key];

    var converter = new Shade.SnippetConverter();
    var convertedShaderCode = converter.convertShaderToSnippedAst(this._shaderSourceCode);
    
    var outputs = [], params = [], glslCode = convertedShaderCode.code;
    name = "FSConnect";
    
    for (var param in convertedShaderCode.params){
    	var name = convertedShaderCode.params[param];
    	var attr = xflowNode.getOutputChannelInfo(name);
    	if (attr)
    		type = Xflow.getTypeName(attr.type);
    	else
    		type ="float"; // it doesnt matter if it is right type pr not. Shadejs will figure it out
		params.push( { type: type, source: name,optional: false} ); 
		name += "T" + type + "N" + name + "O" + false + ".";	
    }
    outputs.push( { type: "float4", name: "output"} );
    var operator = Xflow.initAnonymousOperator(name,
    {
        outputs: outputs,
        params:  params,
        evaluate_shadejs: glslCode
    });
    c_fs_operator_cache[key] = operator;
    return operator;
}


Xflow.FragmentShader = function(programData){
    this._programData = programData;
    this._glslCode = null;
    this._inputNames = [];
    this._outputNames = [];
    this._inputInfo = {};
    this._outputInfo = {};
}

Object.defineProperty(Xflow.FragmentShader.prototype, "inputNames", {
    set: function(v){
        throw new Error("inputNames is readonly");
    },
    get: function(){ return this._inputNames; }
});

Object.defineProperty(Xflow.FragmentShader.prototype, "outputNames", {
    set: function(v){
        throw new Error("outputNames is readonly");
    },
    get: function(){ return this._outputNames; }
});

Xflow.FragmentShader.prototype.isInputUniform = function(name){
    return this._inputInfo[name].uniform;
}
Xflow.FragmentShader.prototype.getInputData = function(name){
    return this._programData.getDataEntry(this._inputInfo[name].index);
}

Xflow.FragmentShader.prototype.isOutputNull = function(name){
    return this._outputInfo[name].iteration == Xflow.ITERATION_TYPE.NULL;
}
Xflow.FragmentShader.prototype.isOutputFragmentUniform = function(name){
    return this._outputInfo[name].iteration == Xflow.ITERATION_TYPE.ONE;
}
Xflow.FragmentShader.prototype.getUniformOutputData = function(name){
    return this._programData.getDataEntry(this._outputInfo[name].index);
}
Xflow.FragmentShader.prototype.getOutputType = function(name){
    return this._outputInfo[name].type;
}
Xflow.FragmentShader.prototype.getOutputSourceName = function(name){
    return this._outputInfo[name].sourceName;
}
Xflow.FragmentShader.prototype.getGLSLCode = function(){
    return this._glslCode;
}


}());