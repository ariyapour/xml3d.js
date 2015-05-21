Xflow.registerOperator("xflow.mix", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [{type: 'float3', source: 'color1' },
              {type: 'float3', source: 'color2' },
              {type: 'float', source: 'weight' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs:function mix(color1,color2,weight)
    {
    	return (color2.mul(weight).add(color1.mul(1-weight)));
    }
});