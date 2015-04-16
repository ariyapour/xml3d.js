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
//<<<<<<< HEAD
        var snippetList = Xflow.shadejs.convertOperatorListToSnippets(operatorList,0,operatorList.entries.length);
//=======
//        var snippetList = Xflow.shadejs.convertOperatorListToSnippets(operatorList);
//>>>>>>> ariyapour/xflow-shadejs
        var systemParams = {
            "type": "object",
            "kind": "any",
            "info": {}
        };

//<<<<<<< HEAD
        if (operatorList.platform == Xflow.RESULT_TYPE.FS){
        	var result = Shade.creatFragmentShaderSource(snippetList, systemParams);
        	return result;
        }
        else{
	        var result = Shade.compileJsProgram(snippetList, systemParams, true);
	        var func = eval("(" + result.code + ")");
	        return func;
        }
//=======
//        var result = Shade.compileJsProgram(snippetList, systemParams, true);
//        var func = eval("(" + result.code + ")");
//        return func;
//>>>>>>> ariyapour/xflow-shadejs
    }

}());