CLAZZ("LSystem", {
    random:"Math.random",
    rules:null,
    terminals:null,
    empties:null,
    longestRule:-1,

    reserved:{
        '$PUSH':'[',
        '$TPUSH':'{',
        '$POP':']',
        '$TPOP':'}'
        // ,
        // '$PLUS':'+',
        // '$MINUS':'-',
        // '$MUL':'*',
        // '$DIV':'/'
    },

    CONSTRUCTOR:function(){
        this.rules = {};
        this.terminals = {};
        this.empties = {};
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
                    if( set == this.empties ) func.body = '';
                    else{
                        func.body = str.replace(/^[^)]*\)\s*=>\s*/, "")
                                        .replace(/^\s*\{\s*([\s\S]*)\}\s*$/, "$1")
                                        .replace(/^\s*'\s*([\s\S]*)'\s*$/, "$1");
                        
                        if( set == this.rules ){
                            for( var k in this.reserved ){
                                var v = this.reserved[k];
                                func.body = func.body.split(v).join(k);
                            }
                        }

                        func.probability = prob;
                    }

                    func.params = str.replace(/^[^(]*\(([^)]*)\)[\s\S]*/, "$1").split(/\s*,\s*/);
                    name = func.params.shift();

                    if( set != this.empties && name in set ) set[name].push(func);
                    else set[name] = [func];

                    if( name.length > this.longestRule )
                        this.longestRule = name.length;

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

    empty:function(){
        this.__add( this.empties, Array.prototype.splice.call(arguments, 0), true );
    },    

    _match:(function(){
        var match={firstRule:null, firstRulePos:0};
        return function(src, rules, lastMatch){
            var firstRulePos = src.length+1, firstRule, found=false, offset = 0;
            for( var k in rules ){
                var pos = src.indexOf(k, lastMatch);
                if( pos == -1 ) continue;
                if( (pos < firstRulePos) || (pos == firstRulePos && firstRule.length < k.length) ){
                    if( src.length - pos > this.longestRule ){ 
                        pos -= lastMatch;
                        src = src.substr(lastMatch, pos+this.longestRule);
                        offset += lastMatch;
                        lastMatch = 0;
                    }
                    firstRule = k;
                    firstRulePos = pos;
                    found = true;
                }
            }
            if( !found ) return null;

            match.firstRule = firstRule;
            match.firstRulePos = firstRulePos + offset;
            return match;
        }; 
    })(),

    build:function( max, allAlternatives ){
        var varId = 0, THIS=this, random;

        if( !allAlternatives )
            random = eval(this.random);

        var str = expand("axiom", this.rules, this.terminals, 0 );
        str = expand(str, this.empties, this.terminals, max );
        str = expand(str, this.terminals, null, max );
        str = str.replace(/\n\s*\n/g, "\n");
        return str;

        function getBody(rule, vals){
            if( !rule ) return "";
            var str = rule.body.trim(), keys = rule.params;
            for(var i=0, l=keys.length; i<l; ++i )
                if(keys[i]) str = str.split(keys[i]).join(vals[i]);
            return str;
        }

        function getParams( src, lastMatch ){
            var params, acc, pos = lastMatch;
            if( src[pos++] == "(" ){
                var nc = 1, b;
                acc = [""];
                lastMatch++;
                while( nc && pos < src.length ){
                    b = src[pos++] || "";
                    if( b == "(" ) nc++;
                    else if( b == ")" ) nc--;
                    if( nc==1 ){
                        if( b == ',' ) acc.push("");
                        else acc[acc.length-1] += b;
                    }else if( nc )  acc[acc.length-1] += b;
                    lastMatch++;
                }
                params = acc.map( t=>t.trim() );
            }else params = [];            
            params.lastMatch = lastMatch;
            return params;
        }

        function expand( src, rules, terminals, level ){
            var out, pos, srcLen, k, lastMatch;
            var modified, acc, raw, params, match;
            do{
                lastMatch = 0
                modified = false;
                out = "";
                srcLen = src.length;

                while( lastMatch < srcLen ){
                    match = THIS._match(src, rules, lastMatch);
                    if( !match ) break;
                    var firstRule=match.firstRule, firstRulePos=match.firstRulePos;

                    if( terminals ){
                        match = THIS._match(src, terminals, lastMatch);
                        if( match && match.firstRulePos < firstRulePos ){
                            firstRule=match.firstRule; firstRulePos=match.firstRulePos;

                            params = getParams( src, firstRulePos + firstRule.length );
                            raw = src.substr( lastMatch, params.lastMatch - lastMatch );
                            lastMatch = params.lastMatch;

                            if( out != "" && level<max ) out = expand( out, rules, terminals, level+1 );
                            out += raw;

                            return out + expand( src.substr(lastMatch), rules, terminals, level );
                        }
                    }

                    raw = src.substr( lastMatch, firstRulePos-lastMatch );
                    if( raw.length ) out += raw;
                    
                    modified = true;

                    var rule = rules[firstRule];
                    params = getParams( src, firstRulePos + firstRule.length );
                    lastMatch = params.lastMatch;

                    if( rule.length > 1 && !rule.sum ){
                        rule.sum = 0;
                        rule.forEach(r => rule.sum += r.probability);
                    }

                    if( rule.length == 1 )
                        out += getBody(rule[0], params);
                    else if( !allAlternatives ){
                        var rnd = random()*rule.sum, nacc = 0;

                        for( acc=0; acc<rule.length; ++acc ){
                            rnd -= rule[acc].probability;
                            if( rnd <= 0 ){
                                out += getBody(rule[acc], params)
                                break;
                            }
                        };
                    }else{
                        var sum = 0;
                        varId++;
                        out += "var i" + varId + " = " + THIS.random + "();\n";
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

                src = out + src.substr(lastMatch);

                // console.log("\n\nINTERMEDIATE:\n", out);
            }while( modified && level++ < max )

            return src;
        }
    }

});
