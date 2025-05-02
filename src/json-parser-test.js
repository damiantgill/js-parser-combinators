import {
    Cursor, ParseError, isError, $, either, not, sequence, repeat, option, capture, map, WRD, DIG, WSP, END, charset, apply_predicate, mapchar, log, tag
} from "./parser.js";

import {
    json_string, integer, number, json_value, json_array_parser
} from "./json-parser.js";

function trace(v){ console.log(v); return v} //inline log for debugging

const isScalar = (object) => object == null || typeof object != "object";

function  value_compare(value1, value2){
    if(isScalar(value1) != isScalar(value2)) return false;

    if(isScalar(value1) && isScalar(value2)) return value1 === value2;

    const o1_keys = Object.keys(value1);
    const o2_keys = Object.keys(value2);
    if(o1_keys.length != o2_keys.length) return false;

    for (var key of o1_keys){
        if(!value_compare(value1[key], value2[key])) return false;
    }

    return true;
}


const isDeepEqual = (object1, object2) => {

    const objKeys1 = Object.keys(object1);
    const objKeys2 = Object.keys(object2);
  
    if (objKeys1.length !== objKeys2.length) return false;
  
    for (var key of objKeys1) {
      const value1 = object1[key];
      const value2 = object2[key];
  
      const isObjects = isObject(value1) && isObject(value2);
  
      if ((isObjects && !isDeepEqual(value1, value2)) ||
        (!isObjects && value1 !== value2)
      ) {
        return false;
      }
    }
    return true;
  };
  
  const isObject = (object) => {
    return object != null && typeof object === "object";
  };


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

const string_test = [
    {
        parser: sequence(json_string,END),
        string: "\\\"hello\\\"",
        assess: (result) => !isError(result.value),
    },
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
        parser: sequence(integer,END),
        string: ["1","0","11", "+0", "+1", "-0", "-2", "+514324", "-972611000"],
        assess: (result) => !isError(result),
    },
    {
        parser: sequence(integer,END),
        string: ["01","-001", "+0014", "abc", "-cde"],
        assess: (result) => isError(result)
    }
]

const number_test = [
    {
        parser: sequence(number,END),
        string: ["1","0","11", "+0", "+1", "-0", "-2", "+514324", "-972611000"],
        assess: (result) => !isError(result),
    },
    {
        parser: sequence(integer,END),
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

const array_test = [
    {
        parser: json_array_parser,
        string: "[1,2,3,4,5]",
        assess: (result) => value_compare(result.value, [1,2,3,4,5])
    },
    {
        parser: json_array_parser,
        string: "[ ]",
        assess: (result) => value_compare(result.value, [ ])
    },
    {
        parser: json_array_parser,
        string: "[[1]]",
        assess: (result) => value_compare(result.value, [[1]])
    },
    {
        parser: json_array_parser,
        string: "[ 1 , [] ]",
        assess: (result) => value_compare(result.value, [1,[]])
    },
    {
        parser: json_array_parser,
        string: "[ [], 1 ]",
        assess: (result) => value_compare(result.value, [[],1])
    },
    {
        parser: json_array_parser,
        string: "[[]]",
        assess: (result) => value_compare(result.value, [[]])
    },
    {
        parser: json_array_parser,
        string: "[100.0016E15,100.0016e15,0.00012e76,0.000,0.1751,916E11,1e175]",
        assess: (result) => value_compare(result.value, [100.0016E15,100.0016e15,0.00012e76,0.000,0.1751,916E11,1e175])
    },
    {
        parser: json_array_parser,
        string: "[  100.0016E15 , 100.0016e15 , 0.00012e76,0.000, 0.1751,916E11,1e175  ]",
        assess: (result) => value_compare(result.value, [100.0016E15,100.0016e15,0.00012e76,0.000,0.1751,916E11,1e175])
    },
    {
        parser: json_array_parser,
        string: '["hello ", "   ",  "world",  1527, "}[]dsdid<>@#%^&&**(()_+", 973.15, "  __  ", 768.001e27 ]',
        assess: (result) => value_compare(result.value, ["hello ", "   ", "world",  1527, "}[]dsdid<>@#%^&&**(()_+", 973.15, "  __  ", 768.001e27 ])
    },
    {
        parser: json_array_parser,
        string: '[1, 2, 3, [11, 12] , 5]',
        assess: (result) => value_compare(result.value, [1, 2, 3, [11, 12] , 5])
    },
    {
        parser: json_array_parser,
        string: '[]',
        assess: (result) => value_compare(result.value, [])
    },
    {
        parser: json_array_parser,
        string: '["{abcd:123}", "[1,2,3]", "=\\\"", [[[1,2]], 12] , 5]',
        assess: (result) => value_compare(trace(result.value), ["{abcd:123}", "[1,2,3]", "=\\\"", [[[1,2]], 12] , 5])
    }   
]

const run_json_tests = () => run_tests(
    {
        // ["intiger"]: intiger_test,
        // ["number_test"]: number_test,
        ["string_test"]: string_test,
        ["array_test"] : array_test
    }
)

export {run_json_tests}