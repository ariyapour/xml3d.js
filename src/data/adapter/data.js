//<<<<<<< HEAD
//XML3D.data = XML3D.data || {};
//
//(function() {
//"use strict";
//
//XML3D.data.xflowGraph = new Xflow.Graph();
//Xflow.setShaderConstant(Xflow.SHADER_CONSTANT_KEY.OBJECT_ID, "objectID");
//Xflow.setShaderConstant(Xflow.SHADER_CONSTANT_KEY.SCREEN_TRANSFORM, "modelViewProjectionMatrix");
//Xflow.setShaderConstant(Xflow.SHADER_CONSTANT_KEY.SCREEN_TRANSFORM_NORMAL, "modelViewProjectionNormalMatrix");
//Xflow.setShaderConstant(Xflow.SHADER_CONSTANT_KEY.VIEW_TRANSFORM, "modelViewMatrix");
//Xflow.setShaderConstant(Xflow.SHADER_CONSTANT_KEY.VIEW_TRANSFORM_NORMAL, "modelViewMatrixN");
//Xflow.setShaderConstant(Xflow.SHADER_CONSTANT_KEY.WORLD_TRANSFORM, "modelMatrix");
//Xflow.registerErrorCallback(function(message, xflowNode){
//    message = "Xflow: " + message;
//    var userData = xflowNode && xflowNode.userData;
//    if (userData && userData.ownerDocument) {
//        if (userData.ownerDocument === document) {
//            XML3D.debug.logError(message, userData);
//        }
//        else if (userData.id) {
//            var uri = new XML3D.URI("#" + userData.id);
//            uri = uri.getAbsoluteURI(userData.ownerDocument.documentURI);
//            XML3D.debug.logError(message, "External Node: " + uri);
//        }
//        else {
//            XML3D.debug.logError(message, "External Document: " + userData.ownerDocument.documentURI);
//        }
//    }
//    else if (typeof userData == "string") {
//        XML3D.debug.logError(message, userData);
//    }
//    else {
//        XML3D.debug.logError(message);
//    }
//});
//
////Xflow.setShaderConstant(Xflow.SHADER_CONSTANT_KEY.WORLD_TRANSFORM_NORMAL, "objectID");
//=======
var BaseDataAdapter = require("./base");
//>>>>>>> ariyapour/xflow-shadejs

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
};
XML3D.createClass(DataAdapter, BaseDataAdapter);

DataAdapter.prototype.init = function () {
    this.xflowDataNode = this.factory.graph.createDataNode();
    this.xflowDataNode.addLoadListener(this.onXflowLoadEvent.bind(this));
    this.xflowDataNode.userData = this.node;

    // Setting platform and node type information for a data sequence
    this.xflowDataNode.setPlatform(this.node.getAttribute("platform"));

    this.updateAdapterHandle("src", this.node.getAttribute("src"));
    if(!this.assetData){
        this.xflowDataNode.setFilter(this.node.getAttribute("filter"));
        updateCompute(this);
    }
    recursiveDataAdapterConstruction(this);
};

DataAdapter.prototype.updateAdapterHandle = function(key, url) {
    var oldAdapterHandle = this.getConnectedAdapterHandle(key);

    var adapterHandle = this.getAdapterHandle(url),
        status = (adapterHandle && adapterHandle.status);

    if(oldAdapterHandle == adapterHandle)
        return;
    if (status === XML3D.base.AdapterHandle.STATUS.NOT_FOUND) {
        XML3D.debug.logError("Could not find element of url '" + adapterHandle.url + "' for " + key, this.node);
    }
    this.connectAdapterHandle(key, adapterHandle);
    this.connectedAdapterChanged(key, adapterHandle ? adapterHandle.getAdapter() : null, status);
};




DataAdapter.prototype.onXflowLoadEvent = function(node, newLevel, oldLevel){
    if(newLevel == Infinity){
        XML3D.util.dispatchCustomEvent(this.node, 'load', false, true, null);
    }
    else if(newLevel > oldLevel){
        XML3D.util.dispatchCustomEvent(this.node, 'progress', false, true, null);
    }
};
DataAdapter.prototype.getDataComplete = function(){
    return this.xflowDataNode.getProgressLevel() == Infinity;
};
DataAdapter.prototype.getDataProgressLevel = function(){
    return this.xflowDataNode.getProgressLevel();
};

    /** Recursively passing platform information to children of a data node
     *  Requires that the children and the parents of data nodes are defined
     *
     * @param {Xflow.DataNode} parentNode
     */
function recursiveDataNodeAttrInit(parentNode) {
    var children = parentNode._children, NChildren, i;

    if (children && children.length > 0) {
        NChildren = children.length;

        for (i = NChildren; i--;) {
            if (children[i] instanceof Xflow.DataNode) {
                children[i].setPlatform(parentNode._platform);
                recursiveDataNodeAttrInit(children[i]);
            }
        }
    }
}

function recursiveDataAdapterConstruction(adapter) {
    for (var child = adapter.node.firstElementChild; child !== null; child = child.nextElementSibling) {
        var subadapter = adapter.factory.getAdapter(child);
        if (subadapter) {
            adapter.xflowDataNode.appendChild(subadapter.getXflowNode());

            // Passes _platform values to children nodes starting from the node
            // where these attributes are first defined
            if (adapter.xflowDataNode._platform !== null) {
                recursiveDataNodeAttrInit(adapter.xflowDataNode);
            }
        }
    }
}

/**
 * The notifyChanged() method is called by the XML3D data structure to
 * notify the DataAdapter about data changes (DOM mustation events) in its
 * associating node. When this method is called, all observers of the
 * DataAdapter are notified about data changes via their notifyDataChanged()
 * method.
 *
 * @param evt notification of type XML3D.Notification
 */
DataAdapter.prototype.notifyChanged = function (evt) {
    if (evt.type === XML3D.events.ADAPTER_HANDLE_CHANGED) {
        this.connectedAdapterChanged(evt.key, evt.adapter, evt.handleStatus);
        if (evt.handleStatus === XML3D.base.AdapterHandle.STATUS.NOT_FOUND) {
            XML3D.debug.logError("Could not find <data> element of url '" + evt.url + "' for " + evt.key, this.node);
        }

    } else if (evt.type === XML3D.events.NODE_INSERTED) {
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

        if (followUpAdapter) {
            this.xflowDataNode.insertBefore(insertedXflowNode, followUpAdapter.getXflowNode());
        } else {
            this.xflowDataNode.appendChild(insertedXflowNode);
        }

    } else if (evt.type === XML3D.events.NODE_REMOVED) {
        var adapter = this.factory.getAdapter(evt.affectedNode);
        if (!adapter) {
            return;
        }

        var removedXflowNode = adapter.getXflowNode();
        this.xflowDataNode.removeChild(removedXflowNode);

    } else if (evt.type === XML3D.events.VALUE_MODIFIED) {
        var attr = evt.mutation.attributeName;

        if (attr === "filter" && !this.assetData) {
            this.xflowDataNode.setFilter(this.node.getAttribute(attr));
        }
        else if (attr === "compute" && !this.assetData) {
            updateCompute(this);
        }
        else if (attr === "src") {
            this.updateAdapterHandle(attr, this.node.getAttribute(attr));
        } else if (attr === "platform") {
            updatePlatform(this);
        }

    } else if (evt.type === XML3D.events.THIS_REMOVED) {
        this.clearAdapterHandles();
    }
};

DataAdapter.prototype.connectedAdapterChanged = function (key, adapter /*, status */) {
    // we first set loading to true, to force a load event when a new, but cached xflow node is attached
    this.xflowDataNode.setLoading(true);
    if (key === "src") {
        this.xflowDataNode.sourceNode = adapter ? adapter.getXflowNode() : null;
    }
    if (key === "dataflow") {
        this.xflowDataNode.dataflowNode = adapter ? adapter.getXflowNode() : null;
    }
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
    if (handle && handle.status === XML3D.base.AdapterHandle.STATUS.LOADING) {
        loading = true;
    }

    handle = dataAdpater.getConnectedAdapterHandle("dataflow");
    if (handle && handle.status === XML3D.base.AdapterHandle.STATUS.LOADING) {
        loading = true;
    }

    dataAdpater.xflowDataNode.setLoading(loading);
}


module.exports = DataAdapter;


