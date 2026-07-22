const path = require('path');
const express = require('express');


function configureExpress(app) {
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '..', 'views'));
    app.use(express.static(path.join(__dirname, '..', 'public')));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
}

module.exports = { configureExpress };