const gulp = require('gulp');
const jscs = require('gulp-jscs');
const zip = require('gulp-zip');

const checkCs = () => {
    return gulp.src([
        'background/**/*.js',
        'options/**/*.js',
        'content/**/*.js',
    ], {base: './'})
        .pipe(jscs())
        .pipe(jscs.reporter())
        .pipe(jscs.reporter('fail'));
};

const build = () => {
    return gulp.src([
        'background/**/*',
        'icons/**/*',
        'LICENSE',
        'manifest.json',
        'options/**/*',
        'content/**/*',
    ], {base: './'})
        .pipe(zip('torrent-to-web.xpi'))
        .pipe(gulp.dest('./'));
};

exports.checkCs = checkCs;
exports.build = build;
exports.default = checkCs;

