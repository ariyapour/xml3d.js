Xflow.registerOperator("xflow.clampLength", {
	outputs: [	{type: 'float', name: 'fac'}],
    params:  [{type: 'float3', source: 'diffuseColor' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs:function clampLength(diffuseColor)
    {
    	var x =diffuseColor.length();
    	if (x>0.0 && x<1.0)
    		return x;
    	var i=0;
    	while (Math.floor(x/10)>0){
    		x=Math.floor(x/10);
    		i++;
    	}
    	return diffuseColor.length()/ Math.pow(10,i);
//    	return Math.max(0,Math.min(1,diffuseColor.length()));
    }

});