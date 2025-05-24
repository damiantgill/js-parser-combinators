# js-parser-combinators
A light weight [parser combinator](https://en.wikipedia.org/wiki/Parser_combinator) library for Javascript. Below is a sample number parser written using this library...
```javascript
import {$, string_parser, either, option, repeat, capture, map} from "./parser.js";

let digits_1to9  = either($('1'),$('2'),$('3'),$('4'),$('5'),$('6'),$('7'),$('8'),$('9'));
let digits_0to9  = either($('0'), digits_1to9);
let sign         = option(either($('-'),$('+')));
let decimal      = option(sequence($('.'), repeat()(digits_0to9)));

//parses and converts the captured string to a numerical value.
let number = map(Number)(
    capture(
        either(
            sequence(sign, $('0'), decimal),
            sequence(sign, digits_1to9, repeat(0)(digits_0to9), decimal)
        )
    )
);

let number_from_string = string_parser(number);

console.log(number_from_string('1375').value); //.........returns the value 1375
console.log(number_from_string('60245.0012').value); //...returns the value 60245.0012
console.log(number_from_string('-0.053').value); //.......returns the value -0.053
```

## About this library
The intent of this project was to experiment with parser combinators. Though the sample [JSON parser](https://github.com/damiantgill/js-parser-combinators/blob/main/src/examples/json-parser.js), for instance, was able to pass a fairly extensive [suit of tests](https://github.com/nst/JSONTestSuite)[^1][^2], this library is not intended for production use. As well, the documentation that follows is not intended to be exhaustive.

[^1]: Tested with the y and n tests (the optional i tests were omitted).
[^2]: Two tests involving pathalogical nesting (several thousand levels) caused exceptions. These were ***n_structure_100000_opening_arrays.json*** and ***n_structure_open_array_object.json***
> [!TIP]
> Don't use this library...

## How to use this Library?
Parser combinators are higher order functions that ultimately take one or more parsers as arguments and produce a new parser as output.

Parsers in this library do not take strings directly but a **Cursor** which holds a string and a position within the string. Parsers output a **Result** or **ParseError** data structure depending on the success or failure of the parsing process. The function signature of a parser is **Cursor → Result**. Result objects may or may not hold and values captured in the parsing process (we will get to that later).

The code below employs **$** to generate a parser recognising a particular string. In this way it can be thought of as a parametric parser whose complete signature is ***String → Parser***.
```javascript
import {Cursor, $} from "./parser.js";
//defines a simple token literal parser: $: string → Cursor → Result
let hello_parser = $('hello');

//output: {string: 'hello', start_position: 0, end_position: 5, value: Symbol(EMPTY)}
console.log(hello_parser(Cursor('hello')));

//output: {string: 'help', error: 'syntax error', position: 3, cursor: null}
console.log(hello_parser(Cursor('help')));
```

The library includes a convenience function (***string_parser***) that wraps the parser in a function taking strings directly.
```javascript
import {Cursor, $, string_parser} from "./parser.js";

let hello_cursor_parser = $('hello'); //takes a cursor
let hello_string_parser = string_parser(hello_cursor_parser); //takes a string

//These two lines produce the same result.
console.log(hello_cursor_parser(Cursor('hello')));
console.log(hello_string_parser('hello'));
```
> [!NOTE]
> Once you have wrapped a parser in ***string_parser*** it is no longer composable. This is intended to be a finishing step , making the final parser a little more convenient to use.

### The Combinators
There are four fundamental parser combinators. The first is **either** : ***([parsers] → Parser)***, which takes two or more parsers and returns the first successful result.

```javascript
import {$, string_parser, either} from "./parser.js";

//Notice either here returns a new parser function.
let cow_dog = either($('cow'), $('dog'));
let cow_dog_string = string_parser(cow_dog);

console.log(cow_dog_string('cow')); //its a cow!;
console.log(cow_dog_string('dog')); //its a dog!;
console.log(cow_dog_string('pig')); //its a... error!;
```

The next is **sequence** : ***([parsers] → Parser)***, which takes a series of parsers and performs them in sequential order.
```javascript
import {$, string_parser, either, sequence} from "./parser.js";

let animals = either($('cow'), $('dog'), $('lizard'));
let clothing = either($('pantsuit'), $('cardigan'));

let question = sequence($('Why is your '), animals, $(' wearing a '), clothing , $('?'));
let question_string_parser = string_parser(question);

console.log(question_string_parser('Why is your dog wearing a pantsuit?')); //succeeds;
console.log(question_string_parser('Why is your lizard wearing a cardigan?')); //succeeds;
console.log(question_string_parser('Why is your cow wearing a waistcoat?')); //fails!;
```
> [!NOTE]
> Parsers return a result as soon as a match is found. They will not parse to the end of the string by default. To force the parser to match against the entire string and explicit **END** token needs to be included.

```javascript
import {$, string_parser, either, sequence, END} from "./parser.js";

let psycho_alpha_disco = $('Psychoalphadisco');
let psycho_string_parser = string_parser(psycho_alpha_disco);

//The parser returns success with at end_position of 16...
console.log(psycho_string_parser('Psychoalphadiscobetabioaquadoloop')); //ignores 'betabioaqua...'

//we add an END token to the parser.
let psycho_with_end = (string_parser(sequence(psycho_alpha_disco, END)));

//Fails at position of 16 — expecting the end of string.
console.log(psycho_with_end('Psychoalphadiscobetabioaquadoloop'));

console.log(psycho_with_end('Psychoalphadisco')); //Succeeds
```

The **option**  : ***(Parser → Parser)*** combinator will not fail if no match is found.
```javascript
let exclamation = option($('!'));
let phrase = sequence($('The cow is grumpy', exclamation));
let phrase_string_parser = string_parser(phrase);

console.log(phrase_string_parser('The cow is grumpy!')); //succeeds;
console.log(phrase_string_parser('The cow is grumpy')); //succeeds — the exclamation is optional;
```

The **repeat** combinator is the most complicated. It is actually a parametric combinator, taking a min and optional max parameter before producing a combinator which can the combine parsers under the repetition operation. It's signature is ***(min, max) → [parsers] → Parser***.

```javascript
import {$, string_parser, repeat} from "./parser.js";
let whoop = $("whoop");
let whoops_1to3 = repeat(1,3)(whoop);
let whoops_1to3_sp = string_parser(whoops_1to3);
console.log(whoops_1to3_sp("whoopwhoop")); //succeeds with two whoops;
console.log(whoops_1to3_sp("whoop")); //Fail — not enough whoops!
console.log(whoops_1to3_sp("whoopwhoopwhoopwhoop")); //Fail — too many whoops!

//Some other whoops to consider...

//With just the min parameter set repeat will continue indefinitely.;
let whoop_one_or_more = repeat(2)(whoop); //from two to forever. 

//repeat without params defaults to 1 — behaves like one or more;
let whoop_one_or_more = repeat()(whoop);

//With min set to zero — repeat behaves like option.
let whoop_one_or_more = repeat(0)(whoop);
```

The function signature of repeat allows you to curry the min/max arguments. It is often more convenient to create a ***one_or_more*** or ***zero_or_more parser*** and avoid using repeat directly.

```javascript
let one_or_more = repeat();
let zero_or_more = repeat(0);

let whoop = $("whoop");

 //equivilent to repeat()(whoop)
let whoop_one_or_more = one_or_more(whoop);

//equivilent to repeat(0)(whoop)
let whoop_zero_or_more = zero_or_more(whoop);
```

### Capturing and Processing values
The parsers in this library do not capture values by default. The parser must be wrapped by the **capture** function to do so.

```javascript
import {$, string_parser, either, repeat, capture} from "./parser.js";
let pokemon = $('pokémon');
let pokemon_sp = string_parser(pokemon);

//output: {string: 'pokémon', start_position: 0, end_position: 7, value: Symbol(EMPTY)}
console.log(pokemon_sp('pokémon')); //notice value: — Symbol(EMPTY)

let pokemon_with_capture = capture(pokemon);
let pokemon_with_capture_sp = string_parser(pokemon_with_capture);

//output: {string: 'pokémon', start_position: 0, end_position: 7, value: 'pokémon'}
console.log(pokemon_with_capture_sp('pokémon')); //notice — value: 'pokémon'

let creatures = either(
    pokemon_with_capture,
    $('dog'),
    $('lizard')
)

let get_pokemons = (
    string_parser(
        repeat()(
            sequence($('('), creatures, $(')'))
        )
    )
);

// value = "pokémon"
console.log(get_pokemons("(dog)(pokémon)(lizard)")); //just captures "pokémon"

//value = ["pokémon","pokémon","pokémon"]
console.log(get_pokemons("(dog)(pokémon)(lizard)(pokémon)(pokémon)")); //we caught them all!
```

Values can be transformed using the **map** function.

```javascript
import {$, string_parser, either, repeat, capture, map} from "./parser.js";
let creatures = either( $('dog'), $('lizard'))

let catch_creatures = repeat()(sequence($('('), capture(creatures), $(')')));

//value = ['dog', 'lizard', 'dog', 'lizard', 'dog']
console.log(string_parser(catch_creatures)('(dog)(lizard)(dog)(lizard)(dog)'))

let map_count = (
    creatures => creatures.reduce(
        (counts, creature) => ({...counts, [creature]: 1 + (counts[creature] || 0)}),
        {}
    )
);

//Using map!
let count_creatures = map(map_count)(catch_creatures);

//value = {dog: 3, lizard: 2}
console.log(string_parser(count_creatures)('(dog)(lizard)(dog)(lizard)(dog)'))
```

### Recussive Parsing
To deal with recursive parsing expressions, the library provides the **parser_refrence : () → [reference, setter]** . This function generates a forward reference that can be updated later in the code.

```javascript
import {
    $, string_parser, either, sequence, option,repeat, parser_refrence
} from "./js-parser-combinators/src/parser.js";

let digits_1to9 = either( $('1'),$('2'),$('3'),$('4'),$('5'),$('6'),$('7'),$('8'),$('9'));
let digits_0to9 = either($('0'), digits_1to9);
let zero = $("0");

let integer = either(
    zero,
    sequence(digits_1to9, repeat(0)(digits_0to9))
);

//here we define the forward reference
let [expression, set_expression_ref] = parser_refrence();

let paren = sequence($('('), expression,  $(')'));

//here we set the reference
set_expression_ref(
    either(
        sequence(integer, option(sequence($(','), expression))),
        sequence(paren, option(sequence($(','), expression)))
    )
)

let expression_parser = string_parser(expression);
console.log(expression_parser('10,0,456,78')); //succeeds
console.log(expression_parser('(1,(2,3)),(4)')); //succeeds
console.log(expression_parser('0, (13,400,51),((0,15)),100')); //succeeds
console.log(expression_parser('((2),(3,4)')); //fails — missing paren!
```
## Full Examples
This repository contains a full [JSON](https://github.com/damiantgill/js-parser-combinators/blob/main/src/examples/json-parser.js) parser implemented using this library. It is capable of parsing most JSON files (assuming they are not pathologically nested > 1000 levels) and converting them to Javascript values. This includes the translation of JSON Unicode escapes into native Javascript string codepionts.

There is also a simple arithmetic [expression parser](https://github.com/damiantgill/js-parser-combinators/blob/main/src/examples/expression-parser.js) that both parsers and calculates the expression result.