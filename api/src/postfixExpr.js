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

function logResult(data, name)
{
  console.log("Data for expression by name:")
  //console.log(util.inspect(data, {depth: null})) 
  //console.log("Expression:")
  const expr = find(data.data.exprs, name)
  const result = getOutput(expr)
  console.log(result)
}

function getOutput(expr)
{
  // if (expr == null)
  // [
  //   return ''
  // ]
  // else
  {
    if (expr.is_term_two != null)
    {
      return getOutputOfTerm(expr.is_term_one) + ' ' + getOutputOfTerm(expr.is_term_two) + ' ' + getOutputOfOperator(expr.is_operator)
    }
    else
    {
      return getOutputOfTerm(expr.is_term_one)
    }
  }
}

function getOutputOfTerm(term)
{
  if (term.is_expr != null)
  {
    return getOutput(term.is_expr)
  }
  else
  {
    return String(term.value)
  }
}

function getOutputOfOperator(op)
{
  return op.input
}

function find(exprs, name)
{
  const max = exprs.length
  var index;
  for (index = 0; index < max; index++)
  {
    if (exprs[index].name == name)
    {
      return exprs[index]
    }
  }
  return null
}

// Abfrage im graphql=playground für festen Text
// query GetExprByName {
//   expr(name: "simpleTerm")
//   {
//     name
//     input
//     is_term_one {input}
//     is_operator {input}
//     is_term_two {input}
//   }
// }

// Abfrage für flexiblen Text
// query GetExprByName($nam: String!) {
//   expr(name: $nam)
//   {
//     name
//     input
//     is_term_one {input}
//     is_operator {input}
//     is_term_two {input}
//   }
// }
// zugehörige Variablen
// { "nam": "simpleTerm" }
const nam = process.argv.length > 2 ? process.argv[2] : 'minusExample'

client.query({ 
  query: gql`
    query {
      exprs
      {
        _id
        name
        input
        is_term_one {  _id, value, is_expr { input, is_term_one { value }, is_operator {input}, is_term_two { value } } }
        is_operator { input }
        is_term_two { _id, value }
      }
      terms
      {
        _id, value, is_expr { _id }
      }
    }`,
    variables: { nam: nam }
})
.then((data) => { logResult(data, nam) })
.catch((e) => { logError(e) })
