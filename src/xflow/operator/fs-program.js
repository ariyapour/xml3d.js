(function(){
	
	
    Xflow.FSProgram = function(operatorList){
        this.list = operatorList;
        this._outputInfo = {};
        setOutputIterate(this);
        this._fsShaderData = {};
    }
    
    
    Xflow.FSProgram.prototype.getOutputNames = function(){
        return this._outputInfo;
    }

    Xflow.FSProgram.prototype.getOutputType = function(name){
        return this._outputInfo[name].type;
    }

    Xflow.FSProgram.prototype.isOutputUniform = function(name){
        return this._outputInfo[name].iteration == Xflow.ITERATION_TYPE.ONE;
    }

    Xflow.FSProgram.prototype.isOutputNull = function(name){
        return this._outputInfo[name].iteration == Xflow.ITERATION_TYPE.NULL;
    }

    Xflow.FSProgram.prototype.createFragmentShader = function(programData, fsConfig){
        var result = new Xflow.FragmentShader(programData);
        var key = fsConfig.getKey();
        if(!this._fsShaderData[key]){
            this._fsShaderData[key] = constructFSShadeJs(this, fsConfig);
        }
        var data = this._fsShaderData[key];
        result._glslCode = data._glslCode;
        result._inputNames = data._inputNames;
        result._outputNames = data._outputNames;
        result._inputInfo = data._inputInfo;
        result._outputInfo = data._outputInfo;
        return result;
    }
    
    
    function setOutputIterate(program){
        var operatorList = program.list, entries = operatorList.entries;

        var baseEntry = entries[entries.length - 1], baseOperator = baseEntry.operator;

        for( var i = 0; i < baseOperator.params.length; ++i) {
            var entry = baseOperator.params[i],
                name = entry.source,
                inputIndex = i,
                directInputIndex = baseEntry.getDirectInputIndex(inputIndex);
            program._outputInfo[name] = {type: entry.type};
            if (baseEntry.inputInfo[inputIndex].mappedName == name){
            	if (baseEntry.inputInfo[inputIndex].deferredName) 
            		program._outputInfo[name].deferred = true;
            	else
            		program._outputInfo[name].deferred = false;
            }
            if(baseEntry.isTransferInput(inputIndex) ||
                operatorList.isInputIterate(directInputIndex)) {
                program._outputInfo[name].iteration = Xflow.ITERATION_TYPE.MANY;
            }
            else if(operatorList.isInputUniform(directInputIndex)) {
                program._outputInfo[name].iteration = Xflow.ITERATION_TYPE.ONE;
            }
            else {
                program._outputInfo[name].iteration = Xflow.ITERATION_TYPE.NULL;
            }
        }
    }
    
    function constructFSShadeJs(program, fsConfig){
        var fs = {
            _glslCode: null,
            _inputNames: [],
            _outputNames: [],
            _inputInfo: {},
            _outputInfo: {}
        }

        var operatorList = program.list, entries = operatorList.entries;
        var baseEntry = entries[entries.length - 1], acceptedBaseShaderInput = [], baseOperator = baseEntry.operator;

        if(!fsConfig)
            throw new Error("Could not find vsConfig! Attempt to create fragment shader programm without FS operator?");

        fs._glslCode = fsConfig._shaderSourceCode;

        for(var inputName in fsConfig._inputIndices){
            Xflow.nameset.add(fs._inputNames, inputName);
            var inputIndex = fsConfig._inputIndices[inputName];
            var uniform = !operatorList.isInputIterate(inputIndex);
            fs._inputInfo[inputName] = { index: inputIndex, uniform: uniform };
        }
        return fs;

    }
	
}());