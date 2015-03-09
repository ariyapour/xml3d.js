Xflow.registerOperator("xflow.starBall", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [ {type: 'float3', source: 'position'},
                {type: 'float2', source: 'texcoord'}],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs: function starBall(position,texcoord){
    	 var fw = this.fwidth ? this.fwidth(position) : new Vec2(0.005);
         var ddv = Math.abs(fw.x());
         var ddu = Math.abs(fw.y());

         var ang = (texcoord.s()*360.0) % 144.0;
         var ht = .3090 / Math.sin(((ang+18.0)*.01745));
         ang = ((1.0-texcoord.s())*360.0) % 144.0;
         var ht1 = .3090 / Math.sin(((ang+18.0)*.01745));
         ht = Math.max (ht, ht1);
         ht1 = ht*.5-Math.min(texcoord.t()*2.0, 1.0);
         ht1 = Math.clamp (ht1, -ddu, ddu)/(ddu*2.0)+.5;
         ht = ht/2.0 - Math.min((1.0-texcoord.t())*2.0, 1.0);
         ht1 = ht1 + Math.clamp(ht, -ddu, ddu)/(ddu*2.0)+.5;

         var ct = Math.mix (new Vec3(.8,.6,0.0), new Vec3 (.5,.05,.05), ht1);
         return ct = Math.mix (new Vec3(0.0,0.2,.7), ct,
                      Math.clamp(Math.abs(texcoord.t()-0.5)-0.1, 0.0, ddv)/ddv);
    }

});