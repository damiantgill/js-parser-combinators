function trace(v){ console.log(v); return v} //inline log for debugging

import {
    Cursor, ParseError, isError, $, either, not, sequence, repeat, option, capture, map, WRD, DIG, WSP, charset, log, tag
} from "./parser.js";

const compare_objects = (o1,o2) => JSON.stringify(o1) == JSON.stringify(o2);

function run_tests(specs){
    for (const [name, tests] of Object.entries(specs)) {
        const results = tests.map(
            test => {
                const cursor = Cursor(test.string);
                return test.assess(test.parser(cursor))
            }
        );

        const result = results.findIndex(v => v==false);
        trace(`${name} : ${result < 0 ? "pass" : "failure of test " + (result+1)}`)
    }
}




//-------------------------
//      STRING TOKENS
//-------------------------
const $_test = [
    {
        parser: $("hello"),
        string: "hello",
        assess: (result) => (
            !isError(result)
            && result.cursor_end.position == 5
            && result.match == "hello"
        )
    },
    {
        parser: $("hello"),
        string: "world",
        assess: (result) => isError(result) && result.cursor.position == 0
    },
    {
        parser: $("hello"),
        string: "hell",
        assess: (result) => isError(result) && result.cursor.position == 4
    },
    {
        parser: $("car\nbook\nnoodle\npig"),
        string: "car\nbook\nnoodle\npig",
        assess: (result) => !isError(result)
    },
    {
        parser: $("car\nbook\nnoodle\npig"),
        string: "car\nbook\nnood!le\npig",
        assess: (result) => isError(result)
    }
];

//-------------------------
//      EITHER
//-------------------------
const either_test = [
    {
        parser: either($("hello"), $("world")),
        string: "hello",
        assess: (result) => !isError(result) && result.cursor_end.position == 5
    },
    {
        parser: either($("hello"), $("world!")),
        string: "world!",
        assess: (result) => !isError(result) && result.cursor_end.position == 6
    },
    {
        parser: either($("hello"), $("world")),
        string: "goodby",
        assess: (result) => isError(result) && result.cursor.position == 0
    },
    {
        parser: either($("abcd*"), $("abc*"), $("abcde*")),
        string: "abcdefg",
        assess: (result) => isError(result) && result.cursor.position == 3
    },
    {
        parser: either($("000100"), $("001000"), $("000001")),
        string: "10000100",
        assess: (result) => isError(result)
    },
]


//-------------------------
//      NOT
//-------------------------
const not_test = [
    {
        parser: not($("hello")),
        string: "abc123...hello",
        assess: (result) => result.match == "abc123..."
    },
    {
        parser: not($("hello")),
        string: "abc123...goodby!",
        assess: (result) => result.match == "abc123...goodby!"
    },
    {
        parser: not(either($("dog"), $("cat"), $("pig"))),
        string: "zoozoozoopigzoo",
        assess: (result) => result.match == "zoozoozoo"
    },
    {
        parser: not(either($("dog"), $("cat"), $("pig"))),
        string: "candotpigzoo",
        assess: (result) => result.match == "candot" && result.cursor_end.position == 6
    },
    {
        parser: not(either($('..x...'), $('....x...'), $('...x'))),
        string: '.....x...',
        assess: (result) => result.match == "."
    },
    {
        parser: not(either($('x...'), $('..x..'), $('...x'))),
        string: '.....x...',
        assess: (result) => result.match == ".."
    },
    {
        parser: not(either($('x...'), $('..x..'), $('.x'))),
        string: '.....x..',
        assess: (result) => result.match == "..."
    }
];

//-------------------------
//      NOT
//-------------------------
const option_test = [
    {
        parser: option($("hello")),
        string: "hello",
        assess: (result) => result.match == "hello"
    },
    {
        parser: option($("hello")),
        string: "world",
        assess: (result) => result.cursor_start == result.cursor_end
    },
];

//-------------------------
//      SEQUENCE
//-------------------------
const sequence_test = [
    {
        parser: sequence($("hello"),$(" "), $("world")),
        string: "hello world",
        assess: (result) => !isError(result) && result.match == "hello world"
    },
    {
        parser: sequence($("hello"),$(" "), $("world")),
        string: "hello-world",
        assess: (result) => isError(result)
    },
];

//-------------------------
//      REPEAT
//-------------------------
const repeat_test = [
    {
        parser: repeat()($("abc")),
        string: "abcabcabcxyz",
        assess: (result) => !isError(result) && result.match == "abcabcabc"
    },
    {
        parser: repeat(2)($("abc")),
        string: "abcabc",
        assess: (result) => !isError(result)
    },
    {
        parser: repeat(0,2)($("abc")),
        string: "abcabc",
        assess: (result) => !isError(result)
    },
    {
        parser: repeat(2,2)($("abc")),
        string: "abcabc",
        assess: (result) => !isError(result)
    },
    {
        parser: repeat(2,2)($("abc")),
        string: "abcabcabc",
        assess: (result) => isError(result)
    },
    {
        parser: repeat(2,2)($("abc")),
        string: "abc",
        assess: (result) => isError(result)
    },
    {
        parser: repeat(0,0)($("abc")),
        string: "abc",
        assess: (result) => isError(result)
    },
    {
        parser: repeat(0,2)($("abc")),
        string: "abcabcabc",
        assess: (result) => isError(result)
    },
    {
        parser: repeat(0)($("abc")),
        string: "xyz",
        assess: (result) => !isError(result) && result.cursor_start == result.cursor_end
    },
    {
        parser: repeat()($("abc")),
        string: "xyz",
        assess: (result) => isError(result)
    }
];

//-------------------------
//      COMBINED
//-------------------------
const cat_dog_bird_tag = sequence( 
    $("<"), 
    either($("cat"), $("bird"), $("dog")),
    $(">")
)

const combined_test = [
    {
        parser: repeat(4)(cat_dog_bird_tag),
        string: "<cat><dog><bird><dog>",
        assess: (result) => !isError(result) && result.match == "<cat><dog><bird><dog>"
    },
    {
        parser: repeat(3)(cat_dog_bird_tag),
        string: "<cat><dog><bird><!!>",
        assess: (result) => !isError(result) && result.match == "<cat><dog><bird>"
    },
    {
        parser: repeat(5)(cat_dog_bird_tag),
        string: "<cat><dog><bird><dog>",
        assess: (result) => isError(result)
    },
    {
        parser: repeat(0)(cat_dog_bird_tag),
        string: "<pig><cat><dog><bird><dog>",
        assess: (result) => !isError(result) && result.match == ""
    },
    {
        parser: repeat(1)(cat_dog_bird_tag),
        string: "<cat><dog><pig><bird><dog>",
        assess: (result) => !isError(result) && result.match == "<cat><dog>"
    },
    {
        parser: repeat(1)(
            sequence( 
                $("<"), 
                either($("cat"), $("bird"), $("dog")),
                option($('!')),
                $(">")
            )
        ),
        string: "<bird><cat!>",
        assess: (result) => result.match == "<bird><cat!>"
    },
    {
        parser: repeat()(
            sequence(repeat()(WRD), option($(" ")))
        ),
        string: "abcz dnca prgj--",
        assess: (result) => result.match == "abcz dnca prgj"
    }
];

//-------------------------
//      LINE
//-------------------------
const line_and_column = [
    {
        parser: not($('end')),
        string: 'once upon\n a time \nthere was\n the end',
        assess: (result) => result.cursor_end.line == 3 && result.cursor_end.column == 5
    },
    {
        parser: repeat(1)(either($("hello!"), $("world!"), $("goodby?"), $('\n'))),
        string: "\nhello!hello!\nworld!\nhello!goodby?Oooops!",
        assess: (result) => !isError(result) && result.cursor_end.line == 3 && result.cursor_end.column == 13
    },
    {
        parser: sequence(repeat(0,10)(either($("<->"), $("{-}"), $('\n'))),$('missing part')),
        string: "<->\n<->{-}\n{-}\n<->\n{-}...!",
        assess: (result) => (
            isError(result)
            && result.cursor.position == 22
            && result.cursor.line == 4
            && result.cursor.column == 3
        )
    },      
];

//-------------------------
//      CAPTURE
//-------------------------
const capture_test = [
    {
        parser: capture($("hello")),
        string: "hello",
        assess: (result) => (
            !isError(result)
            && result.value == "hello"
        )
    },
    {
        parser: sequence($("a "),capture($("dark")), $(" and "), capture($("stormy")), $(" night")),
        string: "a dark and stormy night",
        assess: (result) => (
            !isError(result)
            && result.match == "a dark and stormy night"
            && compare_objects(result.value, ['dark', 'stormy'])
        )
    },
    {
        parser: repeat()(
            sequence(
                $("<"),
                capture(either($("cat"), $("bird"), $("dog"))),
                $(">")
            )
        ),
        string: "<cat><dog><bird><dog>",
        assess: (result) => !isError(result)  && compare_objects(result.value, [['cat'],['dog'],['bird'],['dog']])
    },
    {
        parser: repeat()(
            sequence(
                $("<"),
                either($("cat"),$("bird"),  capture($("dog"))),
                $(">")
            )
        ),
        string: "<cat><dog><bird><dog><!!>",
        assess: (result) => (
            !isError(result)
            && compare_objects(result.value, [['dog'],['dog']])
            && result.match == "<cat><dog><bird><dog>"
        )
    }
];

//-------------------------
//      MAP
//-------------------------
const num_digits = repeat()(
    either(...[1,2,3,4,5,6,7,8,9,0,'.'].map(v => $(v.toString())))
)

const get_number = map(Number)(capture(num_digits));
const list = seperator => parser => sequence(parser, option(seperator));
const backets = (left, right) => parser => sequence(left, parser,right);
const angle_brackets = backets($("<"), $(">"));
const collect_animal_tags = (
    repeat()(
        map(v => v[0])(
            either(
                angle_brackets(tag('cats')(capture($("cat")))),
                angle_brackets(tag('birds')(capture($("bird")))),
                angle_brackets(tag('dogs')(capture($("dog"))))
            )
        )
    )
)

const map_test = [
    {
        parser: get_number,
        string: "5831794260",
        assess: (result) => result.value == 5831794260
    },
    {
        parser: repeat()(
                    map(v => v[0])
                    (
                        list($('|'))(get_number)
                    )
                ),
        string: "135|5162|15.356",
        assess: (result) => compare_objects([135,5162,15.356], result.value)
    },
    {
        parser: sequence(tag('first')(capture($('hello'))), $(" "), tag('second')(capture($('world')))),
        string: "hello world",
        assess: result => compare_objects([{label:"first", value:'hello'},{label:"second", value:'world'}], result.value)
    },
    {
        parser: collect_animal_tags,
        string: "<dog><bird><cat>",
        assess: result => compare_objects([{label:"dogs", value:"dog"},{label:"birds", value:"bird"},{label:"cats", value:"cat"}], result.value)
    },
    {
        parser:map(
            animal_tags => animal_tags.reduce(
                (obj, animal_tags) => (
                    (animal_tags.label in obj)
                    ? {...obj, [animal_tags.label]: obj[animal_tags.label] + 1}
                    : {...obj, [animal_tags.label]:1}
                ),
                {}
            )
        )(
            collect_animal_tags
        ),
        string: "<bird><dog><bird><cat><bird><cat>",
        assess: result => compare_objects({birds:3, dogs:1, cats:2}, result.value)
    }
];


// const sign = charset("-", "+");
// const zero = $('0');
// const onenine = charset("1","2","3","4","5","6","7","8","9")
// const digit = charset("0","1","2","3","4","5","6","7","8","9");
// const digits = repeat()(onenine);
// const intiger = sequence(option(sign),log(onenine), option(digits));

// const fraction = sequence($("."), digits);
// const number = sequence(sign, digits,  digits, option(fraction));

// const intiger_test = [
//     {
//         parser: intiger,
//         string: "1",
//         assess: (result) => !isError(result),
//     },
//     {
//         parser: intiger,
//         string: "01",
//         assess: (result) => isError(result),
//     },
//     {
//         parser: intiger,
//         string: "+0",
//         assess: (result) => !isError(result),
//     }
// ]

const run_all_tests = () => run_tests(
    {
        ["$"]:$_test,
        ["either"]: either_test,
        ["not"]: not_test,
        ["option"]: option_test,
        ["sequence"]: sequence_test,
        ["repeat"]: repeat_test,
        ["combined"]: combined_test,
        ["capture"]: capture_test,
        ["map"]: map_test,
 //       ["intiger"]: intiger_test
    }
)

export {run_all_tests};