/* dendry
 * http://github.com/idmillington/dendry
 *
 * MIT License
 */
/*jshint indent:2 */
(function() {
  "use strict";

  var should = require('should');
  // Disable errors from using the should library.
  /*jshint -W030 */

  var parse = require('../lib/parsers/content');

  describe("content parser", function() {

    it("should begin with paragraph text", function(done) {
      var content = "foo *bar*";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type:'paragraph',
              content: ["foo ", {type:"emphasis-1", content:["bar"]}]
            }
          ]
        });
        done();
      });
    });

    it("should throw away interspersed whitespace", function(done) {
      var content = "*foo* *bar*";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type:'paragraph',
              content: [
                {type:"emphasis-1", content:["foo"]},
                " ",
                {type:"emphasis-1", content:["bar"]}
              ]
            }
          ]
        });
        done();
      });
    });

    it("should allow overlapping elements", function(done) {
      var content = "**foo *bar** sun*";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type:'paragraph',
              content: [
                {type:"emphasis-2", content:[
                  "foo ",
                  {type:"emphasis-1", content:["bar"]}
                ]},
                {type:"emphasis-1", content:[" sun"]}
              ]
            }
          ]
        });
        done();
      });
    });

    it("should reinstate ranges after paragraph break", function(done) {
      var content = "**foo *bar\n\nsun* dock**";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type:'paragraph',
              content: [
                {type:"emphasis-2", content:[
                  "foo ",
                  {type:"emphasis-1", content:["bar"]}
                ]}
              ]
            },
            {
              type:'paragraph',
              content: [
                {type:"emphasis-2", content:[
                  {type:"emphasis-1", content:["sun"]},
                  " dock"
                ]}
              ]
            }
          ]
        });
        done();
      });
    });

    it("should allow unterminated ranges", function(done) {
      var content = "**foo *bar\n\nsun";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type:'paragraph',
              content: [
                {type:"emphasis-2", content:[
                  "foo ",
                  {type:"emphasis-1", content:["bar"]}
                ]}
              ]
            },
            {
              type:'paragraph',
              content: [
                {type:"emphasis-2", content:[
                  {type:"emphasis-1", content:["sun"]}
                ]}
              ]
            }
          ]
        });
        done();
      });
    });

    it("should parse conditionals", function(done) {
      var content = "[? if foo > 1: first ?]"+
        "[? if {! return Q.foo === 1 !}: second ?]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.stateDependencies.length.should.equal(2);
        result.stateDependencies[0].fn(null, {foo:1}).should.be.false;
        result.stateDependencies[1].fn(null, {foo:1}).should.be.true;
        done();
      });
    });

    it("should parse quality inserts", function(done) {
      var content = "[+ foo +][+ {! return 4 !} +]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.paragraphs.should.eql([{
          type:'paragraph',
          content: [
            {type:"insert", insert: 0},
            {type:"insert", insert: 1}
            ]
          }]);
        result.stateDependencies.length.should.equal(2);
        result.stateDependencies[0].fn(null, {foo:2}).should.equal(2);
        result.stateDependencies[1].fn(null, {}).should.equal(4);
        done();
      });
    });

    it("should nest emphasis", function(done) {
      var content = "*first **second level** more first*";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type:'paragraph',
              content: [
                {
                  type:'emphasis-1',
                  content:[
                    "first ",
                    {type:"emphasis-2", content:["second level"]},
                    " more first"
                  ]
                }
              ]
            }
          ]
        });
        done();
      });
    });

    it("should parse hidden content", function(done) {
      var content = "[This is hidden]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type:'paragraph',
              content: [
                {type:'hidden', content:['This is hidden']}
              ]
            }
          ]
        });
        done();
      });
    });

    it("can interpret ?] as end of hidden", function(done) {
      var content = "[Is this hidden?]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type:'paragraph',
              content: [
                {type:'hidden', content:['Is this hidden?']}
              ]
            }
          ]
        });
        done();
      });
    });

    it("can interpret +] as end of hidden", function(done) {
      var content = "[Is this hidden+]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type:'paragraph',
              content: [
                {type:'hidden', content:['Is this hidden+']}
              ]
            }
          ]
        });
        done();
      });
    });

    it("inserts can't have nested ranges", function(done) {
      var content = "[+ Foo **Bar** Sun +]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.true;
        err.message.should.equal(
          "Insert content doesn't look like logic or magic."
        );
        done();
      });
    });

    it("inserts can't be nested", function(done) {
      var content = "[+ Foo [+ Bar +] Sun +]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.true;
        err.message.should.equal(
          "Can't begin a new insert in the middle of an insert."
        );
        done();
      });
    });

    it("hidden blocks can't be nested", function(done) {
      var content = "[Foo [ Bar ] Sun]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.true;
        err.message.should.equal(
          "Can't begin a new hidden block in the middle of a hidden block."
        );
        done();
      });
    });

    it("can't end a non existent hidden block", function(done) {
      var content = "[ Foo Bar ] Sun]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.true;
        err.message.should.equal(
          "Can't end a hidden block that hasn't been started."
        );
        done();
      });
    });

    it("can't have hidden blocks inside inserts", function(done) {
      var content = "[+ Foo [ Bar ] Sun +]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.true;
        err.message.should.equal("Can't nest a hidden block in an insert.");
        done();
      });
    });


    it("interprets ?] as end of hidden, after conditional", function(done) {
      var content = "[? if foo : Conditional, but ?][Is this hidden?] Plain";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.paragraphs.should.eql([
            {
              type:'paragraph',
              content: [
                {type:'conditional', predicate:0,
                 content:['Conditional, but ']},
                {type:'hidden', content:['Is this hidden?']},
                " Plain"
              ]
            }
          ]
        );
        done();
      });
    });

    it("interprets ?] as end of nested conditional", function(done) {
      var content = "[? if foo : Foo [? if bar: Bar ?] End Foo ?]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.paragraphs.should.eql([{
          type:'paragraph',
          content: [{
            type:'conditional',
            predicate:0,
            content:[
              'Foo ',
              {type:'conditional', predicate:1, content:["Bar "]},
              " End Foo"
            ]
          }]
        }]);
        done();
      });
    });

    it("ignores other features inside magic", function(done) {
      var content = "[? if {! var foo = '[*Not hidden*]'; !}: hi ?]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.paragraphs[0].content[0].content.length.should.equal(1);
        result.stateDependencies.length.should.equal(1);
        result.stateDependencies[0].fn.source.should.equal(
          "var foo = '[*Not hidden*]';"
        );
        done();
      });
    });

    it("should merge quotation blocks", function(done) {
      var content = "> one two three\n> four five six";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type: 'quotation',
              content: ['one two three four five six']
            }
          ]
        });
        done();
      });
    });

    it("should merge attribution blocks", function(done) {
      var content = ">> one two three\n>> four five six";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type: 'attribution',
              content: ['one two three four five six']
            }
          ]
        });
        done();
      });
    });

    it("should not merge quotation and attribution", function(done) {
      var content = "> one two three\n>> four five six";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type: 'quotation',
              content: ['one two three']
            },
            {
              type: 'attribution',
              content: ['four five six']
            }
          ]
        });
        done();
      });
    });

    it("should merge headings", function(done) {
      var content = "= one two three\n= four five six";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type: 'heading',
              content: ['one two three four five six']
            }
          ]
        });
        done();
      });
    });

    it("should use hrules as a paragraph break", function(done) {
      var content = "one two three\n---\nfour five six";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type: 'paragraph',
              content: ['one two three']
            },
            {
              type: 'hrule'
            },
            {
              type: 'paragraph',
              content: ['four five six']
            }
          ]
        });
        done();
      });
    });

    it("should break lines on //", function(done) {
      var content = "one two three //\nfour five six";
      parse.compile(content, function(err, result) {
        (!!err).should.be.false;
        result.should.eql({
          paragraphs: [
            {
              type: 'paragraph',
              content: ['one two three ', {type:'line-break'}, 'four five six']
            },
          ]
        });
        done();
      });
    });

    it("should pass on logic compilation error", function(done) {
      var content = "[? if $foo = 1 : go ?]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal(
          "Error: Unrecognized content at position 0."
        );
        done();
      });
    });

    it("should pass on magic compilation error", function(done) {
      var content = "[? if {! * 5 !} : go ?]";
      parse.compile(content, function(err, result) {
        (!!err).should.be.true;
        err.toString().should.equal("SyntaxError: Unexpected token *");
        done();
      });
    });

  });
}());
