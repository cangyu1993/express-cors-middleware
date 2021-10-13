var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
const {createProxyMiddleware} = require('http-proxy-middleware');

var fs = require('fs');

var FileStreamRotator = require('file-stream-rotator');
var logDirectory = path.join(__dirname, 'logs');
//确保存储的路径存在
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
//时间格式化前奏
logger.token("localDate", function getDate(req) {
    let date = new Date();
    return date.toLocaleString();
})

//相应头
logger.token("_header", function getDate(req) {
    return req.res._header
})

// 创建输出流
var errorLogStream = FileStreamRotator.getStream({
    date_format: 'YYYYMMDD', //日期类型
    filename: path.join(logDirectory, '%DATE%-error.log'), //文件名
    frequency: 'daily', //每天的频率
    verbose: false
});
// 创建输出流
var accessLogStream = FileStreamRotator.getStream({
    date_format: 'YYYYMMDD',
    filename: path.join(logDirectory, '%DATE%-access.log'),
    frequency: 'daily',
    verbose: false
});
//写正常访问请求的log日志
app.use(logger(':localDate :http-version :referrer :url :remote-addr :user-agent :method - :req[header] :status - :res[header] :res[content-length] :res[data] :response-time ms :_header', {stream: accessLogStream}));
//写访问出错的log日志
app.use(logger(':localDate :http-version :referrer :url :remote-addr :user-agent :method - :req[header] :status - :res[header] :res[content-length] :res[data] :response-time ms :_header', {
    skip: function (req, res) {
        return res.statusCode < 400
    },
    stream: errorLogStream
}));


//跨域配置
app.use((req, res, next) => {
    res.set({
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Max-Age': 1728000,
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Headers': 'X-Requested-With,Content-Type',
        'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS',
        'Content-Type': 'application/json; charset=utf-8'
    })
    req.method === 'OPTIONS' ? res.status(200).end() : next()
})

//代理-1
app.use('/api', createProxyMiddleware({
        target: 'https://v.juhe.cn/todayOnhistory',
        changeOrigin: true,
        pathRewrite: {
            '^/api': ''
        }
    })
)
//代理-2
app.use('/kpi', createProxyMiddleware({
        target: 'https://v.juhe.cn/todayOnhistory',
        changeOrigin: true,
        pathRewrite: {
            '^/kpi': ''
        }
    })
)

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
