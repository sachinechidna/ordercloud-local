var gulp = require('gulp');
var concat = require('gulp-concat');
var mainBowerFiles = require('main-bower-files');
var uglify = require('gulp-uglify');
var filter = require('gulp-filter');
var wrap = require('gulp-wrapper');
var templatecache = require('gulp-angular-templatecache');
var del = require('del');
var ngAnnotate = require('gulp-ng-annotate');


var pkg = require('../package.json');
var banner = config.banner;
var currVersion = pkg.name + "-" + pkg.version;
var appJS = config.app_files.js;



gulp.task('b_m:js_bower', function() {
    return gulp
        .src(mainBowerFiles({filter: ['**/*.js', '!**/bootstrap.js']})
            .concat(config.vendor_files.js).concat(config.vendor_files.exclude_js))
        .pipe(filter('**/*.js'))
        .pipe(gulp.dest(config.build + 'vendor'));
});

gulp.task('b_c:js_bower', function() {
    return del(config.build + 'vendor');
});

gulp.task('b_m:js', function() {
    return gulp
        .src(['./src/**/*.js', '!./src/**/*spec.js'])
        .pipe(ngAnnotate())
        .pipe(wrap({
            header: "(function ( window, angular, undefined ) {\n 'use strict';\n",
            footer: "})( window, window.angular );\n"
        }))
        .pipe(gulp.dest(config.build + 'src'));
});

gulp.task('b_c:js', function() {
    return del([
        config.build + 'src/**/*.js',
        '!' + config.build + 'src/**/templates-app.js'
    ]);
});

gulp.task('b_m:templateCache', function() {
    return gulp
        .src('./src/app/**/*.tpl.html')
        .pipe(templatecache('templates-app.js',{
            standalone: true,
            module: 'templates-app',
            moduleSystem: 'IIFE'}))
        .pipe(gulp.dest(config.build + 'src/'));
});

gulp.task('b_c:templateCache', function() {
    return del(config.build + 'src/templates-app.js');
});

gulp.task('c_m:js', function() {
    return gulp
        .src([config.build + 'vendor/angular.js',
            config.build + 'vendor/ace.js',
            config.build + 'vendor/**/*.js',
            config.build + 'vendor/ui-ace.js',
            config.build + 'src/templates-app.js',
            config.build + 'src/app/app.js',
            config.build + 'src/app/**/*.module.js',
            config.build + 'src/**/*.js',
            '!' + config.build + 'src/**/*.spec.js',
            '!' + config.build + 'vendor/ordercloud-angular-sdk.js'])
        .pipe(concat('app.js'))
        .pipe(uglify())
        .pipe(gulp.dest(config.temp));
});

gulp.task('c_sdk:js', function() {
    return gulp
        .src([config.temp + 'app.js',
            config.build + 'vendor/ordercloud-angular-sdk.js'])
        .pipe(concat('app.js'))
        .pipe(gulp.dest(config.compile + 'assets'))
})

gulp.task('c_c:js', function(){
    return del(config.compile + '**/*.js');
});



//Master Script Build Tasks
gulp.task('build:js', gulp.series('b_c:js', 'b_m:js'));
gulp.task('build:js_bower', gulp.series('b_c:js_bower', 'b_m:js_bower'));
gulp.task('build:templateCache', gulp.series('b_c:templateCache', 'b_m:templateCache'));

//Master Script Compile Tasks
gulp.task('compile:js', gulp.series(gulp.parallel('c_c:js', 'build:js_bower', 'build:js', 'build:templateCache'), 'c_m:js', 'c_sdk:js'));
