Xflow.registerOperator("xflow.clampLength", {
	outputs: [	{type: 'float', name: 'fac'}],
    params:  [{type: 'float3', source: 'diffuseColor' },
              {type: 'float2', source: 'uv' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs:function clampLength(diffuseColor,uv)
    {
    	var x = uv;
    	return Math.max(0,Math.min(1,diffuseColor.length()));
    }

});