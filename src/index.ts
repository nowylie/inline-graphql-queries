import { parse, parseType, print, visit, VariableDefinitionNode } from 'graphql/language';

import {
  ArgumentNode,
  Kind,
  GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLSchema,
  TypeInfo,
  TypeNode,
  VariableNode,
  visitWithTypeInfo,
} from 'graphql';

// The following function was borrowed from:
// https://github.com/apollographql/graphql-tools/blob/513108b1a6928730e347191527cba07d68aadb74/src/transforms/AddArgumentsAsVariables.ts#L171
function typeToAst(type: GraphQLInputType): TypeNode {
  if (type instanceof GraphQLNonNull) {
    const innerType = typeToAst(type.ofType);
    if (
      innerType.kind === Kind.LIST_TYPE ||
      innerType.kind === Kind.NAMED_TYPE
    ) {
      return {
        kind: Kind.NON_NULL_TYPE,
        type: innerType,
      };
    } else {
      throw new Error('Incorrent inner non-null type');
    }
  } else if (type instanceof GraphQLList) {
    return {
      kind: Kind.LIST_TYPE,
      type: typeToAst(type.ofType),
    };
  } else {
    return {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type.toString(),
      },
    };
  }
}

function isArgVariable(node: VariableNode) {
  return /arg\d+/.test(node.name.value);
}

export function createGraphQLTagFunctions(schema: GraphQLSchema, { apollo = false } = {}) {
  let args: VariableDefinitionNode[];
  const typeInfo = new TypeInfo(schema);
  const visitor = visitWithTypeInfo(typeInfo, {
    Variable(node) {
      if (!isArgVariable(node)) {
        return;
      }

      args.push({
        kind: Kind.VARIABLE_DEFINITION,
        type: typeToAst(typeInfo.getInputType()!),
        variable: node,
      });
    },
    OperationDefinition: {
      enter() {
        args = [];
      },
      leave(node) {
        return {
          ...node,
          variableDefinitions: [...args, ...(node.variableDefinitions ?? [])],
        };
      },
    },
  });

  function generateQuery(op: 'query' | 'mutation', strings: TemplateStringsArray, ...expressions: any[]) {
    const [firstPart, ...remainingParts] = strings;
    const variables: Record<string, any> = {};

    // Prepend the operation name to the queryString if it's not provided
    let queryString = (firstPart.startsWith(op) ? '' : op) + firstPart;

    for (let i = 0; i < remainingParts.length; i++) {
      // Generate an argument name in the form of arg{n}, substitute
      // the expression with the argument name prefixed by a $, and
      // store the expression to the variables object with the
      // generated name
      const argName = 'arg' + i;
      queryString += '$' + argName;
      variables[argName] = expressions[i];

      // Concatenate the next query part to the query string
      queryString += remainingParts[i];
    }

    const query = visit(parse(queryString), visitor);

    // ApolloClient expects an options object that looks like
    // { query|mutation: GraphQLDocument, variables: Object }
    if (apollo) {
      return {
        [op]: query,
        variables,
      };
    }

    // Regular fetch requests should be sent in the format
    // { query: `querystring`, variables: Object }
    return {
      query: print(query),
      variables,
    };
  }

  return {
    fragment() {
      /// FIXME
      return 'fragment';
    },
    query: generateQuery.bind(null, 'query'),
    mutation: generateQuery.bind(null, 'mutation'),
  };
}
