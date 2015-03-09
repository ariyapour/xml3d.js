Xflow.registerOperator("xflow.clampLength", {
	outputs: [	{type: 'float', name: 'fac'}],
    params:  [{type: 'float3', source: 'diffuseColor' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs:function clampLength(diffuseColor)
    {
    	return Math.max(0,Math.min(1,diffuseColor.length()));
    }

});