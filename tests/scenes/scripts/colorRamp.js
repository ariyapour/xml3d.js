Xflow.registerOperator("xflow.colorRamp", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [{type: 'float', source: 'fac' },
              {type: 'float3', source: 'color1' },
              {type: 'float3', source: 'yooooohoooo' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs:function colorRamp(fac,color1,yooooohoooo)
    {
    	var x = mul(3,4);
    	return color1.add(yooooohoooo.sub(color1).div(1).mul(fac));
    },
    functions :[function mul (a,b){
    	return a*b;
    	}
    
                ]

});