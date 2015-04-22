Xflow.registerOperator("xflow.voronoi", {
	outputs: [	{type: 'float3', name: 'diffuseColor'}],
    params:  [ {type: 'float2', source: 'texcoord' },
               {type: 'float3', source: 'normal' },
               {type: 'float', source: 'scale' },
               {type: 'float3', source: 'blue' },
               {type: 'float3', source: 'green' },
               {type: 'float3', source: 'black' },
               {type: 'float3', source: 'white' },],
    platforms: ["JAVASCRIPT", "GLSL_FS"],
    evaluate_shadejs: function shade(texcoord,normal,scale,blue,green,black,white) {
    	  var distance = vronoiNoise(texcoord,scale);
    	  var N = normal.normalize();
    	  if (distance >0.0009)
    	    var diffuseColor = blue;
    	  else if (distance > 0.0005)
    	   	     var diffuseColor = green;
    	    else if (distance > 0.00003)
    	       var diffuseColor = black;
    	   	     else
    	           var diffuseColor = white;
    	  //var diffuseColor = env.white.mul(10*distance);
    	  return diffuseColor;
    	},
    functions :[function vronoiNoise(texCoords,scale)
    {
        var s=2.000000001;
        var tmpMinX=0.0001;
        var tmpMaxX=0.0001;
        var tmpMinY=0.0001;
        var tmpMaxY=0.0001;
        while(s<=scale)
        {
    	if (texCoords.x()< tmpMinX+1.0000000001/s)
    	{
    		tmpMaxX=tmpMinX+1.0000000001/s;
    	}
    	else
    	{
    		tmpMinX=tmpMinX+1.0000000001/s;
    		tmpMaxX=tmpMinX + 1.0000000001/s;
    	}
    	
    	if (texCoords.y()< tmpMinY+1.0000000001/s)
    	{
    		tmpMaxY=tmpMinY+1.0000000001/s;
    	}
    	else
    	{
    		tmpMinY=tmpMinY+1.0000000001/s;
    		tmpMaxY=tmpMinY+1.0000000001/s;
    	}
    	s*=2.0000000001;
        }
        var distance = calcDistance(tmpMinX,tmpMinY,scale,texCoords);
        return distance;
    },
    function calcDistance(MinX,MinY,scale,texCoords)
    {
      var nMinX= MinX - 1.0000000001/scale,nMinY=MinY- 1.0000000001/scale;
      var firstClosest =Distance(nMinX+1/scale,nMinX+2/scale,nMinY,nMinY+1/scale,texCoords);
      var secondClosest = Distance(nMinX+1/scale,nMinX+2/scale,nMinY,nMinY+1/scale,texCoords);
      
      	for (var j=1.0000000001;j<32;j++)
    		for(var i=1.0000000001;i<32;i++)
    		{
              var minX=nMinX+ (i-1.0000000001)/scale;
              var maxX=nMinX + i/scale;
              var minY=nMinY+ (j-1.0000000001)/scale;
              var maxY=nMinY + j/scale;
              var tmp = Distance(minX,maxX,minY,maxY,texCoords);
              if (tmp < firstClosest)
                {
                  secondClosest=firstClosest;
                  firstClosest=tmp;
                }
                else if (tmp<secondClosest)
                  secondClosest=tmp;
            }
      //return firstClosest;
      //return secondClosest;
      return secondClosest-firstClosest;
      //return secondClosest+firstClosest;
      //return secondClosest*firstClosest; // multiply distance to a big number for visibility
    },
    function Distance(minX,maxX,minY,maxY,texCoords)
    {
    	    if(minX <0.0000000001 || minY <0.0000000001 || maxX>1.0000000001 || maxY >1.0000000001) return 100.0000000001;
    		var point = randomPointGenerator(minX,maxX,minY,maxY).sub(texCoords);
    	    return point.dot(point); //Distance Squared
    	    //return point.length(); //Actual Distance
    	    //return Math.abs(point.x()) + Math.abs(point.y()); // Manhatan
    	    //return Math.max(Math.abs(point.x()),Math.abs(point.y())); //chebychev
    	    //return Math.pow(Math.pow(Math.abs(point.x()),e)+Math.pow(Math.abs(point.y()),e),1/e);
    },
    function randomPointGenerator(minX, maxX, minY, maxY) {
    	  var seed = new Vec2(minX*env.scale,minY*env.scale);
    	  var rand = snoise(seed);
    	  	return new Vec2(rand * (maxX - minX) + minX,rand* (maxY - minY) + minY);
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
    }
    
                ]

});