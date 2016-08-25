# LSystemJS
Experimental L-System-inspired code generator in JavaScript

This is a class that generates code, given a set of rules.

An example of this being used to create the code that renders a Dragon Curve can be found here:
https://felipemanga.github.io/eteditor/?p=ide&os=b8i7yi4yvy0o2wldmmi73csw6ihzr5

Here's a snippet from that link:
var sys = new LSystem();
sys.rule(
    (X) => XPYFP,
    (Y) => MFXMY,

    (axiom) => {
        FX
    }
);

This example defines 3 rules: X, Y, and axiom.
Each rule is defined as a lambda, where the first parameter acts as the rule's name.
You can have more than one rule with the same name. It will randomly pick which rule to execute at run-time.
Rules can receive and pass parameters like this: (X, p1, p2, pX) => { p1(p3, 42) }

Based on this wikipedia article: https://en.wikipedia.org/wiki/L-system
