import {$, string_parser, either, sequence, option, repeat, capture, map, parser_refrence} from "../parser.js";
function trace(v){ console.log(v); return v} //inline log for debugging
let digits_1to9 = either( $('1'),$('2'),$('3'),$('4'),$('5'),$('6'),$('7'),$('8'),$('9'));
let digits_0to9 = either($('0'), digits_1to9);
let sign = option(either($('-'),$('+')));
let decimal = option(sequence($('.'), repeat()(digits_0to9)));

let number = map(Number)(
    capture(
        either(
            sequence(sign, $('0'),decimal),
            sequence(sign, digits_1to9, repeat(0)(digits_0to9), decimal)
        )
    )
);

let [expression, set_expression_ref] = parser_refrence();

let padding = parser => sequence(repeat(0)($(" ")),parser,  repeat(0)($(" ")));
let operator = padding(capture(either($('+'), $('-'), $('/'), $('*'))));

let ops = {'+':(a,b)=>a+b, '-':(a,b)=>a-b, '*':(a,b)=>a*b, '/':(a,b)=>a/b,}
let evaluate = exp => (
    exp.length > 1
    ? ops[exp[1]](evaluate(exp[0]), evaluate(exp[2]))
    : exp
)

let paren = sequence($('('), expression,  $(')'));

set_expression_ref(
    map(evaluate)(
        either(
            sequence(padding(number), option(sequence(operator, expression))),
            sequence(padding(paren), option(sequence(operator, expression)))
        )
    )
)

const expression_parser = string_parser(expression);

export{expression, expression_parser}