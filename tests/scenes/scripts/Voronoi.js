Xflow.registerOperator("xflow.voronoi", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [ {type: 'float2', source: 'texcoord' },
               {type: 'float3', source: 'normal' },
               {type: 'float', source: 'scale', array: true },
               {type: 'float3', source: 'blue' },
               {type: 'float3', source: 'green' },
               {type: 'float3', source: 'black' },
               {type: 'float3', source: 'white' },],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs: function shade(texcoord,normal,scale,blue,green,black,white) {
    	  var x =scale[0];
    	  var y = scale.length();
    	  var distance = vronoiNoise(texcoord.mul(20));
    	  if (distance >0.9)
    	    var diffuseColor = blue;
    	  else if (distance > 0.7)
    	   	     var diffuseColor = linearColorInterpolation(0.7,0.9,green,blue,distance);//green;
    	    else if (distance > 0.5)
    	       var diffuseColor = linearColorInterpolation(0.5,0.7,black,green,distance);//black;
    	   	     else
    	           var diffuseColor = linearColorInterpolation(0.0,0.5,white,black,distance);//white;
    	  //var diffuseColor = env.white.mul(10*distance);
    	  return diffuseColor.mul(x);
//    	  return x;
//    	  return new Vec3(distance);
    	},
    functions :[function vronoiNoise(texCoords)
    {
    	  var p = new Vec2 (Math.floor(texCoords.x()),Math.floor(texCoords.y()));
//    	  var y=scale[1];
    	  var f = new Vec2 (texCoords.x() % 1, texCoords.y() % 1);
    	  var res = new Vec2 (0.8);
    	  for (var j=-2;j<=2;j++){
    	    for (var i=-2; i <=2;i++){
    	      var b = new Vec2(i,j);
    	      var r = b.sub(f).add(randomPointGenerator(p.add(b)));
    	      var d = r.dot(r);
    	      if( d < res.x )
    	        {
    	            res.y = res.x;
    	            res.x = d;
    	        }
    	        else if( d < res.y )
    	        {
    	            res.y = d;
    	        }
    	    }
    	  }
    	   return Math.sqrt(res.dot(res));
//    	  return res.x()-res.y();
    	},
    	function randomPointGenerator(x) {
    		  var rand = snoise(x);
    		  	return new Vec2(rand);
    		},
    function mod289(x)
    {
        return x.sub(Math.floor(x.mul(1 / 289)).mul(289));
    },
    function permute(x) {
        return mod289((x.mul(34).add(1)).mul(x));
    },
    function snoise(v)
    {
        var C = new Vec4((3.0-Math.sqrt(3.0))/6.0,
                0.5*(Math.sqrt(3.0)-1.0),
                -1.0 + 2.0 * (3.0-Math.sqrt(3.0))/6.0,
                1.0 / 41.0);
    // First corner
        var i  = Math.floor(v.add(v.dot(C.yy())));
        var x0 = v.sub(i).add(i.dot(C.xx()));

    // Other corners
        var i1;
        //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
        //i1.y = 1.0 - i1.x;
        i1 = (x0.x > x0.y) ? new Vec2(1.0, 0.0) : new Vec2(0.0, 1.0);
        // x0 = x0 - 0.0 + 0.0 * C.xx ;
        // x1 = x0 - i1 + 1.0 * C.xx ;
        // x2 = x0 - 1.0 + 2.0 * C.xx ;
        var x12 = x0.xyxy().add(C.xxzz());
        x12.xy -= i1;

    // Permutations
        i = mod289(i); // Avoid truncation effects in permutation
        var p = permute( permute( new Vec3(0.0, i1.y(), 1.0 ).add(i.y()))
                .add(i.x()).add(new Vec3(0.0, i1.x(), 1.0 )));

        var tmp = new Vec3(0.5).sub(x0.dot(x0), x12.xy().dot(x12.xy()), x12.zw().dot(x12.zw()));
        var m = Math.max(tmp, 0.0);
        m = m.mul(m);
        m = m.mul(m);
    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

        var x = Math.fract(p.mul(C.www())).mul(2).sub(1);
        var h = Math.abs(x).sub(0.5);
        var ox = Math.floor(x.add(0.5));
        var a0 = x.sub(ox);

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
        m = m.mul(a0.mul(a0).add(h.mul(h)).mul(- 0.85373472095314).add(1.79284291400159));

    // Compute final noise value at P
        var g = new Vec3(a0.x()  * x0.x()  + h.x()  * x0.y(),
                a0.yz().mul(x12.xz()).add(h.yz().mul(x12.yw()))
        );
        return 130 * m.dot(g);
    },
    function linearColorInterpolation (x,y,fX,fY,t)
    {
      return fX.add(fY.sub(fX).div(y-x).mul(t-x));
    }
    
                ]

});