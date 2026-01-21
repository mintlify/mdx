```js Link Testing icon="js" lines twoslash
import { useEffect, useState } from 'react';

// @link Component
export function Component() {
  //            ^?
  return <div>{count}</div>;
}

// @link OtherFunction: #hola-there
export function OtherFunction() {
  //            ^?
  return <div>{count}</div>;
}

// @link ExternalLink: https://google.com
export function ExternalLink() {
  //            ^?
  const str =
    "Don't worry, only hover targets with ExternalLink will be affected, not random strings";
  return <div>{count}</div>;
}
```

### Component

Hello world from the `Component` section
