import {
    Cursor, ParseError, Result, isError, $, either, not, sequence, repeat, option, capture, map, WRD, DIG, WSP, END, charset, apply_predicate, mapchar, log, tag
} from "./parser.js";
function trace(v){ console.log(v); return v} //inline log for debugging
const flatten = (n=1) => map(v => (
    Array.isArray(v)
    ? v.flat(n)
    : v
));

const spaces = repeat(0)(WSP);
const one_to_nine = ["1","2","3","4","5","6","7","8","9"]
const zero = $('0');
const sign = charset("-", "+");
const onenine = charset(...one_to_nine)
const digit = charset("0",...one_to_nine);
const hex = charset("0",...one_to_nine,"a","A","b","B", "c", "C", "d", "D", "e", "E", "F","f");
const digits = repeat()(digit);
const integer = either(
    sequence(option(sign), zero),
    sequence(option(sign), onenine, option(digits))
);
const fraction = sequence($("."), digits);
const exponent = sequence(charset('E','e'),integer)
const number = map(Number)(capture(sequence(integer, option(fraction), option(exponent))));

const string_uchar = apply_predicate(mapchar( ch => (ch >= 32 && ch <= 1114111) && ch != 92 && ch != 34));
const string_chars = either(
    string_uchar,
    $('\\\\'),
    $('\\\"'),
    $('\\/'),
    $('\\b'),
    $('\\f'),
    $('\\n'),
    $('\\r'),
    $('\\t'),
    sequence($('\\u'),hex, hex, hex, hex)
)

const as_value = value => parser => cursor => {
    const result = parser(cursor);
    return (
        isError(result)
        ? result
        : Result(cursor.string, result.start_position, result.end_position, value)
    )
}

const wrap = (left, content, right) => map(v=>v[0])(sequence(left, content, right));

const json_string = capture(repeat(0)(string_chars));


function parser_refrence(){
    let inner_slot = [];
    return [
        cursor => inner_slot[0](cursor),
        parser => inner_slot[0] = parser
    ]
}

const [json_array, set_json_array_ref] = parser_refrence();
const json_value = either(
    wrap($('"'), json_string, $('"')),
    number,
    json_array
)

const extract = map(v=>v[0])

const element = wrap(spaces, json_value, spaces)
//[[],1]
const list = seperator => parser => map(v => [v[0],...(v[1] ? v[1] : [])])(sequence(parser, repeat(0)(extract(sequence(seperator, parser)))))

const elements = list($(','))(element);

const empty_array = as_value([])(sequence($('['), spaces ,$(']')));
const array = wrap($('['), elements ,$(']'));
const json_array_parser = either(
    empty_array,
    array
);

set_json_array_ref(json_array_parser);

export {json_string, integer, number, json_value, json_array_parser}