(function (webgl) {

    var StateMachine = window.StateMachine;

    /**
     *
     * @param {shaderFactory
     * @constructor
     * @extends {Scene}
     */
    var GLScene = function (context) {
        webgl.Scene.call(this);
        this.context = context;
        this.shaderFactory = new webgl.ShaderComposerFactory(context);
        this.drawableFactory = new webgl.DrawableFactory(context);
        this.firstOpaqueIndex = 0;
        this.ready = [];
        this.queue = [];
        this.addListeners();
    };
    var EVENT_TYPE = webgl.Scene.EVENT_TYPE;

    XML3D.createClass(GLScene, webgl.Scene);


    XML3D.extend(GLScene.prototype, {
        remove: function (obj) {
            var index = this.queue.indexOf(obj);
            if (index != -1) {
                this.queue.splice(index, 1);
            }
            index = this.ready.indexOf(obj);
            if (index != -1) {
                this.ready.splice(index, 1);
                if (index < this.firstOpaqueIndex)
                    this.firstOpaqueIndex--;
            }
        },
        clear: function () {
            this.ready = [];
            this.queue = [];
        },
        moveFromQueueToReady: function (obj) {
            var index = this.queue.indexOf(obj);
            if (index != -1) {
                this.queue.splice(index, 1);
                if (obj.program.hasTransparency()) {
                    this.ready.unshift(obj);
                    this.firstOpaqueIndex++;
                }
                else {
                    this.ready.push(obj);
                }
            }
        },
        moveFromReadyToQueue: function (obj) {
            var index = this.ready.indexOf(obj);
            if (index != -1) {
                this.ready.splice(index, 1);
                if (index < this.firstOpaqueIndex)
                    this.firstOpaqueIndex--;
                this.queue.push(obj);
            }
        },
        update: function () {
            this.shaderFactory.update(this);
            this.updateMeshes();
            this.consolidate();
        },
        consolidate: function () {
        },
        updateMeshes: function () {
            var that = this;
            this.forEach(function(obj) {
                obj.drawable && obj.drawable.update();
            });
        },
        forEach: function (func, that) {
            this.queue.slice().forEach(func, that);
            this.ready.slice().forEach(func, that);
        },
        objectReadyStateChanged: function() {
            console.log("objectReadyStateChanged", arguments);
        },
        updateReadyObjectsFromActiveView: (function () {
            var c_viewMat_tmp = XML3D.math.mat4.create();
            var c_projMat_tmp = XML3D.math.mat4.create();

            return function (aspectRatio) {
                this.getActiveView().getViewMatrix(c_viewMat_tmp);

                this.ready.forEach(function (obj) {
                    obj.updateModelViewMatrix(c_viewMat_tmp);
                    obj.updateNormalMatrix();
                });

                this.updateBoundingBox();
                this.getActiveView().getProjectionMatrix(c_projMat_tmp, aspectRatio);

                this.ready.forEach(function (obj) {
                    obj.updateModelViewProjectionMatrix(c_projMat_tmp);
                });
            }
        }()),
        addListeners: function() {
            this.addEventListener( EVENT_TYPE.SCENE_STRUCTURE_CHANGED, function(event){
                if(event.newChild !== undefined) {
                    this.addChildEvent(event.newChild);
                } else if (event.removedChild !== undefined) {
                    this.removeChildEvent(event.removedChild);
                }
            });
            this.addEventListener( EVENT_TYPE.VIEW_CHANGED, function(event){
                this.context.requestRedraw("Active view changed.");
            });
            this.addEventListener( EVENT_TYPE.LIGHT_STRUCTURE_CHANGED, function(event){
                this.shaderFactory.setLightStructureDirty();
            });
            this.addEventListener( EVENT_TYPE.LIGHT_VALUE_CHANGED, function(event){
                this.shaderFactory.setLightValueChanged();
                this.context.requestRedraw("Light value changed.");
            });
        },
        addChildEvent: function(child) {
            if(child.type == webgl.Scene.NODE_TYPE.OBJECT) {
                this.queue.push(child);
                this.context.requestRedraw("Object was added to scene.");
            }
        },
        removeChildEvent: function(child) {
            if(child.type == webgl.Scene.NODE_TYPE.OBJECT) {
                this.remove(child);
                child.dispose();
                this.context.requestRedraw("Object was removed from scene.");
            }
        },
        handleResizeEvent: function(width, height) {
            this.getActiveView().setProjectionDirty();
        },
        createDrawable: function(obj) {
            return this.drawableFactory.createDrawable(obj);
        }
    });
    webgl.GLScene = GLScene;

}(XML3D.webgl));
