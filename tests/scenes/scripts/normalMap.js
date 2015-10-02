Xflow.registerOperator("xflow.normalMap", {
	outputs: [	{type: 'float3', name: 'normal'}],
    params:  [ {type: 'texture', source: 'tex' },
        {type: 'float2', source: 'uv' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs: function(tex, uv){
    	var normalMap = tex.sample2D(uv).rgb();
        return new Vec3(normalMap.x()*2-1,normalMap.y()*2-1,normalMap.z()*2-1);
    }
});