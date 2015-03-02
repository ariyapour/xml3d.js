Xflow.registerOperator("xflow.fetchTex", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [ {type: 'texture', source: 'diffuseTexture' },
                {type: 'float2', source: 'texcoord' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs: function(diffuseTexture, texcoord){
    	return diffuseTexture.sample2D(texcoord).rgb();
    }

});