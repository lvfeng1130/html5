module.exports = function (grunt) {
    var deployment = {
        local: 0,
        mobile: 1,
        server: 2
    };

    'use strict';
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-replace');

    //TODO figure out how to choose based on the current arg (all/dist/etc.)
    //may need to wait till v1 https://github.com/yeoman/yeoman/wiki/Customization
    var deploying = deployment.server;

    var imgRoot = 'img/';

    var testingTag = "";
    if (deploying === deployment.local) {
        testingTag = '<script type="text/javascript">\n       eval(sessionStorage.jasmineui);\n    </script>';
    }

    //
    // Grunt configuration:
    //
    // https://github.com/cowboy/grunt/blob/master/docs/getting_started.md
    //
    grunt.initConfig({

        // Project configuration
        // ---------------------

        // specify an alternate install location for Bower
        bower: {
            dir: 'app/components'
        },

        // compile .less to .css using less
        less: {
            dist: {
                options: {
                    compile: true
                },
                files: {
                    "app/main.css": "app/styles/main.less",
                    "app/login.css": "app/styles/login.less",
                    "app/requirements.css": "app/styles/requirements.less"
                }
            }
        },

        // generate application cache manifest
        manifest: {
            dest: ''
        },

        // headless testing through PhantomJS
        mocha: {
            all: ['test/**/*.html']
        },

        // default watch configuration
        watch: {
            //coffee has been replaced with a task to insert views into navigator
            replace: {
                files: 'app/**/*.html',
                tasks: 'coffee reload'
            },
            less: {
                files: [
                    'app/styles/**/*.less'
                ],
                tasks: 'less fixCss reload'
            },
            reload: {
                files: [
                    'app/**/*.css',
                    'app/js/**/*.js',
                    'app/img/**/*'
                ],
                tasks: 'coffee reload'
            }
        },

        // default lint configuration, change this to match your setup:
        // https://github.com/cowboy/grunt/blob/master/docs/task_lint.md#lint-built-in-task
        lint: {
            files: [
                'Gruntfile.js',
                'app/scripts/**/*.js',
                'spec/**/*.js'
            ]
        },

        // specifying JSHint options and globals
        // https://github.com/cowboy/grunt/blob/master/docs/task_lint.md#specifying-jshint-options-and-globals
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                boss: true,
                eqnull: true,
                browser: true
            },
            globals: {
                jQuery: true
            }
        },

        // Build configuration
        // -------------------

        // the staging directory used during the process
        staging: 'temp',
        // final build output
        output: 'dist',

        mkdirs: {
            staging: 'app/'
        },

        // Below, all paths are relative to the staging directory, which is a copy
        // of the app/ directory. Any .gitignore, .ignore and .buildignore file
        // that might appear in the app/ tree are used to ignore these values
        // during the copy process.

        // concat css/**/*.css files, inline @import, output a single minified css
        css: {
            'blank.css': ['styles/blank.css']
        },

        // fix css url references
        fixCss: {
            all: {
                src: ['app/main.css', 'app/login.css', 'app/requirements.css']
            }
        },

        // renames JS/CSS to prepend a hash of their contents for easier
        // versioning
        rev: {
            js: 'scripts/**/*.js',
            css: '**/*.css',
            img: 'images/**'
        },

        //wrap the views with headers / footers and concatenate them
        //inspired by http://stackoverflow.com/questions/12722855/using-grunt-concat-how-would-i-automate-the-concatenation-of-the-same-file-to-m
        compileViews: {
            all: {
                header: "<div id='<%= section %>' data-role='view' data-url='<%= section %>' data-init='<%= section %>.initialize' data-show='<%= section %>.show'" +
                    //hide the view initially
                    " style='display: none;' >",
                src: ['app/view/**/*.html'],
                dest: 'app/compiledViews.html'
            }
        },

        //add the views to the index page
        replace: {
            all: {
                options: {
                    variables: {
                        'views': '<%= grunt.file.read("app/compiledViews.html") %>',
                        'kendoTemplates': '<%= grunt.file.read("app/templates/kendoTemplates.html") %>',
                        'imgSrc': imgRoot,
                        'testing': testingTag,
                        'mobileOptimizationTags': '<meta name="HandheldFriendly" content="True">\n\t<meta name="MobileOptimized" content="320">\n\t<meta ' +
                            'name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no"/>\n\t<link ' +
                            'rel="apple-touch-icon-precomposed" sizes="114x114" href="' + imgRoot + 'Icon-96x96.png">\n\t<link rel="apple-touch-icon-precomposed" ' +
                            'sizes="72x72" href="' + imgRoot + 'Icon-72x72.png">\n\t<link rel="apple-touch-icon-precomposed" href="' + imgRoot + 'Icon-36x36.png">\n\t<link ' +
                            'rel="shortcut icon" href="' + imgRoot + 'Icon-36x36.png">\n\t<meta name="apple-mobile-web-app-capable" content="yes">\n\t<meta ' +
                            'name="apple-mobile-web-app-status-bar-style" content="black">\n\t<script>' +
                            '(function(a,b,c){if(c in b&&b[c]){var d,e=a.location,f=/^(a|html)$/i;a.addEventListener("click",function(a){d=a.target;' +
                            'while(!f.test(d.nodeName))d=d.parentNode;"href"in d&&(d.href.indexOf("http")||~d.href.indexOf(e.host))&&(a.preventDefault(),e.href=d.href)},!1)}})(document,window.navigator,"standalone")</script>'
                    }
                },
                files: {
                    'app/index.html': ['app/templates/index.html'],
                    'app/login.html': ['app/templates/login.html'],
                    'app/requirements.html': ['app/templates/requirements.html']
                }
            }
        },

        // usemin handler should point to the file containing
        // the usemin blocks to be parsed
        'usemin-handler': {
            html: 'index.html'
        },

        // update references in HTML/CSS to revved files
        usemin: {
            html: ['index.html'],
            css: ['styles/blank.css']
        },

        // HTML minification
        html: {
            files: ['**/*.html']
        },

        // Optimizes JPGs and PNGs (with jpegtran & optipng)
        img: {
            dist: '<config:rev.img>'
        },

        // rjs configuration. You don't necessarily need to specify the typical
        // `path` configuration, the rjs task will parse these values from your
        // main module, using http://requirejs.org/docs/optimization.html#mainConfigFile
        //
        // name / out / mainConfig file should be used. You can let it blank if
        // you're using usemin-handler to parse rjs config from markup (default
        // setup)
        rjs: {
            // no minification, is done by the min task
            optimize: 'none',
            baseUrl: './js',
            //mainConfigFile: "js/app.js",
            //cannot wrap or else it will hide the uservoice function
            wrap: false,
            name: 'app'
        },

        // While Yeoman handles concat/min when using
        // usemin blocks, you can still use them manually
        concat: {
            dist: ''
        },

        min: {
            dist: ''
        },

        cleanupDist: {
            all: {
                delete: ["dist/js", "dist/styles/**/*.less", "dist/styles/kendo", "dist/templates", "dist/test", "dist/view", "dist/compiledViews.html"]
            }
        }
    });

    grunt.registerMultiTask('compileViews', 'Wrap all the views with a header and footer and concatenate them', function () {
        var data = this.data,
            done = this.async(),
            async = require('async'),
            path = require('path'),
            htmlparser = require('htmlparser'),
            destination = this.data.dest,
            files = grunt.file.expandFiles(this.file.src),
            sep = grunt.utils.linefeed,
            metadataMatcher = /^\^.*\^/;

        //in parallel go through each file
        //and wrap the header and footer
        async.map(files, function (file, callback) {
            var baseFileName = path.basename(file);
            var contents = grunt.file.read(file);

            //run the header and footer templates
            //1) extract the section name, ex. personalSettings.html -> personalSettings
            var section = baseFileName.replace(".html", "");
            var templateData = {section: section};
            var header = grunt.template.process(data.header, templateData);

            var wrapFile = function (header) {
                var view = header + sep +
                    //remove any custom defined metadata from contents
                    contents.replace(metadataMatcher, "") +
                    sep + "</div>" + sep + sep;

                callback(null, view);
            };

            /**
             * Converts a dom element to an attribute object
             * @param element DOM element to get attributes from
             * @param callback (object) Parameter is an object with keys for each attribute name, and corresponding values
             */
            var getAttributeObject = function (element, callback) {
                (new htmlparser.Parser(new htmlparser.DefaultHandler(function (error, dom) {
                    var attributeObject = {};
                    var attributes = dom[0].attribs;
                    for (var k in attributes) {
                        attributeObject[k] = attributes[k];
                    }

                    callback(attributeObject);
                }))).parseComplete(element);
            };

            //check if the user defined any custom attributes for the header
            //ex. ^id="personal" data-title="Personal Settings"^
            //if there is replace all attributes with the custom defined ones
            var customAttributes = contents.match(metadataMatcher);
            if (!customAttributes) {
                wrapFile(header);
            } else {
                //remove the ^
                customAttributes = customAttributes[0].replace(/\^/g, "");

                //parse the initial header object
                getAttributeObject(header, function (headerAttributes) {
                    //parse the custom attributes
                    getAttributeObject("<div " + customAttributes + "></div>", function (customAttributes) {
                        //set/replace existing headers for each custom attributes
                        for (var c in customAttributes) {
                            headerAttributes[c] = customAttributes[c];
                        }

                        var newHeader = "<div ";
                        //setup the header from the object
                        for (var c in headerAttributes) {
                            newHeader += c + "='" + headerAttributes[c] + "' ";
                        }

                        newHeader += ">";

                        wrapFile(newHeader);
                    });
                });
            }
        }, function (err, result) {
            if (err) {
                done(false);
            }

            var compiledView = "";
            result.forEach(function (view) {
                compiledView += view;
                //grunt.log.writeln(view);
            });

            grunt.file.write(destination, compiledView);
            done(true);
        });
    });

    // Alias the `coffee` task to insert views into navigator instead
    grunt.registerTask('coffee', 'compileViews replace');

    // Alias the `test` task to run the `mocha` task instead
    grunt.registerTask('test', 'server:phantom mocha');

    grunt.registerMultiTask('fixCss', 'Fix the css url references', function () {
        var path = require('path'),
            files = grunt.file.expandFiles(this.file.src);

        //grunt.log.writeln(imagesUrl);

        files.forEach(function (f) {
            var contents = grunt.file.read(f);

            //TODO finish this regex and undo kendo/icon.less comment
            //contents.replace(/^@font-face/, "");

            //Kendo
            contents = contents.replace(/textures\//g, imgRoot + "textures/");
            contents = contents.replace(/Default\//g, imgRoot);

            contents = contents.replace(/images\//g, imgRoot);

            grunt.file.write(f, contents);
        });
    });

    grunt.registerMultiTask('cleanupDist', 'Cleanup the built distribution', function () {
        var path = require('path'),
            fs = require('fs'),
            rimraf = require('rimraf'),
            filesDirsToDelete = grunt.file.expand(this.data.delete);

        filesDirsToDelete.forEach(function (p) {
            //delete the file
            rimraf.sync(p);
        });
    });

    // Alias the `compass` task to run the `less` task instead
    grunt.registerTask('compass', 'less fixCss');

    //grunt.registerTask('usemin', 'usemin cleanupDist');

    //for turning off LiveReload. need to do this when testing IE and on mobile
//    grunt.registerHelper('reload:inject', function () {
//        return function inject(req, res, next) {
//            return next();
//        }});
};
