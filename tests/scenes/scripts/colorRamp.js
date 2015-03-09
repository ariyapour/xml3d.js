Xflow.registerOperator("xflow.colorRamp", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [{type: 'float', source: 'fac' },
              {type: 'float3', source: 'col' },
              {type: 'float3', source: 'color2' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs:function colorRamp(fac,col,color2)
    {
    	return col.add(color2.sub(col).div(1).mul(fac));
    }

});