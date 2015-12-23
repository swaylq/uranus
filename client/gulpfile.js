var gulp = require('gulp');
var autoprefixer = require('autoprefixer-core');
var minifyCss = require('gulp-minify-css');
var less = require('gulp-less');
var postcss = require('gulp-postcss');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');

var paths = {
    less: ['./css/*.less']
};

function handleError(err) {
    console.log(err.toString());
    this.emit('end');
}

gulp.task('less', function(done) {
    gulp.src('./css/base.less')
        .pipe(sourcemaps.init())
        .pipe(less().on('error', handleError))
        .pipe(postcss([autoprefixer({
            browsers: ['last 2 version']
        })]))
        .pipe(gulp.dest('./css/'))
        .pipe(minifyCss({
            keepSpecialComments: 0
        }))
        .pipe(rename({
            extname: '.min.css'
        }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./css/'))
        .on('end', done);
});

gulp.task('default', ['less'], function() {
    gulp.watch(paths.less, ['less']);
});