const fs = require('fs')
const http = require('axios')
const mustache = require('mustache')
const aws4 = require('aws4')

const restaurantsApiRoot = process.env.restaurants_api
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

let html

const loadHtml = () => {
  if (!html) {
    console.log('loading index.html...')
    html = fs.readFileSync('static/index.html', 'utf-8')
    console.log('loaded')
  }

  return html
}

module.exports.handler = async (event, context) => {
  const url = new URL(restaurantsApiRoot)
  const opts = {
    host: url.hostname,
    path: url.pathname
  }

  aws4.sign(opts)

  const restaurants = (await http.get(restaurantsApiRoot, {
    headers: opts.headers
  })).data

  const dayOfWeek = days[new Date().getDay()]

  const template = loadHtml()
  const html = mustache.render(template, { dayOfWeek, restaurants })

  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
    body: html
  }

  return response
}