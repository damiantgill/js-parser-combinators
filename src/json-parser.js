import {$, either, not, sequence, repeat, option, capture, map, log, parser_refrence, string_parser} from "./parser.js";
import {apply_predicate, mapchar, WRD, WSP, END, charset, as_value} from "./parser-helpers.js";


//------------------
//     HELPERS
//------------------
function trace(v){ console.log(v); return v} //inline log for debugging
const list = seperator => parser => sequence(parser, repeat(0)(sequence(seperator, parser)))
const spaces = repeat(0)(WSP);
const [json_value, set_json_value_ref] = parser_refrence();

//------------------
//     NUMBER
//------------------
const one_to_nine  = ["1","2","3","4","5","6","7","8","9"]
const zero         = $('0');
const sign         = option(charset('+','-'));
const onenine      = charset(...one_to_nine)
const digit        = charset("0",...one_to_nine);
const digits       = repeat()(digit);
const integer      = (
    either(
        sequence(option($("-")), zero),
        sequence(option($("-")), onenine, option(digits))
    )
);
const fraction  = sequence($("."), digits);
const exponent  = sequence(charset('E','e'), sign, digits)
const number    = map(Number)(capture(sequence(integer, option(fraction), option(exponent))));

//------------------
//     STRING
//------------------
const string_uchar  = apply_predicate(mapchar( ch => (ch >= 32 && ch <= 1114111) && ch != 92 && ch != 34));
const hex           = charset("0",...one_to_nine,"a","A","b","B", "c", "C", "d", "D", "e", "E", "F","f");
const string_chars  = (
    either(
        string_uchar,
        $('\\\\'), $('\\\"'), $('\\/'),$('\\b'),$('\\f'),$('\\n'),$('\\r'),$('\\t'),
        sequence($('\\u'),hex, hex, hex, hex)
    )
);
const json_string      = map(v=>v)(capture(repeat(0)(string_chars)));
const json_string_val  = either(
    as_value("")(sequence($('"'),$('"'))),
    sequence($('"'), json_string, $('"'))
);

//------------------
//     ARRAY
//------------------
const element      = sequence(spaces, json_value, spaces)
const elements     = list($(','))(element);
const empty_array  = as_value([])(sequence($('['), spaces ,$(']')));
const array        = map(v=>[...v])(sequence($('['), elements ,$(']')));
const json_array   = (
    either(
        empty_array,
        array
    )
);

//------------------
//     OBJECT
//------------------
const empty_object  = as_value({})(sequence($('{'), spaces ,$('}')));
const identifier    = sequence(spaces, json_string_val, spaces);
const member        = map(v=>[...v])(sequence(identifier, $(':'), element));
const members       = list($(','))(member);
const object        = map(v=>Object.fromEntries(v))(sequence($('{'), members ,$('}')));
const json_object   = (
    either(
        empty_object,
        object
    )
);

//------------------
//     VALUE
//------------------
set_json_value_ref(
    either(
        json_string_val,
        number,
        as_value(true)($('true')),
        as_value(false)($('false')),
        as_value(null)($('null')),
        json_array,
        json_object
    )
);

const json_parse = string_parser(sequence(element,END));

export {json_string, integer, number, json_value, json_array, member, json_object, element, json_parse}