Xflow.registerOperator("xflow.colorRamp", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [{type: 'float', source: 'fac' },
              {type: 'float3', source: 'rang' },
              {type: 'float3', source: 'yooooohoooo' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs:function colorRamp(fac,rang,yooooohoooo)
    {
    	var x = mul(3,4);
    	return rang.add(yooooohoooo.sub(rang).div(1).mul(fac));
    },
    functions :[function mul (a,b){
    	return a*b;
    	}
    
                ]

});