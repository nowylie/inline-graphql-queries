import { buildSchema } from 'graphql';
import { createGraphQLTagFunctions } from '../index';

// Schema to test against
const schema = buildSchema(`
  type Query {
    user(id: ID!): User
  }

  type Mutation {
    update_user(id: ID!, input: UserInput!): User
  }

  input UserInput {
    name: String
    email: String
  }

  type User {
    id: ID!
    name: String!
    email: String!
  }
`)

// Create our tag functions
const {
  query,
  mutation,
} = createGraphQLTagFunctions(schema);

test('Scalar in Query', async() => {
  expect(query`{
    user(id: ${'123'}) {
      name
    }
  }`.query)
  .toMatch(`query ($arg0: ID!) {
  user(id: $arg0) {
    name
  }
}`)
})

test('Object in Mutation', async() => {
  expect(mutation`{
    update_user(id: "123", input: ${{ name: 'Bob' }}) {
      name
    }
  }`.query)
  .toMatch(`mutation ($arg0: UserInput!) {
  update_user(id: "123", input: $arg0) {
    name
  }
}`)
})
