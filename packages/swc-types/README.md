<p align="center">
    <strong>SWC Types</strong> • A babel/types-like set of helpers for <a href="https://swc.rs/">swc</a>.
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@chialab/swc-types"><img alt="NPM" src="https://img.shields.io/npm/v/@chialab/swc-types.svg?style=flat-square"></a>
</p>

> ⚠️ The development of this plugin has been suspended for maintenance reasons after an initial trial period. Developments will follow when the swc project will be more stable.

---


## Install

```sh
$ npm i @chialab/swc-types -D
$ yarn add @chialab/swc-types -D
```

## Usage

```js
import { t, Visitor } from '@chialab/swc-types';

export class ConsoleVisitor extends Visitor {
    visitCallExpression(e: CallExpression): Expression {
        if (!t.isMemberExpression(e.callee)) {
            return e;
        }

        if (t.isIdentifier(e.callee.object) && e.callee.object.value === 'console') {
            if (t.isIdentifier(e.callee.property)) {
                return t.unaryExpression('void', t.numericLiteral(0));
            }
        }

        return e;
    }
}
```

---

## License

**SWC Types** is released under the [MIT](https://github.com/chialab/rna/blob/master/packages/swc-types/LICENSE) license.
