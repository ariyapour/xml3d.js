var BaseDataAdapter = require("./base.js");
var DataNode = require("../../xflow/interface/graph.js").DataNode;
var Resource = require("../../base/resourcemanager.js").Resource;
var XC = require("../../xflow/interface/constants.js");
var Events = require("../../interface/notification.js");
var dispatchCustomEvent = require("../../utils/misc.js").dispatchCustomEvent;
var AdapterHandle = require("../../base/adapterhandle.js");

/**
 * The DataAdapter implements the
 * DataCollector concept and serves as basis of all DataAdapter classes. In
 * general, a DataAdapter is associated with an element node which uses
 * generic data and should be instantiated via
 * XML3DDataAdapterFactory to ensure proper functionality.
 *
 * @extends Adapter
 * @constructor
 *
 * @param factory
 * @param node
 */
var DataAdapter = function (factory, node) {
    BaseDataAdapter.call(this, factory, node);
    // Node handles for src and proto
    this.xflowDataNode = null;
    this.externalScripts = {};
};
XML3D.createClass(DataAdapter, BaseDataAdapter);

DataAdapter.prototype.init = function () {
	  //Going up in the DOM hierarchy to find XML3D node
  	var xml3dNode = this.node;        	
  	while(xml3dNode.localName != "xml3d"){
  		xml3dNode = xml3dNode.parentNode; 
  	}
      
    //get xml3d data adapter
    var systemDataAdapter= this.factory.getAdapter(xml3dNode);

    this.xflowDataNode = new DataNode(false);
    this.xflowDataNode.addLoadListener(this.onXflowLoadEvent.bind(this));
    this.xflowDataNode.userData = this.node;

    // Setting platform and node type information for a data sequence
    this.xflowDataNode.setPlatform(this.node.getAttribute("platform"));

    this.updateAdapterHandle("src", this.node.getAttribute("src"));
    if(!this.assetData){
        this.xflowDataNode.setFilter(this.node.getAttribute("filter"));
        updateCompute(this);
    }
    recursiveDataAdapterConstruction(this, systemDataAdapter);
};

DataAdapter.prototype.updateAdapterHandle = function(key, url) {
    var oldAdapterHandle = this.getConnectedAdapterHandle(key);

    var adapterHandle = this.getAdapterHandle(url),
        status = (adapterHandle && adapterHandle.status);

    if(oldAdapterHandle == adapterHandle)
        return;
    if (status === AdapterHandle.STATUS.NOT_FOUND) {
        XML3D.debug.logError("Could not find element of url '" + adapterHandle.url + "' for " + key, this.node);
    }
    this.connectAdapterHandle(key, adapterHandle);
    this.connectedAdapterChanged(key, adapterHandle ? adapterHandle.getAdapter() : null, status);
};

DataAdapter.prototype.onXflowLoadEvent = function(node, newLevel, oldLevel){
    if(newLevel == Infinity){
        dispatchCustomEvent(this.node, 'load', false, true, null);
    }
    else if(newLevel > oldLevel){
        dispatchCustomEvent(this.node, 'progress', false, true, null);
    }
};
DataAdapter.prototype.getDataComplete = function(){
    return this.xflowDataNode._children[0].getProgressLevel() == Infinity;
};
DataAdapter.prototype.getDataProgressLevel = function(){
    return this.xflowDataNode._children[0].getProgressLevel();
};

DataAdapter.prototype.addNameToSystemFilter = function(name){
    if (this.xflowDataNode._children.length == 2 ){//check if this data node contains the system node
        var filterMapping =this.xflowDataNode._children[1]._filterMapping;
        filterMapping.setName(filterMapping.length,name);
    }
};


DataAdapter.prototype.removeNameFromSystemFilter = function(name){
    if (this.xflowDataNode._children.length == 2 ){  //check if this data node contains the system node
        var filterMapping =this.xflowDataNode._children[1]._filterMapping;
        filterMapping.removeName(filterMapping._names.indexOf(name));
    }
};
    /** Recursively passing platform information to children of a data node
     *  Requires that the children and the parents of data nodes are defined
     *
     * @param {DataNode} parentNode
     */
function recursiveDataNodeAttrInit(parentNode) {
    var children = parentNode._children, NChildren, i;

    if (children && children.length > 0) {
        NChildren = children.length;

        for (i = NChildren; i--;) {
            if (children[i] instanceof DataNode) {
                children[i].setPlatform(parentNode._platform);
                recursiveDataNodeAttrInit(children[i]);
            }
        }
    }
}

function recursiveDataAdapterConstruction(adapter, systemDataAdapter) {
    /**
     *
     * <data> this is artificial and not visible
        <data> this is the visible dom node
            <float name="time" sys>100</float>
        <data>
        <data src="#sys" filter="keep(time)">
            <float name="time"> 10 </float>
        </data>
      </data>
     */
	var filterNames = []; // Where we store the node names with sys flag set
	var xflowDataNode = new DataNode(false); // Data node to keep the visible dom nodes
	
    for (var child = adapter.node.firstElementChild; child !== null; child = child.nextElementSibling) {
        var subadapter = adapter.factory.getAdapter(child);
        if (subadapter){
        	if (subadapter.getXflowNode){
                	xflowDataNode.appendChild(subadapter.getXflowNode());
        	}else if (subadapter.getScriptType) {
	                var scriptId = subadapter.node.name;
	                if (!scriptId) {
	                    XML3D.debug.logError("Parsing error: Externally referenced operators must have a 'name' attribute matching the name they were registered with. ", subadapter.node);
	                    scriptId = "unknown_operator";
	                }
	                adapter.externalScripts[scriptId] = subadapter;
	                if (subadapter.connectedAdapterHandle) {
	                    adapter.connectAdapterHandle(scriptId, subadapter.connectedAdapterHandle);
	                }
	                adapter.xflowDataNode.setLoading(true);
	            }
            //Here we check for data nodes with sys flag set
        	if (child.sys != undefined){
        	    //Check if a system parameter with this name exists
        	    if (systemDataAdapter.xflowDataNode.getOutputNames().indexOf(child.name)>-1) {
            		filterNames.push(child.name);
                } else {
                    XML3D.debug.logWarning("Parameter "+ child.name + " doesn't exist in global parameters!");
                }
        	}
        }

    }

    addSystemNodeToAdapter(filterNames,adapter,systemDataAdapter.xflowDataNode,xflowDataNode);
    	
    // Passes _platform values to children nodes starting from the node
    // where these attributes are first defined
    if (adapter.xflowDataNode._platform !== null) {
        recursiveDataNodeAttrInit(adapter.getXflowNode());
    }
}

function addSystemNodeToAdapter(filterNames,adapter,systemDataNode,xflowDataNode){
	
	var filter = "keep("+filterNames.join(",")+")";
	var sysData = new DataNode(false);

	sysData.sourceNode = systemDataNode;
	sysData.systemDataNode = true;
	sysData.setFilter(filter);

  adapter.xflowDataNode.appendChild(xflowDataNode);
  adapter.xflowDataNode.appendChild(sysData);
  return;
}

/**
 * The notifyChanged() method is called by the XML3D data structure to
 * notify the DataAdapter about data changes (DOM mutation events) in its
 * associating node. When this method is called, all observers of the
 * DataAdapter are notified about data changes via their notifyDataChanged()
 * method.
 *
 * @param evt notification of type XML3D.Notification
 */
DataAdapter.prototype.notifyChanged = function (evt) {
    if (evt.type === Events.ADAPTER_HANDLE_CHANGED) {
        this.connectedAdapterChanged(evt.key, evt.adapter, evt.handleStatus);
        if (evt.handleStatus === AdapterHandle.STATUS.NOT_FOUND) {
            XML3D.debug.logError("Could not find <data> element of url '" + evt.url + "' for " + evt.key, this.node);
        }

    } else if (evt.type === Events.NODE_INSERTED) {
        var insertedNode = evt.affectedNode;
        var adapter = this.factory.getAdapter(insertedNode);
        if (!adapter) {
            return;
        }

        var insertedXflowNode = adapter.getXflowNode();
        var sibling = insertedNode, followUpAdapter = null;

        do {
            sibling = sibling.nextSibling;
        } while (sibling && !(followUpAdapter = this.factory.getAdapter(sibling)));

        // Make sure to use the actual dom node!
        if (followUpAdapter) {
            this.xflowDataNode._children[0].insertBefore(insertedXflowNode, followUpAdapter.getXflowNode());
        } else {
            this.xflowDataNode._children[0].appendChild(insertedXflowNode);
        }

    } else if (evt.type === Events.NODE_REMOVED) {
        var adapter = this.factory.getAdapter(evt.affectedNode);
        if (!adapter) {
            return;
        }

        var removedXflowNode = adapter.getXflowNode();
        this.xflowDataNode._children[0].removeChild(removedXflowNode);

    } else if (evt.type === Events.THIS_REMOVED) {
        this.clearAdapterHandles();
    }
};

DataAdapter.prototype.attributeChangedCallback = function (name, oldValue, newValue) {
    if (name === "filter" && !this.assetData) {
        this.xflowDataNode.setFilter(newValue);
    } else if (name === "compute" && !this.assetData) {
        updateCompute(this);
    } else if (name === "src") {
        this.updateAdapterHandle(name, newValue);
    } else if (name === "platform") {
        updatePlatform(this);
    }
};

// should I also chenge here: adapter.getXflowNode()._children[0] ?
DataAdapter.prototype.connectedAdapterChanged = function (key, adapter /*, status */) {
    if (key === "src") {
        this.xflowDataNode.sourceNode = adapter ? adapter.getXflowNode() : null;
    } else if (key === "dataflow") {
        this.xflowDataNode.dataflowNode = adapter ? adapter.getXflowNode() : null;
    } else if (this.externalScripts[key]) {
        window.eval(adapter.script);
        this.xflowDataNode.notify(XC.RESULT_STATE.CHANGED_STRUCTURE);
    }
    // Cycle the load state to force a load event even if the new sourceNode is cached
    this.xflowDataNode.setLoading(true);
    updateLoadState(this);
};

/**
 * Returns String representation of this DataAdapter
 */
DataAdapter.prototype.toString = function () {
    return "DataAdapter";
};

function updateCompute(dataAdapter) {
    var xflowNode = dataAdapter.xflowDataNode;
    xflowNode.setCompute(dataAdapter.node.getAttribute("compute"));
    if (xflowNode.computeDataflowUrl) {
        dataAdapter.updateAdapterHandle("dataflow", xflowNode.computeDataflowUrl);
    }
    else {
        dataAdapter.disconnectAdapterHandle("dataflow");
        updateLoadState(dataAdapter);
    }
}

function updatePlatform(dataAdapter) {
    var xflowNode = dataAdapter.xflowDataNode;

    xflowNode.setPlatform(dataAdapter.node.getAttribute("platform"));
    recursiveDataNodeAttrInit(xflowNode);
}

function updateLoadState(dataAdpater) {
    var loading = false, handle;

    handle = dataAdpater.getConnectedAdapterHandle("src");
    if (handle && handle.status === AdapterHandle.STATUS.LOADING) {
        loading = true;
    }

    handle = dataAdpater.getConnectedAdapterHandle("dataflow");
    if (handle && handle.status === AdapterHandle.STATUS.LOADING) {
        loading = true;
    }

    for (var name in dataAdpater.externalScripts) {
        handle = dataAdpater.getConnectedAdapterHandle(name);
        if (handle && handle.status === AdapterHandle.STATUS.LOADING) {
            loading = true;
        }
    }

    dataAdpater.xflowDataNode.setLoading(loading);
}


module.exports = DataAdapter;


