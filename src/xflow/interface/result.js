(function(){
/**
 * Content of this file:
 * Result classes of an Xflow graph which are received through Requests.
 */

/**
 * Abstract Result structure containing a (processed) result of the Xflow graph.
 * @abstract
 * @param {Xflow.DataNode} dataNode
 * @param {Array.<string>} filter
 */
Xflow.Result = function(){
    this.loading = false;
    this.valid = false;
    this._listeners = [];
    this._requests = [];
};
var Result = Xflow.Result;

/**
 * @param {function(Xflow.Result, Xflow.RESULT_STATE)} callback
 */
Result.prototype.addListener = function(callback){
    this._listeners.push(callback);
};

/**
 * @param {function(Xflow.Result, Xflow.RESULT_STATE)} callback
 */
Result.prototype.removeListener = function(callback){
    Array.erase(this._listeners, callback);
};

/**
 * @param {function(Xflow.Result, Xflow.RESULT_STATE)} callback
 */
Result.prototype._addRequest = function(request){
    this._requests.push(request);
};

/**
 * @param {function(Xflow.Result, Xflow.RESULT_STATE)} callback
 */
Result.prototype._removeRequest = function(request){
    Array.erase(this._requests, request);
};


Result.prototype._notifyChanged = function(state){
    this.valid = false;
    for(var i = 0; i < this._requests.length; ++i){
        this._requests[i]._onResultChanged(this, state);
    }
    Xflow._listCallback(this, state);
}

Result.prototype._onListedCallback = function(state){
    for(var i = 0; i < this._listeners.length; ++i){
        this._listeners[i](this, state);
    }
}



/**
 * ComputeResult contains a named map of typed values.
 * @constructor
 * @extends {Xflow.Result}
 */
Xflow.ComputeResult = function(){
    Xflow.Result.call(this);
    this._outputNames = [];
    /** @type {Object.<string,DataEntry>} */
    this._dataEntries = {};
};
Xflow.createClass(Xflow.ComputeResult, Xflow.Result);
var ComputeResult = Xflow.ComputeResult;

Object.defineProperty(ComputeResult.prototype, "outputNames", {
    set: function(v){
        throw new Error("outputNames is readonly");
    },
    get: function(){ return this._outputNames; }
});

ComputeResult.prototype.getOutputData = function(name){
    return this._dataEntries[name];
};

/**
 * @returns {Object.<string,DataEntry>}
 */
ComputeResult.prototype.getOutputMap = function() {
    return this._dataEntries;
};



/**
 * VSDataResult is used to analyse the output of a VertexShader
 * Note that the VSDataResult is not used to generate the VertexShader directly.
 * For that, the Xflow.VertexShader structure must be created from Xflow.VertexShaderRequest
 * @constructor
 * @extends {Xflow.Result}
 */
Xflow.VSDataResult = function(){
    Xflow.Result.call(this);
    this._program = null;
    this._programData = null;
};
Xflow.createClass(Xflow.VSDataResult, Xflow.Result);
var VSDataResult = Xflow.VSDataResult;

Object.defineProperty(VSDataResult.prototype, "outputNames", {
    set: function(v){
        throw new Error("shaderOutputNames is readonly");
    },
    get: function(){ return this._program.getOutputNames(); }
});

VSDataResult.prototype.isOutputUniform = function(name){
    return this._program.isOutputUniform(name);
}
VSDataResult.prototype.isOutputNull = function(name){
    return this._program.isOutputNull(name);
}
VSDataResult.prototype.getOutputType = function(name){
    return this._program.getOutputType(name);
}
VSDataResult.prototype.getVertexShader = function(vsConfig){
    return this._program.createVertexShader(this._programData, vsConfig);
}


/**
 * FSDataResult is used to analyse the output of a FragmentShader
 * Note that the FSDataResult is not used to generate the FragmentShader directly.
 * For that, the Xflow.FragmentShader structure must be created from Xflow.FragmentShaderRequest
 * @constructor
 * @extends {Xflow.Result}
 */
Xflow.FSDataResult = function(){
    Xflow.Result.call(this);
    this._program = null;
    this._programData = null;
};
Xflow.createClass(Xflow.FSDataResult, Xflow.Result);
var FSDataResult = Xflow.FSDataResult;

Object.defineProperty(FSDataResult.prototype, "outputNames", {
    set: function(v){
        throw new Error("shaderOutputNames is readonly");
    },
    get: function(){ return this._program.getOutputNames(); }
});

FSDataResult.prototype.isOutputUniform = function(name){
    return this._program.isOutputUniform(name);
}
FSDataResult.prototype.isOutputNull = function(name){
    return this._program.isOutputNull(name);
}
FSDataResult.prototype.getOutputType = function(name){
    return this._program.getOutputType(name);
}
FSDataResult.prototype.getFragmentShader = function(){
    return this._program.createFragmentShader(this._programData);
}

FSDataResult.prototype.getOutputMap= function(){
	var fastJs = new Xflow.FastJsProgram(this._program.list);
	var extractedParams = Shade.extractParameters(fastJs.func.code,
          {implementation: "xml3d-glsl-forward"}).shaderParameters;
	var request = new Xflow.ComputeRequest(this._requests[0]._fsConnectNode,extractedParams);
//	var dataEntries= request.getResult().getOutputMap();
//	for (entry in dataEntries){
//		if (dataEntries[entry]._deferredName == true)
//			delete dataEntries[entry];
//	}
//	return dataEntries;
	return request.getResult().getOutputMap();
}

})();
