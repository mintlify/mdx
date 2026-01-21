### Twoslash disabled without any additional configs or filenames

```ts
// This is a tooltip that will appear on the next line
const myVariable = 'hello world';
//    ^?

// This is the second line
// You can include [links](#anchor) in your hover content
function myFunction() {
  //     ^?
  return myVariable;
}
```

### Twoslash enabled without any additional configs or filenames

```ts twoslash
// This is a tooltip that will appear on the next line
const myVariable = 'hello world';
//    ^?

// This is the second line
// You can include [links](#anchor) in your hover content
function myFunction() {
  //     ^?
  return myVariable;
}
```

### Twoslash disabled with additional configs and filename

```js something_with_external_packages.tsx icon="js" lines
import { useEffect, useState } from 'react';

export function Component() {
  //            ^?
  const [count, setCount] = useState(0);
  //     ^?     ^?

  useEffect(() => {
    setTimeout(() => setCount(count + 1), 1000);
    // ^?
  }, [count]);

  return <div>{count}</div>;
}
```

### Twoslash enabled with additional configs

```js something_with_external_packages.tsx icon="js" lines twoslash
import { useEffect, useState } from 'react';

export function Component() {
  //            ^?
  const [count, setCount] = useState(0);
  //     ^?     ^?

  useEffect(() => {
    setTimeout(() => setCount(count + 1), 1000);
    // ^?
  }, [count]);

  return <div>{count}</div>;
}
```

### Twoslash cut before

```ts twoslash
type PermissionResult =
  | {
      behavior: 'allow';
      updatedInput: ToolInput;
      updatedPermissions?: PermissionUpdate[];
    }
  | {
      behavior: 'deny';
      message: string;
      interrupt?: boolean;
    };

type ToolInput = string[];

type PermissionUpdate = {
  name: string;
  permission: Array<number>;
};

// ---cut-before---

type CanUseTool = (
  toolName: string,
  input: ToolInput,
  options: {
    signal: AbortSignal;
    suggestions?: PermissionUpdate[];
    //            ^?
  }
) => Promise<PermissionResult>;
```
