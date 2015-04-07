Xflow.registerOperator("xflow.fetchTex", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [ {type: 'texture', source: 'tex' },
                {type: 'float2', source: 'uv' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs: function(tex, uv){
    	return tex.sample2D(uv).rgb();
    }
});