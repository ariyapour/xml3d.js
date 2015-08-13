Xflow.registerOperator("xflow.animateColor", {
    outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [{type: 'float', source: 'time'}],
    platforms: ["JAVASCRIPT", "GLSL_VS"],
    evaluate: function(diffuseColor,time) {
    	diffuseColor[0] = Math.cos((time[0]/500)*Math.PI / 180);
    	diffuseColor[1] = Math.sin((time[0]/500)*Math.PI / 180);
    	diffuseColor[2] = 0;
    	return diffuseColor;
    }
});

