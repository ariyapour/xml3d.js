(function(){


//----------------------------------------------------------------------------------------------------------------------
// Xflow.ProcessNode
//----------------------------------------------------------------------------------------------------------------------

/**
 * @constructor
 * @extends {Xflow.GraphNode}
 */
Xflow.ProcessNode = function(channelNode, operator, substitution){
    this.owner = channelNode;
    this.operator = operator;
    this.inputChannels = {};
    this.outputDataSlots = {};
    this.status = Xflow.PROCESS_STATE.MODIFIED;
    this.useCount = 0;

    this.children = [];
    this.descendants = [];
    this.channelListener = this.onChannelChange.bind(this);
    this.executers = [];
    constructProcessNode(this, channelNode, operator, substitution);
};
var ProcessNode = Xflow.ProcessNode;

ProcessNode.prototype.onChannelChange = function(channel, state){
    if(state == Xflow.DATA_ENTRY_STATE.CHANGED_VALUE &&
        this.status > Xflow.PROCESS_STATE.UNPROCESSED)
        this.status = Xflow.PROCESS_STATE.UNPROCESSED;
    else if(state == Xflow.DATA_ENTRY_STATE.CHANGED_SIZE)
        this.status = Xflow.PROCESS_STATE.MODIFIED;
    for(var name in this.outputDataSlots){
        this.outputDataSlots[name].notifyOnChange(state);
    }
}

ProcessNode.prototype.clear = function(){
    for(var name in this.inputChannels){
        this.inputChannels[name].removeListener(this.channelListener);
    }
}

ProcessNode.prototype.updateState = function(){
    if(this.status == Xflow.PROCESS_STATE.MODIFIED){
        this.status = Xflow.PROCESS_STATE.UNPROCESSED

        if(this.owner.loading)
            this.status = Xflow.PROCESS_STATE.LOADING;
        else{
            for(var i = 0; i < this.children.length; ++i){
                this.status = Math.min(this.status, this.children[i].updateState());
            }
            if(this.status > Xflow.PROCESS_STATE.LOADING && isInputLoading(this.operator, this.inputChannels))
                this.status = Xflow.PROCESS_STATE.LOADING;

            if(this.status > Xflow.PROCESS_STATE.INVALID &&
                !checkInput(this.operator, this.owner.owner._computeInputMapping, this.inputChannels))
                this.status = Xflow.PROCESS_STATE.INVALID;
        }
    }
    return this.status;
}

ProcessNode.prototype.process = function(){
    // TODO: Fix this with respect to states
    if(this.status == Xflow.PROCESS_STATE.UNPROCESSED){

        var executer = getOrCreateExecuter(this, Xflow.PLATFORM.JAVASCRIPT);
        executer.run();

        this.status = Xflow.PROCESS_STATE.PROCESSED;
    }
}

function constructProcessNode(processNode, channelNode, operator, substitution){
    var dataNode = channelNode.owner;
    synchronizeInputChannels(processNode, channelNode, dataNode, substitution);
    synchronizeChildren(processNode.children, processNode.descendants, processNode.inputChannels);
    synchronizeOutput(processNode.operator, processNode.outputDataSlots);
}

function synchronizeInputChannels(processNode, channelNode, dataNode, substitution){
    var operator = processNode.operator, inputMapping = dataNode._computeInputMapping;
    for(var i = 0; i < operator.params.length; ++i){
        var sourceName = operator.params[i].source;
        var dataName = inputMapping.getScriptInputName(i, sourceName);
        if(dataName){
            var channel = channelNode.inputChannels.getChannel(dataName, substitution);
            if(channel) channel.addListener(processNode.channelListener);
            processNode.inputChannels[sourceName] = channel;
        }
    }
}

function isInputLoading(operator, inputChannels){
    for(var i in operator.params){
        var entry = operator.params[i];
        var channel = inputChannels[entry.source];
        if(!channel) continue;
        var dataEntry = channel.getDataEntry();
        if(!dataEntry) continue;
        if(dataEntry.isLoading && dataEntry.isLoading()) return true;
    }
    return false;
}

function checkInput(operator, inputMapping, inputChannels){
    for(var i in operator.params){
        var entry = operator.params[i];
        var dataName = inputMapping.getScriptInputName(i, entry.source);
        if(!entry.optional && !dataName){
            XML3D.debug.logError("Xflow: operator " + operator.name + ": Missing input argument for "
                + entry.source);
            return false;
        }
        if(dataName){
            var channel = inputChannels[entry.source];
            if(!channel){
                XML3D.debug.logError("Xflow: operator " + operator.name + ": Input of name '" + dataName +
                    "' not found. Used for parameter " + entry.source);
                return false;
            }
            var dataEntry = channel.getDataEntry();

            if(!channel.creatorProcessNode){
                if(!entry.optional && (!dataEntry || dataEntry.isEmpty())){
                    XML3D.debug.logError("Xflow: operator " + operator.name + ": Input for " + entry.source +
                        ' contains no data.');
                    return false;
                }
            }
            if(dataEntry && dataEntry.type != entry.type){
                XML3D.debug.logError("Xflow: operator " + operator.name + ": Input for " + entry.source +
                    " has wrong type. Expected: " + Xflow.getTypeName(entry.type)
                    + ", but got: " +  Xflow.getTypeName(dataEntry.type) );
                return false;
            }
        }
    }
    return true;
}

function synchronizeChildren(children, descendants, inputChannels){
    var channel, idx;
    for(var name in inputChannels){
        channel = inputChannels[name];
        if(channel && channel.creatorProcessNode){
            Xflow.utils.setAdd(children, channel.creatorProcessNode);
            Xflow.utils.setAdd(descendants, channel.creatorProcessNode.descendants);
        }
    }
    Xflow.utils.setRemove(children, descendants);
    Xflow.utils.setAdd(descendants, children);
}

function synchronizeOutput(operator, outputs){
    for(var i in operator.outputs){
        var d = operator.outputs[i];

        var entry;
        var type = d.type;
        if(type != Xflow.DATA_TYPE.TEXTURE){
            entry = new Xflow.BufferEntry(type, null);
        }
        else{
            entry = window.document ? new Xflow.TextureEntry(null) : new Xflow.ImageDataTextureEntry(null);
        }
        outputs[d.name] = new Xflow.DataSlot(entry, 0);
    }
}

function getOrCreateExecuter(node, platform){
    if(!node.executers[platform]){
        node.executers[platform] = new Xflow.Executer(node, platform);
    }
    return node.executers[platform];

}


//----------------------------------------------------------------------------------------------------------------------
// Xflow.RequestNode
//----------------------------------------------------------------------------------------------------------------------
/**
 * @constructor
 * @param channelNode
 * @param filter
 */
Xflow.RequestNode = function(channelNode, filter){
    this.owner = channelNode;
    this.filter = filter;
    this.results = {};

    this.status = Xflow.PROCESS_STATE.MODIFIED;

    this.channels = {};
    this.children = [];

    this.channelListener = this.onChannelChange.bind(this);

    this.executers = [];

    this.outOfSync = true;
}
var RequestNode = Xflow.RequestNode;

RequestNode.prototype.synchronize = function(){
    if(this.outOfSync){
        this.outOfSync = false;
        synchronizeRequestChannels(this, this.owner);
        synchronizeChildren(this.children, [], this.channels);
    }
}

RequestNode.prototype.updateState = function(){
    this.synchronize();
    if(this.status == Xflow.PROCESS_STATE.MODIFIED){
        this.status = Xflow.PROCESS_STATE.UNPROCESSED

        if(this.owner.loading)
            this.status = Xflow.PROCESS_STATE.LOADING;
        else{
            for(var i = 0; i < this.children.length; ++i){
                this.status = Math.min(this.status, this.children[i].updateState());
            }
        }
    }
    return this.status;
}

RequestNode.prototype.isReady = function(){
    this.updateState();
    return this.status >= Xflow.PROCESS_STATE.UNPROCESSED;
}

RequestNode.prototype.getResult = function(resultType){
    this.updateState();
    if(this.status == Xflow.PROCESS_STATE.UNPROCESSED){

        var executer = getOrCreateExecuter(this, Xflow.PLATFORM.JAVASCRIPT);
        executer.run();

        this.status = Xflow.PROCESS_STATE.PROCESSED;
    }
    var result = null;
    if(resultType == Xflow.RESULT_TYPE.COMPUTE){
        result = getRequestComputeResult(this);
    }
    result.loading = (this.status == Xflow.PROCESS_STATE.LOADING);
    return result;
}

RequestNode.prototype.setStructureOutOfSync = function(){
    this.outOfSync = true;
    this.status = Xflow.PROCESS_STATE.MODIFIED;
    for(var type in this.results){
        this.results[type].notifyChanged(Xflow.RESULT_STATE.CHANGED_STRUCTURE);
    }
    for(var name in this.channels){
        this.channels[name].removeListener(this.channelListener);
    }
    this.channels = [];
    this.children = [];
    this.executers = [];
}

RequestNode.prototype.onChannelChange = function(channel, state){
    this.status = Xflow.PROCESS_STATE.MODIFIED;
    var notifyState = (state == Xflow.DATA_ENTRY_STATE.CHANGED_VALUE ? Xflow.RESULT_STATE.CHANGED_DATA_VALUE
            : Xflow.RESULT_STATE.CHANGED_DATA_SIZE);

    for(var type in this.results){
        this.results[type].notifyChanged(notifyState);
    }
}

function synchronizeRequestChannels(requestNode, channelNode){
    var names = requestNode.filter;
    if(!names){
        names = [];
        for(var name in channelNode.finalOutputChannels.map){
            names.push(name);
        }
    }

    for(var i = 0; i < names.length; ++i){
        var name = names[i];
        var channel = channelNode.finalOutputChannels.getChannel(name);
        if(channel){
            requestNode.channels[name] = channel;
            channel.addListener(requestNode.channelListener);
        }

    }
}

function getRequestComputeResult(requestNode)
{
    if(!requestNode.results[Xflow.RESULT_TYPE.COMPUTE])
        requestNode.results[Xflow.RESULT_TYPE.COMPUTE] = new Xflow.ComputeResult();
    var result = requestNode.results[Xflow.RESULT_TYPE.COMPUTE];
    result._dataEntries = {}; result._outputNames = [];
    for(var name in requestNode.channels){
        var entry = requestNode.channels[name].getDataEntry();
        result._dataEntries[name] = entry && !entry.isEmpty() ? entry : null;
        result._outputNames.push(name);
    }
    return result;
}


})();

