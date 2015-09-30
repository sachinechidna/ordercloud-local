//Global gulp variables
var gulp = require('gulp');
config = require('./gulpConfig');

//require gulpfiles in order...

require('./Gulp/scriptTasks');
require('./Gulp/assetTasks');
require('./Gulp/generalTasks');
require('./Gulp/watchTasks');
require('./Gulp/testTasks');