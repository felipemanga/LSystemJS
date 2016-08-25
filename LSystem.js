CLAZZ("LSystem", {
    rules:null,
    terminals:null,

    CONSTRUCTOR:function(){
        this.rules = {};
        this.terminals = {};
    },

    __add:function( set, args ){
        var func, name, prob;

        prob = 1;
        name = null;

        for( var i=0, l=args.length; i<l; ++i ){
            var v = args[i];
            switch( typeof v ){
                case "function":
                    func = {};
                    var str = v.toString();
                    func.body = str.replace(/^[^)]*\)\s*=>\s*/, "").replace(/^\s*\{\s*([\s\S]*)\}\s*$/, "$1");
                    func.params = str.replace(/^[^(]*\(([^)]*)\)[\s\S]*/, "$1").split(/\s*,\s*/);
                    func.probability = prob;
                    name = func.params.shift();
                    if( name in set ) set[name].push(func);
                    else set[name] = [func];
                    break;

                case "number":
                    prob = v;
                    break;
            }
        }
    },

    rule:function(name, func, prob){
        this.__add( this.rules, Array.prototype.splice.call(arguments, 0) );
    },

    terminal:function(){
        this.__add( this.terminals, Array.prototype.splice.call(arguments, 0) );
    },

    build:function( max ){
        var varId = 0;
        var str = expand("axiom", this.rules, 0 );
        str = expand(str, this.terminals, max );
        str = str.replace(/\n\s*\n/g, "\n");
        return str;

        function getBody(rule, vals){
            if( !rule ) return "";
            var str = rule.body.trim(), keys = rule.params;
            for(var i=0, l=keys.length; i<l; ++i )
                if(keys[i]) str = str.split(keys[i]).join(vals[i]);
            return str;
        }

        function expand( src, rules, level ){
            var out, pos, srcLen, k, lastMatch = 0;
            out = "";
            srcLen = src.length;

            var bust = 0, modified = false, acc;
            while( true ){
                var firstRule=null, firstRulePos=srcLen+1;
                for( k in rules ){
                    pos = src.indexOf(k, lastMatch);
                    if( pos == -1 ) continue;
                    if( (pos < firstRulePos) || (pos == firstRulePos && firstRule.length < k.length) ){
                        firstRule = k;
                        firstRulePos = pos;
                    }
                }

                if( !firstRule ) break;
                modified = true;

                var raw = src.substr( lastMatch, firstRulePos-lastMatch );
                if( raw.length ) out += raw;

                lastMatch = firstRulePos + firstRule.length;

                var rule = rules[firstRule], params;
                pos = firstRulePos + firstRule.length;
                if( src.substr(pos++, 1) == "(" ){
                    var nc = 1, b;
                    acc = ""
                    lastMatch++;
                    while( nc ){
                        b = src.substr(pos++, 1);
                        if( b == "(" ) nc++;
                        else if( b == ")" ) nc--;
                        if(nc) acc += b;
                        lastMatch++;
                    }
                    params = acc.trim().split(/\s*,\s*/);
                }else params = [];

                if( rule.length == 1 )
                    out += getBody(rule[0], params);
                else{
                    var sum = 0;
                    varId++;
                    rule.forEach(r => sum += r.probability);
                    out += "var i" + varId + " = Math.random();\n";
                    acc = 0;

                    rule.forEach(r => {
                        var nacc = acc + r.probability / sum;
                        if( acc ) out += "else "
                        if( nacc < 1 )
                            out += "if( i" + varId + " <= " + nacc + ") ";

                        out += "{" + getBody(r, params) + "}\n"
                        acc = nacc;
                    });
                }
            }

            out = out + src.substr(lastMatch);

            if( modified && level < max )
                out = expand( out, rules, level + 1 );

            return out;
        }
    }

});
