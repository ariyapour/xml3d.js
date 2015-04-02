Xflow.registerOperator("xflow.checker", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [ {type: 'float2', source: 'coordinates' },
               {type: 'float', source: 'haha' }],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs: function checker(coordinates,haha)
    {
        var smod = (coordinates.x() * haha) % 1.0;
        var tmod = (coordinates.y() * haha) % 1.0;
        var blackColor = env.blackColor || new Vec3(0);
        var whiteColor = env.whiteColor || new Vec3(1);

          var color =
            ((smod < 0.5 && tmod < 0.5) || (smod >= 0.5 && tmod >= 0.5)) ?
            whiteColor :
            blackColor;
      return color;
    }

});