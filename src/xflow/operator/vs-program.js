(function(){

//----------------------------------------------------------------------------------------------------------------------
// Xflow.OperatorList
//----------------------------------------------------------------------------------------------------------------------

    var c_SHADER_CONSTANT_TYPES = {}
    c_SHADER_CONSTANT_TYPES[Xflow.SHADER_CONSTANT_KEY.OBJECT_ID] = 'int';
    c_SHADER_CONSTANT_TYPES[Xflow.SHADER_CONSTANT_KEY.SCREEN_TRANSFORM] = 'mat4';
    c_SHADER_CONSTANT_TYPES[Xflow.SHADER_CONSTANT_KEY.SCREEN_TRANSFORM_NORMAL] = 'mat3';
    c_SHADER_CONSTANT_TYPES[Xflow.SHADER_CONSTANT_KEY.VIEW_TRANSFORM] = 'mat4';
    c_SHADER_CONSTANT_TYPES[Xflow.SHADER_CONSTANT_KEY.VIEW_TRANSFORM_NORMAL] = 'mat3';
    c_SHADER_CONSTANT_TYPES[Xflow.SHADER_CONSTANT_KEY.WORLD_TRANSFORM] = 'mat4';
    c_SHADER_CONSTANT_TYPES[Xflow.SHADER_CONSTANT_KEY.WORLD_TRANSFORM_NORMAL] = 'mat3';

    Xflow.VSProgram = function(operatorList){
        this.list = operatorList;
        this._outputInfo = {};
        setOutputIterate(this);
    }

    Xflow.VSProgram.prototype.getOutputNames = function(){
        return Object.keys(this._outputInfo);
    }

    Xflow.VSProgram.prototype.getOutputType = function(name){
        return this._outputInfo[name].type;
    }

    Xflow.VSProgram.prototype.isOutputUniform = function(name){
        return this._outputInfo[name].iteration == Xflow.ITERATION_TYPE.ONE;
    }

    Xflow.VSProgram.prototype.isOutputNull = function(name){
        return this._outputInfo[name].iteration == Xflow.ITERATION_TYPE.NULL;
    }

    Xflow.VSProgram.prototype.createVertexShader = function(programData, vsConfig){
        // TODO: ... Please try to cache code generation here. Code generation does not seem to depend on programData
        var result = new Xflow.VertexShader(programData);
        constructVSShadeJs(result, this, vsConfig);
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

    function constructVSShadeJs(vs, program, vsConfig){
        var operatorList = program.list, entries = operatorList.entries;
        var baseEntry = entries[entries.length - 1], acceptedBaseShaderInput = [], baseOperator = baseEntry.operator;

        if(!vsConfig)
            throw new Error("Could not find vsConfig! Attempt to create vertex shader programm without VS operator?");

        var snippetList = convertOperatorListToSnippets(operatorList, 0, entries.length-1);
        var vsSnippet = constructVsSnippet(vsConfig, baseEntry, operatorList, vs);
        snippetList.addEntry(vsSnippet);

        // TODO: Make System params fetching independent of webgl namespace.
        var systemParams = XML3D.webgl.getJSSystemConfiguration(this.context);
        var result = Shade.compileVertexShader(snippetList, systemParams);
        vs._glslCode = result.code;

        for(var inputName in result.inputIndices){
            Xflow.nameset.add(vs._inputNames, inputName);
            var inputIndex = result.inputIndices[inputName];
            var uniform = !operatorList.isInputIterate(inputIndex);
            vs._inputInfo[inputName] = { index: inputIndex, uniform: uniform };
        }

    }

    function constructVsSnippet(vsConfig, baseEntry, operatorList, vs){
        var snippetArgs = [];
        var returnEntries = [];

        var snippet = new Shade.SnippetEntry();
        var inputIndex = 0, outputIndex = 0;
        var baseOperator = baseEntry.operator;
        for( var name in vsConfig._attributes){
            var configAttr = vsConfig._attributes[name],
                isTransfer = baseEntry.isTransferInput(inputIndex),
                directInputIndex = isTransfer ? null : baseEntry.getDirectInputIndex(inputIndex),
                isIterate = !isTransfer && operatorList.isInputIterate(directInputIndex);
            var usedInput = false;
            var shadeJsType = Xflow.convertXflowToShadeType(configAttr.type, null);
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
                        snippet.addFinalOutput(Xflow.convertXflowToShadeType(configAttr.type, null),
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

    function convertOperatorListToSnippets(operatorList, startIndex, endIndex){
        var snippetList = new Shade.SnippetList();
        var entries = operatorList.entries;

        if(startIndex === undefined) startIndex = 0;
        if(endIndex === undefined) endIndex = entries.length;

        for(var i = startIndex; i < endIndex; ++i){
            var entry = entries[i], operator = entry.operator;

            var snippet = new Shade.SnippetEntry();
            snippet.setAst(Shade.getSnippetAst(operator.evaluate_glsl));

            for(var j = 0; j < operator.outputs.length; ++j){
                var outputEntry = operator.outputs[j];
                var shadeJsType = Xflow.convertXflowToShadeType(outputEntry.type, null);
                if(entry.isFinalOutput(j)){
                    snippet.addFinalOutput(shadeJsType, outputEntry.name, entry.getOutputIndex(j));
                }
                else{
                    snippet.addLostOutput(shadeJsType, outputEntry.name);
                }
            }
            for(var j = 0; j < operator.mapping.length; ++j){
                var mappingEntry = operator.mapping[j];
                var shadeJsType = Xflow.convertXflowToShadeType(mappingEntry.internalType, null);
                if(entry.isTransferInput(j)){
                    snippet.addTransferInput(shadeJsType,
                        entry.getTransferInputOperatorIndex(j),
                        entry.getTransferInputOutputIndex(j));
                }
                else{
                    var directInputIndex = entry.getDirectInputIndex(j),
                        isIterate = operatorList.isInputIterate(directInputIndex),
                        arrayAccess = mappingEntry.array;
                    if(isIterate)
                        snippet.addVertexInput(shadeJsType, directInputIndex);
                    else if(arrayAccess)
                        snippet.addUniformArray(shadeJsType, directInputIndex, operatorList.getInputSize(directInputIndex));
                    else
                        snippet.addUniformInput(shadeJsType, directInputIndex);
                }
            }
            snippetList.addEntry(snippet);
        }
        return snippetList
    }

    function constructVS(vs, program, vsConfig){
        var operatorList = program.list, entries = operatorList.entries;

        var usedNames = [],
            directInputNames = {},
            transferNames = {};

        var baseEntry = entries[entries.length - 1], acceptedBaseShaderInput = [], baseOperator = baseEntry.operator;

        if(!vsConfig)
            throw new Error("Could not find vsConfig! Attempt to create vertex shader programm without VS operator?");

        Xflow.nameset.add(usedNames, vsConfig.getBlockedNames());

        var code = "";
        code += "// OUTPUT\n"
        // First: collect output names
        for(var name in vsConfig._addOutput){
            var entry = vsConfig._addOutput[name];
            code += "varying " + getGLSLType(entry.type) + " " + name + ";\n";
            Xflow.nameset.add(usedNames, name);
        }
        var inputIndex = 0;
        for( var name in vsConfig._attributes){
            var configAttr = vsConfig._attributes[name],
                directInputIndex = baseEntry.getDirectInputIndex(inputIndex);
            for(var i = 0; i < configAttr.channeling.length; ++i){
                var channeling = configAttr.channeling[i];
                var outputInfo = {type: configAttr.type, iteration: 0, index: 0, sourceName: name},
                    outputName = channeling.outputName;
                if( channeling.code ||
                    baseEntry.isTransferInput(inputIndex) ||
                    operatorList.isInputIterate(directInputIndex))
                {
                    acceptedBaseShaderInput[inputIndex] = true;
                    outputInfo.iteration = Xflow.ITERATION_TYPE.MANY;
                    var type = baseOperator.outputs[inputIndex].type;
                    code += "varying " + getGLSLType(type) + " " + outputName + ";\n";
                    Xflow.nameset.add(usedNames, outputName);
                    transferNames[baseEntry.getTransferOutputId(i)] = outputName;
                }
                else if(operatorList.isInputUniform(directInputIndex)){
                    outputInfo.iteration = Xflow.ITERATION_TYPE.ONE;
                    outputInfo.index = directInputIndex;
                }
                else{
                    outputInfo.iteration = Xflow.ITERATION_TYPE.NULL;
                }
                Xflow.nameset.add(vs._outputNames, outputName);
                vs._outputInfo[outputName] = outputInfo;
            }
            inputIndex++;
        }
        code += "\n";
        code += "// INPUT\n"
        // Add additional input
        for(var name in vsConfig._addInput){
            var entry = vsConfig._addInput[name];
            code += (entry.uniform ? "uniform " : "attribute " ) + getGLSLType(entry.type) + " " + name + ";\n";
            Xflow.nameset.add(usedNames, name);
        }
        // Second: collect input names
        for(var i = 0; i < entries.length; ++i){
            var entry = entries[i], operator = entry.operator;
            for(var j = 0; j < operator.mapping.length; ++j){
                if( (i < entries.length - 1 || acceptedBaseShaderInput[j]) &&
                        !entry.isTransferInput(j) && !directInputNames[entry.getDirectInputIndex(j)])
                {
                    var mapEntry = operator.mapping[j];
                    var name = getFreeName(mapEntry.name, usedNames), inputIndex = entry.getDirectInputIndex(j),
                        uniform = !operatorList.isInputIterate(inputIndex);
                    vs._inputInfo[name] = { index: inputIndex, uniform: uniform };
                    Xflow.nameset.add(vs._inputNames, name);
                    directInputNames[inputIndex] = name;
                    code += (uniform ? "uniform " : "attribute ") + getGLSLType(mapEntry.internalType) + " " + name;
                    if(mapEntry.array)
                        code += "[" + operatorList.getInputSize(inputIndex) + "]";
                    code += ";\n";
                }
            }
        }

        // Start main
        code += "\n// CODE\n"
        code += "void main(void){\n";

        // Create Code
        for(var i = 0; i < entries.length; ++i){
            var entry = entries[i], operator = entry.operator;
            // Declare transfer output names
            for(var j = 0; j < operator.outputs.length; ++j){
                if(!entry.isFinalOutput(j)){
                    var name = getFreeName(operator.outputs[j].name, usedNames);
                    transferNames[entry.getTransferOutputId(j)] = name;
                    code += "\t" + getGLSLType(operator.outputs[j].type) + " " + name + ";\n";
                }
            }
            // Take Code Fragment
            var codeFragment = convertCodeFragment(operator.evaluate_glsl, entry,
                                    transferNames, directInputNames, usedNames);
            code += codeFragment + "\n";
        }

        // Add attribute channeling code
        var mappingIndex = 0, conversionCode = "";
        for( var name in vsConfig._attributes){
            var entry = vsConfig._attributes[name];
            for(var i = 0; i < entry.channeling.length; ++i){
                var channeling = entry.channeling[i], outputName = channeling.outputName;
                if(vs._outputInfo[outputName].iteration == Xflow.ITERATION_TYPE.MANY){
                    if(channeling.code)
                        conversionCode += "\t" + channeling.code + "\n";
                    else
                        conversionCode += "\t" + outputName + " = #I{" + name + "};\n";
                }
            }
            mappingIndex++;
        }
        for( var i = 0; i < vsConfig._codeFragments.length; ++i){
            conversionCode += "\t" + vsConfig._codeFragments[i] + "\n";
        }
        code += convertCodeFragment(conversionCode, baseEntry, transferNames, directInputNames, usedNames) + "\n";

        code += "}\n";
        vs._glslCode = code;
    }

    function convertCodeFragment(codeFragment, entry, transferNames, directInputNames, usedNames){
        var index, operator = entry.operator;
        while((index = codeFragment.indexOf("#I{")) != -1){
            var end = codeFragment.indexOf("}",index);
            var mappingIndex = getMappingIndex(operator, codeFragment.substring(index+3,end));
            var replaceName = entry.isTransferInput(mappingIndex) ?
                transferNames[entry.getTransferInputId(mappingIndex)] :
                directInputNames[entry.getDirectInputIndex(mappingIndex)];
            codeFragment = codeFragment.substring(0, index) + replaceName + codeFragment.substring(end+1);
        }
        while((index = codeFragment.indexOf("#O{")) != -1){
            var end = codeFragment.indexOf("}",index);
            var outputIndex = getOutputIndex(operator, codeFragment.substring(index+3,end));
            var replaceName = transferNames[entry.getTransferOutputId(outputIndex)];
            codeFragment = codeFragment.substring(0, index) + replaceName + codeFragment.substring(end+1);
        }
        var localNames = [];
        while((index = codeFragment.indexOf("#L{")) != -1){
            var end = codeFragment.indexOf("}",index);
            var key = codeFragment.substring(index+3,end);
            if(!localNames[key]){
                localNames[key] = getFreeName(key, usedNames);
            }
            var replaceName = localNames[key];
            codeFragment = codeFragment.substring(0, index) + replaceName + codeFragment.substring(end+1);
        }
        while((index = codeFragment.indexOf("#G{")) != -1){
            var end = codeFragment.indexOf("}",index);
            var replaceName = codeFragment.substring(index+3,end);
            codeFragment = codeFragment.substring(0, index) + replaceName + codeFragment.substring(end+1);
        }
        return codeFragment;
    }

    function getFreeName(name, usedNames){
        var result = name, i = 1;
        while(usedNames.indexOf(result) != -1){
            result = name + "_" + (++i);
        }
        Xflow.nameset.add(usedNames, result);
        return result;
    }

    function getMappingIndex(operator, name){
        for(var i = 0; i < operator.mapping.length; ++i){
            if(operator.mapping[i].name == name)
                return i;
        }
        throw new Error("Invalid input name '" + name  + "' inside of code fragment" );
    }

    function getOutputIndex(operator, name){
        for(var i = 0; i < operator.outputs.length; ++i){
            if(operator.outputs[i].name == name)
                return i;
        }
    }

    function getGLSLType(xflowType){
        switch(xflowType){
            case Xflow.DATA_TYPE.BOOL : return 'bool';
            case Xflow.DATA_TYPE.BYTE : return 'uint';
            case Xflow.DATA_TYPE.FLOAT : return 'float';
            case Xflow.DATA_TYPE.FLOAT2 : return 'vec2';
            case Xflow.DATA_TYPE.FLOAT3 : return 'vec3';
            case Xflow.DATA_TYPE.FLOAT4 : return 'vec4';
            case Xflow.DATA_TYPE.FLOAT3X3 : return 'mat3';
            case Xflow.DATA_TYPE.FLOAT4X4 : return 'mat4';
            case Xflow.DATA_TYPE.INT : return 'int';
            case Xflow.DATA_TYPE.INT4 : return 'ivec4';
        }
        throw new Error("Type not supported for GLSL " + Xflow.getTypeName(xflowType) );
    }





}());