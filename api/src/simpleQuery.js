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

// Abfrage im graphql=playground
// {
//   exprs
//   {
//     name
//     input
//     is_term_one {input}
//     is_operator {input}
//     is_term_two {input}
//   }
// }

client.query({ 
  query: gql`
    query { exprs
    {
      name
      input
      is_term_one { _id, input }
      is_operator { input }
      is_term_two { _id, input }
    }}`
})
.then((data) => {
  console.log("DATA!!!")
  console.log(util.inspect(data, {depth: null}))
  for (let i in data.data.exprs)
  {
    console.log(i)
    console.log(data.data.exprs[i])
  }
})
.catch((e) => { logError(e) })
