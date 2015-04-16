var FullscreenQuad = function (context) {
    this.gl = context.gl;
    this.createGLAssets();
};

XML3D.extend(FullscreenQuad.prototype, {

    createGLAssets: function () {
        var gl = this.gl;
        this.posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0]), gl.STATIC_DRAW);
    },

    draw: function (program) {
        var gl = this.gl;
        var posAttr = program.attributes["position"];
        gl.enableVertexAttribArray(posAttr.location);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
        gl.vertexAttribPointer(posAttr.location, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.disableVertexAttribArray(posAttr.location);
    }

});

module.exports = FullscreenQuad;

