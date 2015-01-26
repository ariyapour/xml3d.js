// data/values.js
(function() {
    "use strict";

    var BUFFER_TYPE_TABLE = {};
    BUFFER_TYPE_TABLE['float']    = Xflow.DATA_TYPE.FLOAT;
    BUFFER_TYPE_TABLE['int']      = Xflow.DATA_TYPE.INT;
    BUFFER_TYPE_TABLE['byte']     = Xflow.DATA_TYPE.BYTE;
    BUFFER_TYPE_TABLE['ubyte']    = Xflow.DATA_TYPE.UBYTE;
    BUFFER_TYPE_TABLE['bool']     = Xflow.DATA_TYPE.BOOL;
    BUFFER_TYPE_TABLE['float2']   = Xflow.DATA_TYPE.FLOAT2;
    BUFFER_TYPE_TABLE['float3']   = Xflow.DATA_TYPE.FLOAT3;
    BUFFER_TYPE_TABLE['float4']   = Xflow.DATA_TYPE.FLOAT4;
    BUFFER_TYPE_TABLE['int4']     = Xflow.DATA_TYPE.INT4;
    BUFFER_TYPE_TABLE['float4x4'] = Xflow.DATA_TYPE.FLOAT4X4;
    XML3D.data.BUFFER_TYPE_TABLE = BUFFER_TYPE_TABLE;
    /**
     * Constructor of XML3D.data.ValueDataAdapter
     *
     * @extends XML3D.data.DataAdapter
     * @extends XML3D.data.ProviderEntry
     * @constructor
     *
     * @param factory
     * @param {Element} node
     */
    var ValueDataAdapter = function(factory, node)
    {
        XML3D.data.DataAdapter.call(this, factory, node);
        this.xflowInputNode = null;
    };
    XML3D.createClass(ValueDataAdapter, XML3D.base.NodeAdapter);

    ValueDataAdapter.prototype.init = function()
    {
        var config = this.node._configured, value;
        if(this.node.textContent == XML3D.scriptValueLabel){
            value = config.scriptValue;
        }
        else{
            delete config.scriptValue;
            if (this.node.deferredName)
            	value = this.node.name;
            else
            	value = this.node.value;
        }

        var type = BUFFER_TYPE_TABLE[this.node.localName];
        var buffer = new Xflow.BufferEntry(type, value);
        buffer._deferredName = this.node.deferredName;

        this.xflowInputNode = XML3D.data.xflowGraph.createInputNode();
        this.xflowInputNode.name = this.node.name;
        this.xflowInputNode.data = buffer;
        this.xflowInputNode.key = this.node.key;
        this.xflowInputNode.paramName = this.node.param ? this.node.name : null;
//        this.xflowInputNode._defferedName = node.defferedName;
    }

    ValueDataAdapter.prototype.getXflowNode = function(){
        return this.xflowInputNode;
    }

    /**
     *
     */
    ValueDataAdapter.prototype.notifyChanged = function(evt)
    {
        if(evt.type == XML3D.events.VALUE_MODIFIED){
            var attr = evt.wrapped.attrName;
            if(!attr){
                delete this.node._configured.scriptValue;
                this.xflowInputNode.data.setValue(this.node.value);
            }
            else if(attr == "name"){
                this.xflowInputNode.name = this.node.name;
            }
            else if(attr == "key"){
                this.xflowInputNode.key = this.node.key;
            }
            else if(attr == "param"){
                this.xflowInputNode.paramName = this.node.param ? this.node.name : null;
            }
        }
    };

    ValueDataAdapter.prototype.setScriptValue = function(value){
        // TODO: Add Type check
        this.xflowInputNode.data.setValue(value);
    }

    /**
     * Returns String representation of this DataAdapter
     */
    ValueDataAdapter.prototype.toString = function()
    {
        return "XML3D.data.ValueDataAdapter";
    };

    // Export
    XML3D.data.ValueDataAdapter = ValueDataAdapter;

}());