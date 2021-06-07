import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client'
import { Console } from 'console'
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
//     "is_term": { "connect": {"where": {"_id": "0bd47de8-4af5-4411-b501-a697c89aab82"}}
//     }
//   }
// }

function newExpr(expr, continuation)
{
  console.log(util.inspect(convertExpr(expr), {depth: null}))
  client.mutate({ 
    mutation: gql`
      mutation CreateExpr($input: ExprCreateInput!) {
      createExprs(input: [$input]) {
        exprs { _id }
      }
    }`,
    variables: convertExpr(expr)
  })
  .then((data) => {
    expr._id = idFromExprData(data)
    if (continuation != null) { continuation() }
   })
  .catch((e) => { logError(e, expr) })
}

function newTerm(term, continuation)
{
//  console.log(convertTerm(term))
  client.mutate({ 
    mutation: gql`
      mutation CreateTerm($input: TermCreateInput!) {
      createTerms(input: [$input]) {
        terms { _id }
      }
    }`,
    variables: convertTerm(term)
  })
  .then((data) => {
     term._id = idFromTermData(data)
     if (continuation != null) { continuation() }
    })
  .catch((e) => { logError(e, term) })
}

function newOperator(operator, continuation)
{
  console.log(convertOperator(operator))
  client.mutate({ 
    mutation: gql`
      mutation CreateOp($input: OperatorCreateInput!) {
      createOperators(input: [$input]) {
        operators { _id }
      }
    }`,
    variables: convertOperator(operator)
  })
  .then((data) => {
    operator._id = idFromOpData(data)
    if (continuation != null) { continuation() }
   })
  .catch((e) => { logError(e, operator) })
}

function convertExpr(expr)
{
  if (expr.secondOp != null)
  {
    return {
      input: {
        input: expr.input,
        name: expr.name,
        is_term_one: connectWith(expr.firstOp),
        is_operator: connectWith(expr.operator),
        is_term_two: connectWith(expr.secondOp)
      }  
    }
  }
  else
  {
    return {
      input: {
        input: expr.input,
        name: expr.name,
        is_term_one: connectWith(expr.firstOp)
      }
    }  
  }
}

function connectWith(node)
{
  return {
    connect: {
      where: {
        _id: node._id
      }
    }
  }  
}

function convertTerm(term)
{
  if (term.expr != null)
  {
    return {
      input: {
        input: term.expr.input,
        is_expr: connectWith(term.expr)
      }
    }
  }
  else
  {
    return {
      input : {
        input: term.input,
        value: term.value,
      }
    }  
  }
}

function convertOperator(op)
{
  return {
    input : {
      input: op.operator
    }
  }
}

function idFromExprData(data)
{
  //console.log("MUTATE!!!")
  return data.data.createExprs.exprs[0]._id
}

function idFromTermData(data)
{
  //console.log("MUTATE!!!")
  return data.data.createTerms.terms[0]._id
}

function idFromOpData(data)
{
  // console.log("idFromOpData:")
  // console.log(util.inspect(data, {depth: null}))
  console.log('op id from data: ' + String(data.data.createOperators.operators[0]._id))
  return data.data.createOperators.operators[0]._id
}

function logError(e, input)
{
  console.error(e)
  console.log("e.result:::::::::")
  console.log(e.result)
  if (input != null)
  {
    console.log('Tried to store: ')
    console.log(input)
  }
  // for (let i in e.result.errors)
  // {
  //   console.log(i)
  // }
}

function store(expr)
{
  storeExpr(expr, null)
}

function storeExpr(expr, continuation)
{
  if (expr.name == undefined)
  {
    expr.name = ''
  }

  storeTerm(expr.firstOp, () => {
    if (expr.secondOp != null)
    {
      storeOp(expr.operator, () => {
        console.log('operator._id: ' + String(expr.operator._id))
        storeTerm(expr.secondOp, () => {
          newExpr(expr, continuation)  
        })
      })
    }
    else
    {
      newExpr(expr, continuation)
    }
  })
}

function storeTerm(term, continuation)
{
  if (term.expr != null)
  {
    storeExpr(term.expr, () => {
      newTerm(term, () => {
        if (continuation != null)
        {
          continuation()
        }
      })
    })
  }
  else
  {
    newTerm(term, () => {
      if (continuation != null)
      {
        continuation()
      }
    })
  }
}

function storeOp(op, continuation)
{
  newOperator(op, () => {
    console.log('op._id: ' + String(op._id))
    if (continuation != null)
    {
      continuation()
    }    
  })
}


// Parser code

function parse(inputString)
{
  const parser = {};
  parser.inputString = inputString
  parser.position = 0
  expr(parser)
  console.log('Result: ')
  console.log(util.inspect(parser.currentNode, {depth: null})) 
  return parser
}

function expr(parser)
{
  term(parser)
  if (lookahead(parser) == '\n')
  {
    emit(parser, createExpr(parser.inputString, parser.currentNode, null, null))
  }
  else
  {
    while (lookahead(parser) != '\n' && parser.currentNode.type != 'error')
    {
        if (parser.currentNode.type == 'expr')
        {
          emit(parser, createTermForExpr(parser.inputString.slice(0, parser.position), parser.currentNode))
        }

        const term1 = parser.currentNode
        op(parser)
        if (parser.currentNode.type != 'error')
        {
            const op1 = parser.currentNode
            term(parser)
            if (parser.currentNode.type != 'error')
            {
              emit(parser, createExpr(parser.inputString.slice(0, parser.position), term1, op1, parser.currentNode))
            }
        }
    }

  }
}

function term(parser)
{
  if (Number.isInteger(parseInt(lookahead(parser))))
  {
    emit(parser, createTerm(lookahead(parser)))
    match(parser, lookahead(parser))
  }
  else
  {
    emit(parser, createError(tail(parser), 'unable to match term'))
  }
}

function op(parser)
{
  if (lookahead(parser) == '+' || lookahead(parser) == '-')
  {
    
    emit(parser, createOp(lookahead(parser)))
    match(parser, lookahead(parser))
  }
  else
  {
    emit(parser, createError(tail(parser), 'unable to match operator'))
  }
}

function match(parser, ch)
{
  if (lookahead(parser) == ch)
  {
    parser.position = parser.position + 1
  }
  else
  {
    emit(parser, createError(tail(parser), 'match failed'))
  }
}

function emit(parser, node)
{
  parser.currentNode = node
  //console.log(node)
}

function lookahead(parser)
{
  return parser.position < parser.inputString.length
    ? parser.inputString.charAt(parser.position)
    : '\n'
}

function tail(parser)
{
  return parser.position < parser.inputString.length
    ? parser.inputString.slice(parser.position)
    : ''
}

function createError(input, err)
{
  const node = {}
  node.type = 'error'
  node.input = input
  node.error = err
  return node
}

function createOp(op)
{
  const node = {}
  node.type = 'op'
  node.operator = op
  return node
}

function createTerm(digit)
{
  const node = {}
  node.type = 'term'
  node.input = digit
  if (Number.isInteger(parseInt(digit)))
  {
      node.value = parseInt(digit)
  }
  return node
}

function createTermForExpr(input, expr)
{
  const node = {}
  node.type = 'term'
  node.input = input
  node.expr = expr
  return node
}

function createExpr(input, left, op, right)
{
  const node = {}
  node.type = 'expr'
  node.input = input
  node.operator = op
  node.firstOp = left
  node.secondOp = right
  return node
}

// ende Parser

const expression = process.argv.length > 2 ? process.argv[2] : '0'
const nam = process.argv.length > 3 ? process.argv[3] : 'unnamed'

const parser2 = parse(expression)
if (parser2.currentNode != null && parser2.currentNode.type == 'expr')
{
  parser2.currentNode.name = nam
  console.log('named ' + nam)
  store(parser2.currentNode)
}
else
{
  console.error('failed')
  console.error(parser2.currentNode)
}

