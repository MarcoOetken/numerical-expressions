import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client'
import dotenv from 'dotenv'
import fetch from 'node-fetch'

const util = require('util')

dotenv.config()

const {
  GRAPHQL_SERVER_HOST: host,
  GRAPHQL_SERVER_PORT: port,
  GRAPHQL_SERVER_PATH: path,
} = process.env

const uri = `http://${host}:${port}${path}`

const client = new ApolloClient({
  link: new HttpLink({ uri, fetch }),
  cache: new InMemoryCache(),
})

// Abfrage im graphql=playground
// mutation CreateTerms($input: TermCreateInput!) {
//   createTerms(input: [$input]) {
//     terms { value, input }
//   }
// }

// Query variables:
// {
//   "input": {
//     "_id": 1,
//     "input": "1",
//     "value": 1
//   }
// }

// Expression dazu
// mutation CreateExpr($input: ExprCreateInput!) {
//   createExprs(input: [$input]) {
//     exprs {_id, name, input}
//   }
// }

// {
//   "input": {
//     "input": "1+1",
//     "name": "one+one",
//     "is_term_one": { "connect": {"where": {"_id": "0bd47de8-4af5-4411-b501-a697c89aab82"}}
//     }
//   }
// }

function newExpr(exprCreateInput, continuation)
{
  client.mutate({ 
    mutation: gql`
      mutation CreateExpr($input: ExprCreateInput!) {
      createExprs(input: [$input]) {
        exprs { _id }
      }
    }`,
    variables: exprCreateInput
  })
  .then((data) => { evalExprData(data, exprCreateInput , continuation) })
  .catch((e) => {
    console.error(util.inspect(exprCreateInput, {depth: null}))
     logError(e) })
}

function newTerm(term, continuation)
{
  client.mutate({ 
    mutation: gql`
      mutation CreateTerms($input: [TermCreateInput!]!) {
      createTerms(input: $input) {
        terms { _id }
      }
    }`,
    variables: term
  })
  .then((data) => { evalTermData(data, term, continuation) })
  .catch((e) => { logError(e) })
}

function logError(e)
{
  console.error(e)
  console.log("e.result:::::::::")
  console.log(e.result)
  // for (let i in e.result.errors)
  // {
  //   console.log(i)
  // }
}

function createTerm(input)
{
  const result = {}
  const term = {}
  if (Number.isInteger(parseInt(input)))
  {
    term.value = 1
  }
  term.input = input
  result.input = term
  return result
}

function createExpr(input, name, term)
{
  const expr = {}
  expr.input = input
  expr.name = name
  expr.is_term_one = {
    connect: {
      where: {
        _id: term._id
      }
    }
  }
  return {
    input: expr
  }
}

function evalExprData(data, expr, continuation)
{
  console.log("EvalExpData!!!")
  expr._id = data.data.createExprs.exprs[0]._id
  console.log(expr)
  if (continuation != null)
  {
    continuation()
  }
}

function evalTermData(data, term, continuation)
{
  console.log("EvalTermData!!!")
  console.log(term)
  term._id = data.data.createTerms.terms[0]._id
  if (continuation != null)
  {
    continuation()
  }
}

const inputString = '4'
const term3 = createTerm(inputString) 
newTerm(term3, () => {
  newExpr(createExpr(inputString, 'Digit_4', term3))
})
