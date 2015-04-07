Xflow.registerOperator("xflow.colorMul", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [{type: 'float3', source: 'diffuseColor' },
              {type: 'float', source: 'scalarValue' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs:function colorMul(diffuseColor,scalarValue)
    {
    	return diffuseColor.mul(scalarValue);
    }
});