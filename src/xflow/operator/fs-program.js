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
//    	var fragmentShader = program.createFragmentShader(programData, fsConfig);
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
            throw new Error("Could not find vsConfig! Attempt to create vertex shader programm without VS operator?");

//        var snippetList = Xflow.shadejs.convertOperatorListToSnippets(operatorList, 0, entries.length);
//        var fsSnippet = constructfsSnippet(fsConfig, baseEntry, operatorList, fs);
//        snippetList.addEntry(fsSnippet);

        // TODO: Make System params fetching independent of webgl namespace.
//        var systemParams = XML3D.webgl.getJSSystemConfiguration(this.context);
//        var result = Shade.creatFragmentShaderSource(snippetList, systemParams);
        fs._glslCode = fsConfig._shaderSourceCode;

        for(var inputName in fsConfig._inputIndices){
            Xflow.nameset.add(fs._inputNames, inputName);
            var inputIndex = fsConfig._inputIndices[inputName];
            var uniform = !operatorList.isInputIterate(inputIndex);
            fs._inputInfo[inputName] = { index: inputIndex, uniform: uniform };
        }
        return fs;

    }
    
    function constructfsSnippet(fsConfig, baseEntry, operatorList, fs){
        var snippetArgs = [];
        var returnEntries = [];

        var snippet = new Shade.SnippetEntry();
        var inputIndex = 0, outputIndex = 0;
        var baseOperator = baseEntry.operator;
        fs._outputInfo=baseEntry.outputInfo;
        for( var name in vsConfig._attributes){
            var configAttr = vsConfig._attributes[name],
                isTransfer = baseEntry.isTransferInput(inputIndex),
                directInputIndex = isTransfer ? null : baseEntry.getDirectInputIndex(inputIndex),
                isIterate = !isTransfer && operatorList.isInputIterate(directInputIndex);
            var usedInput = false;
            var shadeJsType = Xflow.shadejs.convertFromXflow(configAttr.type, null);
            for(var i = 0; i < configAttr.channeling.length; ++i){
                var channeling = configAttr.channeling[i];
                var outputInfo = {type: configAttr.type, iteration: 0, index: 0, sourceName: name},
                    outputName = channeling.outputName;
                if( channeling.code || isTransfer || isIterate)
                {
                    usedInput = true;
                    if(channeling.code)
                        returnEntries.push("\"" + outputName + "\" : " + channeling.code);
                    else
                        returnEntries.push("\"" + outputName + "\" : " + name);
                    if(outputName != "_glPosition"){
                        outputInfo.iteration = Xflow.ITERATION_TYPE.MANY;
                        snippet.addFinalOutput(Xflow.shadejs.convertFromXflow(configAttr.type, null),
                            outputName, outputIndex);
                        outputIndex++;
                    }

                }
                else if(operatorList.isInputUniform(directInputIndex)){
                    outputInfo.iteration = Xflow.ITERATION_TYPE.ONE;
                    outputInfo.index = directInputIndex;
                }
                else{
                    outputInfo.iteration = Xflow.ITERATION_TYPE.NULL;
                }
                if(outputName != "_glPosition"){
                    Xflow.nameset.add(vs._outputNames, outputName);
                    vs._outputInfo[outputName] = outputInfo;
                }

            }
            if(usedInput){
                snippetArgs.push(name);
                if(isTransfer){
                    snippet.addTransferInput(shadeJsType, baseEntry.getTransferInputOperatorIndex(inputIndex),
                            baseEntry.getTransferInputOutputIndex(inputIndex));
                }
                else if(isIterate){
                    snippet.addVertexInput(shadeJsType, directInputIndex);
                }
                else{
                    snippet.addUniformInput(shadeJsType, directInputIndex);
                }
            }

            inputIndex++;
        }
      

        var functionBody = " return {\n    " + returnEntries.join(",\n    ") + "\n}";
        snippetArgs.push(functionBody);
        var snippetFunc = Function.apply(null, snippetArgs);
        snippet.setAst(Shade.getSnippetAst(snippetFunc));
        return snippet;
    }
	
}());