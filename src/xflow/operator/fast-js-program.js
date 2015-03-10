(function(){

//----------------------------------------------------------------------------------------------------------------------
// Xflow.OperatorList
//----------------------------------------------------------------------------------------------------------------------

    Xflow.FastJsProgram = function(operatorList){
        this.func = createFastJsProgram(operatorList);
        this.list = operatorList;
    }

    Xflow.FastJsProgram.prototype.run = function(programData){
        var args = [];
        for(var i = 0; i < programData.outputs.length; ++i){
            var dataEntry = programData.outputs[i].dataEntry;
            args.push(dataEntry ? dataEntry.getValue() : null);
        }
        for(var i = 0; i < programData.inputs.length; ++i){
            var dataEntry = programData.getDataEntry(i);
            args.push(dataEntry ? dataEntry.getValue() : null);
        }
        var iterateCount = this.list.getIterateCount(programData);
        args.push(iterateCount);
        this.func.apply(null, args);
    }

    function createFastJsProgram(operatorList){
    	var parameterMap={};
        var snippetList = Xflow.shadejs.convertOperatorListToSnippets(operatorList,0,operatorList.entries.length,parameterMap);
        var systemParams = {
            "type": "object",
            "kind": "any",
            "info": {}
        };

//        var result = Shade.compileJsProgram(snippetList, systemParams, true);
        var result = Shade.creatFragmentShaderSource(snippetList, systemParams, parameterMap);
//        var func = eval("(" + result.code + ")");
//        return func;
        return result;
    }

}());