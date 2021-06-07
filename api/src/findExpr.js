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

function logResult(data)
{
  console.log("Data for expression by name:")
  console.log(util.inspect(data, {depth: null})) 
  console.log("Expression:")
  // for (let i in data.data.expr)
  // {
  //   console.log(i)
  console.log(data.data.expr)
  // }
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
    query GetExprByName($nam: String!) {
       expr(name: $nam)
      {
        name
        input
        is_term_one {  _id, input }
        is_operator { input }
        is_term_two { _id, input }
      }
    }`,
    variables: { nam: nam }
})
.then((data) => { logResult(data) })
.catch((e) => { logError(e) })
