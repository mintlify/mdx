/**
 * Sources:
 * 1. https://github.com/PrismJS/prism/blob/master/components/prism-php.js
 * 2. https://github.com/Medalink/laravel-blade/blob/main/Syntaxes/Blade.sublime-syntax
 * 3. https://github.com/miken32/highlightjs-blade/blob/main/src/languages/blade.js
 */
import refractorMarkup from 'refractor/lang/markup.js';
import refractorPhp from 'refractor/lang/php.js';

blade.displayName = 'blade';
blade.aliases = ['blade_php'];

export default function blade(Prism) {
  Prism.register(refractorMarkup);
  Prism.register(refractorPhp);

  (function (Prism) {
    Prism.languages.blade = {
      comment: /{{--([\s\S]*?)--}}/,

      // Blade directives
      directive: {
        pattern: /@\w+(?:::\w+)?(?:\s*\([\s\S]*?\))?/,
        inside: {
          keyword: /@\w+/,
          function: /[:]\w+/,
          punctuation: /[():]/,
        },
      },

      // Echo statements
      echo: {
        pattern: /\{{2,3}[\s\S]*?\}{2,3}/,
        inside: {
          delimiter: /^\{{2,3}|\}{2,3}$/,
          php: {
            pattern: /[\s\S]+/,
            inside: Prism.languages.php,
          },
        },
      },

      // Raw PHP
      php: {
        pattern: /(?:\@php[\s\S]*?\@endphp|\<\?php[\s\S]*?\?\>)/,
        inside: {
          delimiter: {
            pattern: /^\@php|\@endphp|\<\?php|\?\>$/,
            alias: 'important',
          },
          php: {
            pattern: /[\s\S]+/,
            inside: Prism.languages.php,
          },
        },
      },

      // HTML markup
      markup: {
        pattern: /<[^?]\/?(.*?)>/,
        inside: Prism.languages.markup,
      },

      // Keywords for common Blade directives
      keyword:
        /\b(?:@if|@else|@elseif|@endif|@foreach|@endforeach|@for|@endfor|@while|@endwhile|@unless|@endunless|@isset|@endisset|@empty|@endempty|@switch|@case|@break|@default|@endswitch|@include|@extends|@section|@endsection|@yield|@stack|@push|@endpush|@auth|@guest|@endauth|@endguest)\b/,

      // Blade variables
      variable: /\$\w+/,

      // Operators
      operator: /=>|->|\|\||&&|!=|==|<=|>=|[+\-*\/%<>]=?|\?:/,

      // Punctuation
      punctuation: /[\[\](){}:;,]/,
    };

    // Add alias for Blade files
    Prism.languages.blade_php = Prism.languages.blade;
  })(Prism);
}
