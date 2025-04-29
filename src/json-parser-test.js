
function trace(v){ console.log(v); return v} //inline log for debugging

import {
    Cursor, ParseError, isError, $, either, not, sequence, repeat, option, capture, map, WRD, DIG, WSP, END, charset, apply_predicate, mapchar, log, tag
} from "./parser.js";

const compare_objects = (o1,o2) => JSON.stringify(o1) == JSON.stringify(o2);

function run_tests(specs){
    for (const [name, tests] of Object.entries(specs)) {
        const results = tests.map(
            test => (
                Array.isArray(test.string)
                ? test.string.map(str => test.assess(test.parser(Cursor(str))))
                : test.assess(test.parser(Cursor(test.string)))
            )
        );

        const errors = results.map(
            (result, n) => (
                Array.isArray(result)
                ? result.map((v, i) => v==false ? `${n+1}:${i+1}`: [])
                : (result == false)
                ? n+1
                : []
            )
        ).flat(2);

        trace(`${name} : ${errors.length <= 0 ? "pass" : "failure of test(s) " + errors.flat(2).join(" ")}`)
    }
}

const one_to_nine = ["1","2","3","4","5","6","7","8","9"]
const zero = $('0');
const sign = charset("-", "+");
const onenine = charset(...one_to_nine)
const digit = charset("0",...one_to_nine);
const hex = charset("0",...one_to_nine,"a","A","b","B", "c", "C", "d", "D", "e", "E", "F","f");
const digits = repeat()(digit);
const intiger = either(
    sequence(option(sign), zero),
    sequence(option(sign), onenine, option(digits))
)
const fraction = sequence($("."), digits);
const exponent = sequence(charset('E','e'),intiger)
const number = map(Number)(capture(sequence(intiger, option(fraction), option(exponent))));

//const list = (left_bracket, seperator, right_bracket) => parser => sequence(left_bracket, repeat(), right_bracket);

const string_uchars = apply_predicate(mapchar( ch => (ch >= 32 && ch <= 1114111) && ch != 92 && ch != 34));
const string_chars = either(
    string_uchars,
    $('\\\\'),
    $('\\"'),
    $('\\/'),
    $('\\b'),
    $('\\f'),
    $('\\n'),
    $('\\r'),
    $('\\t'),
    sequence($('\\u'),hex, hex, hex, hex)
)

const wrap = (left,right) => parser => map(v=>v[0])(sequence(left, parser, right));
const spaces = repeat(0)(WSP);

const quotes = wrap($('"'), $('"'));

const json_string = capture(repeat(0)(string_chars));
const quote_string = 1;

wrap(sequence(spaces,$('"')), capture(json_string), sequence($('"'), spaces));

const json_value = either(
    quotes(json_string),
    number
)

const element = wrap(spaces,spaces)(json_value)

const list = seperator => parser => map(v=>v.flat(2))(sequence(parser, repeat(0)(sequence(seperator, parser))))

const comma_list = list($(','))(element);

trace(comma_list(Cursor(" 1123345.001  ,742,2011 , \" asdasdas ddd d\" ,  1500  ")).value)

const list_test = [
    {
        parser: sequence(comma_list, END),
        string: "12345,678,11500",
        assess: (result) => trace(result.value),
    }
]

const string_test = [
    {
        parser: sequence(json_string,END),
        string: ["\\u041f\\u043e...\\u043b\\u0442\\u043e\\u0440\\u0430", "\\u0417\\u0435\\u043c\\u043b--\\u0435\\u043a\\u043e\\u043f\\u0430"],
        assess: (result) => !isError(result),
    },
    {
        parser: sequence(json_string,END),
        string: ["Sed ut perspiciatis unde", "{}[]dsdid<>@#%^&&**(()_+", "here is a \\\"quote\\\"", "assa \\n dasd \\t \\uAFb1...\\u1Cb0"],
        assess: (result) => !isError(result),
    },
    {
        parser: sequence(json_string,END),
        string: ["\\u0z00","\\1","here is a \"quote\""],
        assess: (result) => isError(result),
    }
]

const intiger_test = [
    {
        parser: sequence(intiger,END),
        string: ["1","0","11", "+0", "+1", "-0", "-2", "+514324", "-972611000"],
        assess: (result) => !isError(result),
    },
    {
        parser: sequence(intiger,END),
        string: ["01","-001", "+0014", "abc", "-cde"],
        assess: (result) => isError(result)
    }
]

const compare_list = (l1,l2) => {
    if(l1.length != l2.length){
        return false
    }

    for(let i=0; i < l1.length; i++){
        if(l1[i] != l2[i]){
            return false;
        }
    }
    return true;
}
const number_test = [
    {
        parser: sequence(number,END),
        string: ["1","0","11", "+0", "+1", "-0", "-2", "+514324", "-972611000"],
        assess: (result) => !isError(result),
    },
    {
        parser: sequence(intiger,END),
        string: ["01","-001", "+0014", "abc", "-cde"],
        assess: (result) => isError(result)
    },
    {
        parser: sequence(number,END),
        string: ["1.00323","0.001","11.7500", "+0.132", "+1.6", "-0.7", "-2.451301", "+514324.4", "-972611000.00"],
        assess: (result) => !isError(result),
    },
    {
        parser: sequence(number,END),
        string: ["01","-001.4324", "+01.001", "hello.15", "-goodby"],
        assess: (result) => isError(result)
    },
    {
        parser: sequence(number,END),
        string: ["100.0016E15","100.0016e15","0.00012e768","0.000E0","0.1751e101", "916E101", "1e175"],
        assess: (result) => !isError(result)
    },
    {
        parser: list($(','))(number),
        string: "100.0016E15,100.0016e15,0.00012e76,0.000,0.1751,916E11,1e175",
        assess: (result) => compare_list(result.value, [100.0016E15,100.0016e15,0.00012e76,0.000,0.1751,916E11,1e175])
    }
]

const run_json_tests = () => run_tests(
    {
        ["intiger"]: intiger_test,
        ["number_test"]: number_test,
        ["string_test"]: string_test
       // ["list_test"] : list_test
    }
)

export {run_json_tests}