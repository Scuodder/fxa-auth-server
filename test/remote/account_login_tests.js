/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var test = require('../ptaptest')
var url = require('url')
var TestServer = require('../test_server')
var crypto = require('crypto')
var Client = require('../client')


var config = require('../../config').getProperties()

TestServer.start(config)
.then(function main(server) {

  test(
    'the email is returned in the error on Incorrect password errors',
    function (t) {
      var email = server.uniqueEmail()
      var password = 'abcdef'
      return Client.createAndVerify(config.publicUrl, email, password, server.mailbox)
        .then(
          function (c) {
            return Client.login(config.publicUrl, email, password + 'x')
          }
        )
        .then(
          t.fail,
          function (err) {
            t.equal(err.code, 400)
            t.equal(err.errno, 103)
            t.equal(err.email, email)
          }
        )
    }
  )

  test(
    'the email is returned in the error on Incorrect email case errors with correct password',
    function (t) {
      var signupEmail = server.uniqueEmail()
      var loginEmail = signupEmail.toUpperCase()
      var password = 'abcdef'
      return Client.createAndVerify(config.publicUrl, signupEmail, password, server.mailbox)
        .then(
          function (c) {
            return Client.login(config.publicUrl, loginEmail, password)
          }
        )
        .then(
          t.fail,
          function (err) {
            t.equal(err.code, 400)
            t.equal(err.errno, 120)
            t.equal(err.email, signupEmail)
          }
        )
    }
  )

  test(
    'Unknown account should not exist',
    function (t) {
      var client = new Client(config.publicUrl)
      client.email = server.uniqueEmail()
      client.authPW = crypto.randomBytes(32)
      return client.login()
        .then(
          function () {
            t.fail('account should not exist')
          },
          function (err) {
            t.equal(err.errno, 102, 'account does not exist')
          }
        )
    }
  )

  test(
    'No keyFetchToken without keys=true',
    function (t) {
      var email = server.uniqueEmail()
      var password = 'abcdef'
      return Client.createAndVerify(config.publicUrl, email, password, server.mailbox)
        .then(
          function (c) {
            return Client.login(config.publicUrl, email, password, { keys: false })
          }
        )
        .then(
          function (c) {
            t.equal(c.keyFetchToken, null, 'should not have keyFetchToken')
          }
        )
    }
  )

  test(
    'sync signin sends an email',
    function (t) {
      var email = server.uniqueEmail()
      var password = 'abcdef'
      return Client.createAndVerify(config.publicUrl, email, password, server.mailbox)
        .then(
          function (c) {
            return Client.login(config.publicUrl, email, password, { service: 'sync', reason: 'signin' })
          }
        )
        .then(
          function (c) {
            return server.mailbox.waitForEmail(email)
          }
        )
        .then(
          function (emailData) {
            var link = emailData.headers['x-link']
            var query = url.parse(link, true).query
            t.ok(query.email, 'email is in the link')
          }
        )
    }
  )

  test(
    'log in to locked account',
    function (t) {
      var email = server.uniqueEmail()
      var password = 'wibble'
      return Client.createAndVerify(config.publicUrl, email, password, server.mailbox)
        .then(
          function (client) {
            return client.lockAccount()
          }
        )
        .then(
          function () {
            return Client.login(config.publicUrl, email, password)
          }
        )
        .then(
          function () {
            t.fail('account should fail to log in')
          },
          function (err) {
            t.equal(err.code, 400)
            t.equal(err.error, 'Bad Request')
            t.equal(err.errno, 121)
            t.equal(err.message, 'Account is locked')
          }
        )
    }
  )

  test(
    'teardown',
    function (t) {
      server.stop()
      t.end()
    }
  )
})