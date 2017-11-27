const gulp = require('gulp');
const jscs = require('gulp-jscs');
const zip = require('gulp-zip');

gulp.task('default', () => {
    gulp.start('check-cs');
});

gulp.task('check-cs', () => {
    return gulp.src([
        'background/**/*.js',
        'options/**/*.js',
    ], {base: './'})
        .pipe(jscs())
        .pipe(jscs.reporter());
});

gulp.task('build', () => {
    return gulp.src([
        'background/**/*',
        'icons/**/*',
        'LICENSE',
        'manifest.json',
        'options/**/*',
    ], {base: './'})
        .pipe(zip('torrent-to-web.xpi'))
        .pipe(gulp.dest('./'));
});
