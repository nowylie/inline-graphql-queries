const Benchmark = require('benchmark')
const { buildSchema } = require('graphql')
const gql = require('graphql-tag')
const { createGraphQLTagFunctions } = require('../../lib')

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
} = createGraphQLTagFunctions(schema, { apollo: true });

// Setup benchmarking suite
const suite = new Benchmark.Suite()

suite.add('query', function() {
  query`{
    user(id:${'123'}) {
      name
      email
    }
  }`
})

suite.add('graphql-tag query', function() {
  gql`query ($arg0: ID!) {
    user(id:$id) {
      name
      email
    }
  }`
})

suite.add('mutation', function() {
  mutation`{
    update_user(id: ${'123'} , input: ${{name: 'bob'}}) {
      name
      email
    }
  }`
})

suite.add('graphql-tag mutation', function() {
  gql`mutation ($arg0: String, $arg1: user_set_input) {
    update_user(id: $arg0, input: $arg1) {
      name
      email
    }
  }`
})


const nf = new Intl.NumberFormat
let results = {}
suite.on("cycle", function(event) {
  const { name, hz, stats } = event.target
  results[name] = {
    rate: `${nf.format(hz.toFixed(hz < 100 ? 2 : 0))} ops/sec \xb1 ${stats.rme.toFixed(2)}%`,
    runs: stats.sample.length,
  }
});

suite.on("complete", function() {
  console.table(results)
})

suite.run()
