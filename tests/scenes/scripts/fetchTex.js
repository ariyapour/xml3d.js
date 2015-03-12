Xflow.registerOperator("xflow.fetchTex", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [ {type: 'texture', source: 'diffuseTexture' },
                {type: 'float2', source: 'uv' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs: function(diffuseTexture, uv){
    	return diffuseTexture.sample2D(uv).rgb();
    }
});