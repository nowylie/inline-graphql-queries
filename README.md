# Inline GraphQL Variables

This repository contains a small library that attempts to improve
the developer experience when writing GraphQL queries in JavaScript
by allowing the developer to pass query arguments as part of the
query string using template literals.

> **NOTE:** This probably shouldn't be used in production! Read the
> conclusion at the end.

## Example

Traditionally, queries using `fetch` need to be written as:

```js
const query = `query ($arg0: ID!) {
  user(id: $arg0) {
    name
    email
  }
}`

const variables = {
  arg0: '123',
}

const response = await fetch('/graphql', {
  method: 'post',
  body: JSON.stringify({ query, variable }),
})

const { data } = await response.json()
```

This library allows the same query to be written as:

```js
const query = query`{
  user(id: ${'123'}) {
    name
    email
  }
}`

const response = await fetch('/graphql', {
  method: 'post',
  body: JSON.stringify(query),
})

const { data } = await response.json()
```

## Caveats

For this library to work it needs to load a representation of the
backend GraphQL schema into memory. This can be performed
automatically by running an introspection query against the GraphQL
API endpoint but for anything but a small schema will result in
an expensive network request, high memory usage, and increased load
on the backend.

## Benchmarks

Some benchmarks against the `graphql-tag` library to get an
idea of how this would perform in production:

| (index)              | rate                        | runs |
|---                   |---                          |---   |
| query                |  '80,371 ops/sec ± 1.05%'   |  91  |
| graphql-tag query    | '1,013,910 ops/sec ± 3.39%' |  86  |
| mutation             |  '62,183 ops/sec ± 2.79%'   |  92  |
| graphql-tag mutation |  '572,720 ops/sec ± 1.89%'  |  90  |

## Conclusion

I definitely feel like the developer experience of writing queries
is improved with this library, but considering the caveats and
performance I would **not** use it in production.

In the future I think it would be worth exploring whether this could
be run as part of a compiling step during development. If the costs
only had to be paid when building a release I think it mitigates the
downsides.
