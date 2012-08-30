(function(){

var DataNode = Xflow.DataNode;


function getForwardNode(dataNode){
    if(!dataNode._filterMapping.isEmpty()  || dataNode._computeOperator)
        return null;
    if(dataNode._sourceNode && dataNode._children.length == 0)
        return dataNode._sourceNode;
    if(dataNode._children.length == 1 && dataNode._children[0] instanceof DataNode)
        return dataNode._children[0];
    return null;
}

DataNode.prototype._initCompute = function(){
    this._results = [];
    this._dataMap = {};
    this._dirty = true;
}

DataNode.prototype._updateComputeCache = function(state){
    this._results = [];
    this._dataMap = {};
    this._dirty = true;
}

DataNode.prototype._getComputeResult = function(filter){
    var forwardNode = getForwardNode(this);
    if(forwardNode)
        return forwardNode._getOutputs(filter);

    var key = filter.join(";");
    if(this._results[key])
        return this._results[key];
    return this._createOutput(key)
}

DataNode.prototype._createComputeResult = function(filter){
    var result = new Xflow.ComputeResult();

    this._populateDataMap();

    for(var i in this._dataMap){
        if(filter.indexOf(i) != -1){
            result._outputNames.push(i);
            result._dataEntries[i] = this._dataMap[i];
        }
    }

}
DataNode.prototype._populateDataMap = function(){
    if(!this._dirty) return;
    this._dirty = false;

    // Prepare input:
    var inputMap = {};
    if(this._sourceNode){
        transferDataMap(inputMap, this._sourceNode);
    }
    else{
        for(var i in this._children){
            if(this._children[i] instanceof Xflow.DataNode){
                transferDataMap(inputMap, this._children[i]);
            }
        }
        for(var i in this._children){
            if(this._children[i] instanceof Xflow.InputNode){
                var inputNode = this._children[i];
                inputMap[inputNode._name] = inputMap._data;
            }
        }
    }
    // TODO: Apply script here:
    this._filterMapping.applyFilterOnMap(this._dataMap, inputMap, this._filterType);
}

function transferDataMap(destMap, node){
    node._populateDataMap();
    for(var i in node._dataMap){
        destMap[i] = node._dataMap[i];
    }
}

})();

