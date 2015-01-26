(function(){
	
	
    Xflow.FSProgram = function(operatorList){
        this.list = operatorList;
        this._outputInfo = {};
        setOutputIterate(this);
        this._fsShaderData = {};
    }
    
    
    Xflow.FSProgram.prototype.getOutputNames = function(){
        return Object.keys(this._outputInfo);
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
	
}());