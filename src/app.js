const express = require('express');
const compression = require('compression'); // This is OPTIONAL
const path = require('path'); // Just to work with the directory path
const bodyParser = require('body-parser');
const cors = require('cors');

const appRoutes = require('./routes/app-routes');
const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(compression());
app.use(cors({
    origin: "*"
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(appRoutes);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
    // let err = new Error('')
    // err.status = 404
    // next(err)
    res.render('index');
});

// Error Handler
app.use((err, req, res) => {
    res.status(err.status || 500);
    res.json({
        message: err.message,
        status: err.status
    });
});

module.exports = app;
