Xflow.registerOperator("xflow.checker", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [ {type: 'float2', source: 'texcoord' },
               {type: 'float', source: 'freq' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs: function checker(texcoord,freq)
    {
        var smod = (texcoord.x() * freq) % 1.0;
        var tmod = (texcoord.y() * freq) % 1.0;
        var blackColor = env.blackColor || new Vec3(0);
        var whiteColor = env.whiteColor || new Vec3(1);
        var x = mul(3,4);
          var color =
            ((smod < 0.5 && tmod < 0.5) || (smod >= 0.5 && tmod >= 0.5)) ?
            whiteColor :
            blackColor;
      return color;
    }
	,
	functions :[
	    function mul (a,b){
	    	return a*b*10;
		}
	
	            ]
});