Xflow.registerOperator("xflow.colorRamp", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [{type: 'float', source: 'fac' },
              {type: 'float3', source: 'rang' },
              {type: 'float3', source: 'color2' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs:function colorRamp(fac,rang,color2)
    {
    	return rang.add(color2.sub(rang).div(1).mul(fac));
    }

});