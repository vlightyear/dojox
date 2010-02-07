dojo.provide("dojox.fx.ext-dojo.complex");

(function(){
	var da = dojo.animateProperty;
	dojo.animateProperty = function(options){
		// summary:
		//		An extension of dojo.animateProperty which adds functionality
		//		that animates a "complex property". The primary example is the
		//		clip style: rect(10px 30px 10px 50px).
		//		Note this can also be used with (and is actually intended for)
		//		CSS3 properties, such as transform:
		//		transform: rotate(10deg) translateX(0px)
		//		
		//	description:
		//		The standard animation doesn't know what to do with something like
		//		rect(...). This class identifies complex properties by they being a
		//		string and having parenthesis. If so, that property is made into a
		//		dojox.fx._Complex object and the getValue() is obtained from
		//		there.
		//		
		//	example:
		//		|	var ani = dojo.animateProperty({
		//		|		node:dojo.byId("myDiv"),
		//		|		duration:600,
		//		|		properties:{
		//		|			clip:{start:'rect(0px 50px 50px 0px)', end:'rect(10px 30px 30px 10px)'}
		//		|		}
		//		|	}).play();
		//		
		var d = dojo;
		var ani = da(options);
		
		dojo.connect(ani, "beforeBegin", function(){
			// dojo.Animate original still invokes and still
			// works. We're appending this functionality to
			// modify targeted properties.
			ani.curve.getValue = function(r){
				// Overwriting dojo.Animate's curve.getValue
				// This is mostly duplicate code, except it looks
				// for an instance of dojox.fx._Complex.
				var ret = {};
				for(var p in this._properties){
					var prop = this._properties[p],
						start = prop.start;
					if(start instanceof d.Color){
						ret[p] = d.blendColors(start, prop.end, r, prop.tempColor).toCss();
					}else if(start instanceof dojox.fx._Complex){
						ret[p] = start.getValue(r);
					}else if(!d.isArray(start)){
						ret[p] = ((prop.end - start) * r) + start + (p != "opacity" ? prop.units || "px" : 0);
					}
				}
				return ret;
			};
			
			// this.properties has already been set, as has this.curve._properties.
			// We're fixing the props in curve which will have NaN attributes from
			// our string property.
			var pm = {};
			for(var p in this.properties){
				var o = this.properties[p];
				if(typeof(o.start) == "string" && /\(/.test(o.start)){
					this.curve._properties[p].start = new dojox.fx._Complex(o);
				}
			}
		
		});
		return ani; // dojo.Animation
	}
})();

dojo.declare("dojox.fx._Complex", null, {
	// summary:
	//		A class that takes a complex property such as
	//		clip style: rect(10px 30px 10px 50px), and breaks it
	//		into seperate animatable units. The object has a getValue()
	//		that will return a string with the modified units.
	//
	PROP: /\([\w|,|#|\.|\s]*\)/g,
	constructor: function(options){
		var beg = options.start.match(this.PROP);
		var end = options.end.match(this.PROP);

		var begProps = dojo.map(beg, this.getProps, this);
		var endProps = dojo.map(end, this.getProps, this);
		
		this._properties = {};
		this.strProp = options.start;
		dojo.forEach(begProps, function(prop, i){
			dojo.forEach(prop, function(p, j){
				this.strProp = this.strProp.replace(p, "PROP_"+i+""+j);
				this._properties["PROP_"+i+""+j] = this.makePropObject(p, endProps[i][j])
			},this);
		},this);
	},
	
	getValue: function(/*Float*/r){
		// summary:
		// 		Returns a string with teh same integrity as the
		// 		original star and end, but with the modified units.
		var str = this.strProp;
		for(var nm in this._properties){
			var v, o = this._properties[nm];
			if(o.units == "isColor"){
				v = dojo.blendColors(o.beg, o.end, r).toCss(false);	
			}else{
				v = ((o.end - o.beg) * r) + o.beg;	
			}
			str = str.replace(nm, v + o.units);
		}
		
		return str; // String
	},
	
	makePropObject: function(/* String */beg, /* String */end){
		// summary:
		//		Returns an object that stores the numeric value and
		//		units of the beggining and ending properties.
		//		
		var b = this.getNumAndUnits(beg);
		var e = this.getNumAndUnits(end);
		return {
			beg:b.num,
			end:e.num,
			units:b.units
		}; // Object
	},
	
	getProps: function(/* String */str){
		// summary:
		//		Helper function that splits a stringified set of properties
		//		into individual units.
		//		
		str = str.substring(1, str.length-1);
		var s;
		if(/,/.test(str)){
			str = str.replace(/\s/g, "");
			s = str.split(",");
		}else{
			str = str.replace(/\s{2,}/g, " ");
			s = str.split(" ");
		}
		return s; // String
	},
	getNumAndUnits: function(prop){
		// summary:
		//		Helper function that returns the numeric verion of the string
		//		property (or dojo.Color object) and the unit in which it was
		//		defined.
		//		
		if(!prop){ return {}; }
		if(/#/.test(prop)){
			return {
				num: new dojo.Color(prop),
				units:"isColor"
			}; // Object
		}
		var o = {
			num:parseInt(/-*\d{1,}/.exec(prop).join("")) ////// Float?
		};
		o.units = /[a-z]{1,}/.exec(prop);//.join("");
		o.units = o.units && o.units.length ? o.units.join("") : "";
		return o; // Object
	}
});

